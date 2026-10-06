<?php
/**
 * The mutual exclusion around `shaped_gallery_settings`' read-modify-write.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Admin;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * One writer at a time for the settings option.
 *
 * {@see Settings::sanitize()} merges a partial write over the CURRENTLY STORED
 * option, which is what lets each panel POST only its own keys (§6.9). That merge is
 * a read-modify-write on ONE option row, and `update_option()` gives it no
 * atomicity: two requests in flight both read the pre-write option, and whichever
 * commits last silently reverts the other — with both answering 200, so nothing on
 * screen reports the loss. It is reproducible by flipping two Modules switches in
 * the same tick.
 *
 * The dashboard serialises its own writes (`useSectionToggles`), which removes the
 * common case; this closes the rest — two admin tabs, a module drawer's Save racing
 * a switch, WP-CLI, or any third party calling `update_option()` on this option.
 *
 * A MySQL named lock, not an option or a transient, for three reasons: it BLOCKS
 * (with a timeout) instead of failing, so a save is delayed rather than dropped; the
 * server releases it when the connection ends, so a fatal mid-write cannot strand a
 * lock the way a TTL row can; and it needs no storage, so it cannot itself become a
 * row two requests race over.
 *
 * **It fails OPEN.** No database handle, a driver with no `GET_LOCK()` (SQLite), a
 * server under contention past the timeout — all return `false` and let the write
 * proceed unserialised. A settings save must never be refused because a lock could
 * not be taken; the lock is a narrowing of an existing race, not a precondition.
 */
final class SettingsLock {

	/**
	 * Seconds to wait for a holder to finish before giving up and writing anyway.
	 *
	 * Long enough to outlast any settings write (each is a single option UPDATE),
	 * short enough that a stuck peer cannot hang an admin request.
	 *
	 * @var int
	 */
	private const TIMEOUT = 5;

	/**
	 * Whether THIS request holds the lock.
	 *
	 * Also what makes both calls idempotent: `update_option()` delegates to
	 * `add_option()` when the row does not exist yet, which runs the sanitizer — and
	 * so `acquire()` — a second time inside the first.
	 *
	 * @var bool
	 */
	private static bool $held = false;

	/**
	 * Take the lock, waiting up to {@see TIMEOUT} seconds.
	 *
	 * @return bool Whether the lock is held. False means "write anyway, unserialised".
	 */
	public static function acquire(): bool {
		if ( self::$held ) {
			return true;
		}

		$db = self::db();
		if ( null === $db ) {
			return false;
		}

		$suppress = $db->suppress_errors( true );
		// A named lock has no WordPress API; both values are bound via prepare().
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- a MySQL named lock has no core API and is not cacheable by definition.
		$acquired = $db->get_var( $db->prepare( 'SELECT GET_LOCK(%s, %d)', self::name(), self::TIMEOUT ) );
		$db->suppress_errors( $suppress );

		// 1 = taken, 0 = timed out, NULL = the server has no such function.
		self::$held = ( '1' === (string) $acquired );

		self::forget();

		return self::$held;
	}

	/**
	 * Drop this request's cached copy of the option.
	 *
	 * Without this the lock serialises the writers and changes nothing: the option
	 * is autoloaded, so `get_option()` answers from the `alloptions` blob this
	 * request cached BEFORE it started waiting — the waiter merges over a snapshot
	 * of the value it just waited for someone else to change, and reverts it. The
	 * lock's guarantee is that the next read sees the row, so the invalidation
	 * belongs with the lock rather than at any one call site.
	 *
	 * Both keys, because `autoload` decides which one holds it. Also run when the
	 * lock could not be taken: a fresh read is worth having either way.
	 *
	 * @return void
	 */
	private static function forget(): void {
		wp_cache_delete( Settings::OPTION, 'options' );
		wp_cache_delete( 'alloptions', 'options' );
	}

	/**
	 * Take the lock before core's settings endpoint reads the option.
	 *
	 * `rest_pre_dispatch`, not the sanitizer alone, because `update_option()` reads
	 * the option once itself — before any filter of ours runs — and skips the write
	 * when that copy already equals the sanitized result. Locking only inside
	 * sanitize leaves that comparison reading a pre-wait snapshot, which silently
	 * drops the second of two conflicting writes. Acquiring here puts core's own
	 * read inside the lock too.
	 *
	 * The capability check is not authorisation — the endpoint enforces that — it is
	 * what stops an anonymous POST from being able to hold the lock at all.
	 *
	 * @param mixed            $result  Dispatch short-circuit, passed through untouched.
	 * @param \WP_REST_Server  $server  Server instance.
	 * @param \WP_REST_Request $request The request.
	 * @return mixed
	 */
	public static function lock_rest_write( $result, $server, $request ) {
		if ( ! in_array( $request->get_method(), array( 'POST', 'PUT', 'PATCH' ), true ) ) {
			return $result;
		}

		if ( '/wp/v2/settings' !== $request->get_route() || null === $request->get_param( Settings::OPTION ) ) {
			return $result;
		}

		if ( current_user_can( 'manage_options' ) ) {
			self::acquire();
		}

		return $result;
	}

	/**
	 * Give the lock back, if this request took it.
	 *
	 * Called after the write and again on `shutdown` — the second is not belt and
	 * braces but the only cover for the paths that never reach the first:
	 * `update_option()` returns early when the value is unchanged, and the
	 * first-ever save takes the `add_option()` branch.
	 *
	 * @return void
	 */
	public static function release(): void {
		if ( ! self::$held ) {
			return;
		}

		// Cleared FIRST: a failed release must not leave this request believing it
		// still holds a lock the server may already have dropped with the connection.
		self::$held = false;

		$db = self::db();
		if ( null === $db ) {
			return;
		}

		$suppress = $db->suppress_errors( true );
		// A named lock has no WordPress API; the value is bound via prepare().
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- releasing the named lock taken above.
		$db->get_var( $db->prepare( 'SELECT RELEASE_LOCK(%s)', self::name() ) );
		$db->suppress_errors( $suppress );
	}

	/**
	 * The lock's name.
	 *
	 * Named lock scope is the whole MySQL server, so the name carries what makes
	 * this option row unique — the database and the (per-site, on multisite) table
	 * prefix — hashed to stay inside the 64-character limit. Two installs sharing a
	 * server must not queue behind each other; two requests to the same install
	 * must.
	 *
	 * @return string
	 */
	private static function name(): string {
		$db = self::db();

		return 'shaped_gallery_settings_' . md5( ( $db->dbname ?? '' ) . ( $db->prefix ?? '' ) );
	}

	/**
	 * The database handle, or null when there is nothing usable to lock with.
	 *
	 * Guarded rather than assumed: the CLI verifiers run this class with no `$wpdb`
	 * at all, and a drop-in may not implement the whole interface.
	 *
	 * @return \wpdb|object|null
	 */
	private static function db() {
		global $wpdb;

		if ( ! is_object( $wpdb ) || ! method_exists( $wpdb, 'prepare' ) || ! method_exists( $wpdb, 'get_var' ) || ! method_exists( $wpdb, 'suppress_errors' ) ) {
			return null;
		}

		return $wpdb;
	}
}

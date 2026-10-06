<?php
/**
 * The one answer to "how long does the plugin cache its own gallery data".
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Core;

use ShapedPlugin\ShapedGallery\Admin\Settings;
use ShapedPlugin\ShapedGallery\Includes\Functions;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns the lifetime of the plugin's own cache entries, i.e. Settings → Advanced
 * Controls → **Clear Cache Timeout** (`cacheTimeout`, whole hours).
 *
 * Separate from {@see MediaCache}, which owns cache *keys* and their invalidation:
 * this class answers only "for how long", so there is one place to change when a
 * new cached resource is added and one place a test can pin.
 *
 * Two caches read it, and they are the two whose staleness is bounded by an event
 * rather than by the clock — which is what makes a user-chosen timeout safe:
 *
 * - The Ajax render context (`shaped_gallery_ctx_<hash>`). The key is a hash of the
 *   normalized attributes, so an edited gallery writes a NEW key; the timeout only
 *   decides how long an orphaned one lingers, plus how long an INLINE (unsaved)
 *   paginated gallery can keep paging — a saved gallery falls back to its CPT
 *   ({@see \ShapedPlugin\ShapedGallery\Rest\GalleryController::resolve_render_context()}).
 * - The media-manager's "Filter by date" month buckets, dropped outright on any
 *   attachment create/update/delete ({@see MediaCache}).
 *
 * The media BROWSE cache deliberately keeps its own short TTL. Its keys carry
 * `MediaCache::version()`, so a CRUD bump makes prior entries unreachable rather
 * than stale — lengthening their lifetime would not keep anything usable alive, it
 * would only leave larger unreadable rows sitting in `wp_options` until they expire.
 *
 * One hook of its own: a changed timeout has to take effect on the next page view,
 * not whenever an entry happens to be rewritten — see {@see self::on_settings_save()}.
 */
class GalleryCache {

	/**
	 * Transient-name prefix for a stashed Ajax render context.
	 *
	 * Declared here rather than spelled at both ends: the renderer writes it and the
	 * `/gallery-page` route reads it, and two literals are two chances to drift.
	 *
	 * @var string
	 */
	const CTX_PREFIX = 'shaped_gallery_ctx_';

	/**
	 * The configured cache lifetime, in seconds.
	 *
	 * Reads the raw option through {@see Functions::get_setting()} rather than
	 * `Settings::get()`: this runs on the render path, and the full getter would run
	 * every module's sanitizer to resolve one integer. The value is still coerced
	 * through the SAME bounds the settings screen enforces, so a row written by
	 * WP-CLI or another plugin cannot produce a zero (never expires) or negative
	 * (already expired) TTL.
	 *
	 * @return int Seconds, always >= 1 hour.
	 */
	public static function ttl(): int {
		$hours   = Settings::clamp_timeout( Functions::get_setting( 'cacheTimeout', Settings::TIMEOUT_DEFAULT ) );
		$seconds = $hours * HOUR_IN_SECONDS;

		/**
		 * Filter the lifetime of the plugin's own cache entries.
		 *
		 * @since 1.0.0
		 *
		 * @param int $seconds Lifetime in seconds, from the Clear Cache Timeout setting.
		 * @param int $hours   The same value in whole hours, as stored.
		 */
		$seconds = (int) apply_filters( 'shaped_gallery_cache_ttl', $seconds, $hours );

		return max( HOUR_IN_SECONDS, $seconds );
	}

	/**
	 * Full transient name for an Ajax render context.
	 *
	 * @param string $hash Content hash of the normalized attributes.
	 * @return string
	 */
	public static function ctx_name( string $hash ): string {
		return self::CTX_PREFIX . $hash;
	}

	/**
	 * Hook registration.
	 *
	 * Both halves of a settings write: `update_option_*` is the ordinary save,
	 * `add_option_*` the first-ever one on a site that has never stored the option
	 * (update_option() takes the add branch there and fires neither of the update
	 * hooks).
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'update_option_' . Settings::OPTION, array( $this, 'on_settings_save' ), 10, 2 );
		add_action( 'add_option_' . Settings::OPTION, array( $this, 'on_settings_add' ), 10, 0 );
	}

	/**
	 * A settings save: if the timeout moved, drop the entries still holding the old one.
	 *
	 * Without this the new value is invisible until an entry happens to be rewritten —
	 * and for the month buckets that can be *never*: `Functions::media_months()` returns
	 * early on a cache hit, so the only code that stamps a TTL is never reached again.
	 * A user lowering the timeout and finding that nothing changed is indistinguishable
	 * from a setting that does nothing.
	 *
	 * The Ajax render contexts are deliberately NOT touched. `LayoutRenderer::render()`
	 * re-writes its context on every render of a paginated gallery, so `set_transient()`
	 * refreshes the timeout on the next page view by itself; enumerating them would mean
	 * a `LIKE` scan of `wp_options` to delete rows that are about to be rewritten anyway.
	 *
	 * `delete_transient()` also clears an ORPHANED value row — one whose timeout row was
	 * removed by an external cleanup tool or a partial import, which WordPress reads as
	 * "no expiry" and therefore caches permanently. Saving the panel is the recovery
	 * path for that state.
	 *
	 * @param mixed $old_value Previous option value.
	 * @param mixed $value     New option value.
	 * @return void
	 */
	public function on_settings_save( $old_value, $value ): void {
		$before = Settings::clamp_timeout( is_array( $old_value ) ? ( $old_value['cacheTimeout'] ?? Settings::TIMEOUT_DEFAULT ) : Settings::TIMEOUT_DEFAULT );
		$after  = Settings::clamp_timeout( is_array( $value ) ? ( $value['cacheTimeout'] ?? Settings::TIMEOUT_DEFAULT ) : Settings::TIMEOUT_DEFAULT );

		if ( $before === $after ) {
			// Every other panel on the screen writes this option too. Comparing the one
			// value that matters is what keeps a module drawer's save from dropping a
			// cache it has nothing to do with.
			return;
		}

		$this->flush_timeout_scoped();
	}

	/**
	 * The first-ever settings write. No previous value exists to compare, so the
	 * entries a page load may already have cached under the shipped default are
	 * dropped unconditionally — a one-time event, not a per-save cost.
	 *
	 * @return void
	 */
	public function on_settings_add(): void {
		$this->flush_timeout_scoped();
	}

	/**
	 * Drop the cache entries whose lifetime came from the timeout and which nothing
	 * else rewrites on use.
	 *
	 * One entry today, spelled literally rather than behind a list: a second one
	 * belongs here as another line, not as an abstraction over a single case.
	 *
	 * @return void
	 */
	private function flush_timeout_scoped(): void {
		delete_transient( MediaCache::MONTHS_TRANSIENT );
	}

	/**
	 * The transient prefixes Clear Gallery Cache is allowed to delete.
	 *
	 * **An allow-list, never `LIKE '_transient_shaped_gallery_%'`, and that is a security
	 * decision rather than tidiness.** The plugin keeps two other transient families
	 * under the same prefix, and one of them is
	 * {@see \ShapedPlugin\ShapedGallery\Frontend\GalleryPassword}'s `shaped_gallery_pwd_try_`
	 * brute-force counters: a blanket wipe would hand an attacker who is mid-lockout a
	 * fresh set of attempts, from a button whose copy promises only to clear cached
	 * gallery data. `shaped_gallery_pwd_` unlock tokens are excluded by the same prefix.
	 *
	 * `shaped_gallery_update_` is left alone on its own merits: it is the update
	 * payload, where clearing buys a needless round-trip to the store.
	 *
	 * @return array<int,string>
	 */
	private static function flushable_prefixes(): array {
		return array(
			// Ajax render contexts. The one family that MUST be enumerated: its key is
			// a content hash, not a version, so nothing makes an old entry unreachable.
			self::CTX_PREFIX,
			// Browse pages and the date-filter month buckets — `shaped_gallery_media_…`
			// and `shaped_gallery_media_months` alike.
			MediaCache::GROUP . '_',
			/*
			 * The Ready Patterns manifest and its negative-cache twin. Both are
			 * derived from a remote catalogue and refetch on demand, so they are
			 * cache in the strict sense this list means — and unlike the reference
			 * implementation's JSON file in `wp-content/uploads`, a transient is
			 * something this button can actually reach.
			 */
			'shaped_gallery_patterns_',
		);
	}

	/**
	 * Clear Gallery Cache: delete the plugin's own cached gallery data, in one batch.
	 *
	 * Two halves, and the order is the design:
	 *
	 * 1. **Bump the media version first.** That is what actually invalidates the browse
	 *    cache — its keys embed {@see MediaCache::version()}, so a bump makes every
	 *    prior entry unreachable in the object cache AND the options table at once,
	 *    however many rows are still sitting there and whether or not this request
	 *    manages to delete them all. Deleting the rows is space reclamation on top of
	 *    an invalidation that has already happened.
	 * 2. **Then delete rows, bounded.** A site with a day of browsing behind it can hold
	 *    thousands, and a single-shot delete is a gateway timeout AND a half-emptied
	 *    cache with no record of where it stopped — so this stops at `$max_rows` and
	 *    reports `remaining`, and the panel calls
	 *    again until it is false.
	 *
	 * `delete_transient()` per row rather than one multi-table `DELETE`: it is the API
	 * that knows about both storage layers, so the same call works on a site with a
	 * persistent object cache, where the rows this query looks for do not exist at all.
	 * That is also why an object-cache site is not a failure here — step 1 has already
	 * invalidated everything, and `flush_group()` clears the group outright where the
	 * drop-in supports it.
	 *
	 * Safe to press at any time BECAUSE every entry is derived: a render re-stashes its
	 * context, `media_months()` re-runs its query, the browse cache refills on the next
	 * fetch. Nothing here is a source of truth.
	 *
	 * @param int $max_rows Most transient rows to delete in this call.
	 * @return array{deleted:int,remaining:bool} Rows deleted, and whether more are left.
	 */
	public static function flush( int $max_rows = 300 ): array {
		global $wpdb;

		$max_rows = max( 1, $max_rows );

		// Step 1 — the invalidation. Unconditional, and cheap: one option write.
		MediaCache::bump();

		if ( function_exists( 'wp_cache_supports' ) && wp_cache_supports( 'flush_group' ) ) {
			wp_cache_flush_group( MediaCache::GROUP );
		}

		/*
		 * The month buckets by name, not by the sweep below — even though the sweep's
		 * `shaped_gallery_media_` prefix would match them. They are the one cleared entry
		 * that is NOT version-keyed, so on a site with a persistent object cache, where
		 * the sweep's SELECT finds no rows at all because transients never reach the
		 * options table, this call is the only thing that clears them. It is counted as
		 * invalidation rather than as a reclaimed row, which is why it does not appear
		 * in `deleted`.
		 */
		delete_transient( MediaCache::MONTHS_TRANSIENT );

		/**
		 * Fires after the plugin's caches have been invalidated and before any row is
		 * reclaimed, so an add-on can drop a derived cache of its own in the same click.
		 *
		 * @since 1.0.0
		 */
		do_action( 'shaped_gallery_flush_cache' );

		// Step 2 — reclaim the rows. `$prefix` values are class constants, never input,
		// and each is still bound through prepare() as a LIKE value.
		$deleted   = 0;
		$remaining = false;

		foreach ( self::flushable_prefixes() as $prefix ) {
			$budget = $max_rows - $deleted;

			/*
			 * `LIMIT $budget + 1` — one row over the budget, so a full page reports "more
			 * remains" without a second COUNT query.
			 *
			 * The +1 is also what makes an exhausted budget correct rather than merely
			 * safe: with `$budget` at 0 this becomes a `LIMIT 1` existence probe that
			 * deletes nothing, so a batch which happens to empty the cache exactly does
			 * not claim work it does not have and send the panel round again. Answering
			 * "probably" there was the first version's bug.
			 */
			$names = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s LIMIT %d",
					$wpdb->esc_like( '_transient_' . $prefix ) . '%',
					$budget + 1
				)
			);

			if ( count( $names ) > $budget ) {
				array_pop( $names );
				$remaining = true;
			}

			foreach ( $names as $name ) {
				// Back to the transient's own name: delete_transient() owns both layers.
				delete_transient( substr( (string) $name, strlen( '_transient_' ) ) );
				++$deleted;
			}
		}

		return array(
			'deleted'   => $deleted,
			'remaining' => $remaining,
		);
	}
}

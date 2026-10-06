<?php
/**
 * The data-update runner: versioned, ordered, checkpointed, and run once.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Core;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Runs the one-shot data migrations a release needs, in version order, exactly once.
 *
 * ## What belongs here, and what does not
 *
 * {@see Install} is the RECORD: self-healing, idempotent, correct on every request
 * including a logged-out page view, and cheap enough to run on all of them. This
 * class is the opposite — work that must happen ONCE, may be expensive, is keyed to
 * the release that introduced it, and is never repeated afterwards. Rewriting stored
 * block attributes across every gallery belongs here; deciding whether a site came
 * from Easy Lightbox does not, because the front end needs that answer before this
 * runner has ever executed.
 *
 * The distinction is worth holding onto: anything put here that the front end also
 * needs will be silently wrong for the window between an update landing and the next
 * admin page load.
 *
 * ## Why a registry rather than a chain of version checks
 *
 * Adding the second migration is the moment this shape earns itself. A `version_compare`
 * ladder grows a branch per release and nothing tells you the order they run in; a map
 * of `version => step` is the order, and a new release is one entry plus one method.
 *
 * ## Checkpointing
 *
 * {@see self::OPTION_DB_VERSION} advances after EACH step, not once at the end. A
 * fatal in step three leaves the row at step two, so the next request resumes there
 * instead of re-running the two that already succeeded — which, for a step that
 * rewrites post meta, is the difference between a resumed migration and a
 * double-applied one.
 *
 * ## Why this is not the ad-hoc version counter §23 warns about
 *
 * §23 rules out inventing another `*_version` row beside
 * `shaped_gallery_current_version`. This one is not a second answer to the same
 * question: that row tracks the CODE running, and is moved by {@see Install} on every
 * admin load, including backwards on a rollback. This row tracks how far the DATA has
 * been migrated, and only ever moves forward. Sharing one row between them would mean
 * `Install`'s sync racing ahead of the runner and skipping every pending step.
 */
final class Updates {

	/**
	 * How far the stored data has been migrated.
	 *
	 * Not autoloaded: read on admin requests only, exactly like the §23 rows.
	 *
	 * @var string
	 */
	const OPTION_DB_VERSION = 'shaped_gallery_db_version';

	/**
	 * Option held for the duration of a run, so two requests cannot migrate at once.
	 *
	 * @var string
	 */
	const OPTION_LOCK = 'shaped_gallery_updating';

	/**
	 * Seconds after which a held lock is assumed abandoned and may be taken.
	 *
	 * A run that fatals leaves its lock behind, and without an expiry that site would
	 * never migrate again — the failure mode is silence, so it has to self-heal.
	 * Long enough that a slow migration is not interrupted by a second request, short
	 * enough that a crashed one is retried the same day.
	 *
	 * @var int
	 */
	const LOCK_TIMEOUT = 900;

	/**
	 * Every data migration, in the order they must run.
	 *
	 * Key is the release that introduced the step; value is a method on this class.
	 * A step runs when the stored data version is older than its key. Add new entries
	 * at the END, and never renumber or remove one — a site can arrive from any
	 * version, so the map is a history, not a to-do list.
	 *
	 * @var array<string,string>
	 */
	private const STEPS = array(
		'1.2.0' => 'step_1_2_0_adopt_easy_lightbox_record',
	);

	/**
	 * Hook registration.
	 *
	 * `admin_init` at priority 5, ahead of {@see Install}'s own pass at the default
	 * 10, and that ordering is load-bearing rather than tidy: the 1.2.0 step below
	 * snapshots a value that `Install::sync_legacy_mirror()` is about to overwrite.
	 *
	 * `accepted_args` of 0 for the same reason `Install` uses it — `do_action()`
	 * hands a callback an empty string, which against this file's `strict_types=1`
	 * is a TypeError rather than a silent coercion.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_init', array( __CLASS__, 'maybe_run' ), 5, 0 );
	}

	/**
	 * How far this site's data has been migrated.
	 *
	 * @return string Empty string on a site that has never recorded one.
	 */
	public static function db_version(): string {
		return (string) get_option( self::OPTION_DB_VERSION, '' );
	}

	/**
	 * The steps this site still owes, in order.
	 *
	 * @return array<string,string> Version => method name.
	 */
	public static function pending(): array {
		$done = self::db_version();

		if ( '' === $done ) {
			return self::STEPS;
		}

		$pending = array();

		foreach ( self::STEPS as $version => $method ) {
			if ( version_compare( $done, $version, '<' ) ) {
				$pending[ $version ] = $method;
			}
		}

		return $pending;
	}

	/**
	 * Declare this site already up to date without running anything.
	 *
	 * For an install that starts on the current release: it has no stored data to
	 * migrate, so every historical step is not merely unnecessary but wrong — they
	 * describe transformations of shapes this site has never held.
	 *
	 * @return void
	 */
	public static function baseline(): void {
		update_option( self::OPTION_DB_VERSION, SHAPED_GALLERY_VERSION, false );
	}

	/**
	 * Run whatever is owed, if anything, and if nobody else already is.
	 *
	 * @param bool $from_activation Whether the activation hook is what called us.
	 * @return void
	 */
	public static function maybe_run( bool $from_activation = false ): void {
		/*
		 * A site with no data version is either brand new or arriving from Easy
		 * Lightbox, and the two want opposite treatment: one needs every step, the
		 * other needs none of them.
		 */
		if ( '' === self::db_version() && ! Install::is_migrated( $from_activation ) ) {
			self::baseline();

			return;
		}

		if ( array() === self::pending() ) {
			return;
		}

		if ( ! self::acquire_lock() ) {
			return;
		}

		try {
			self::run();
		} finally {
			self::release_lock();
		}
	}

	/**
	 * Apply each owed step, recording progress as it goes.
	 *
	 * @return void
	 */
	private static function run(): void {
		foreach ( self::pending() as $version => $method ) {
			self::$method();

			// Checkpoint. A fatal in the NEXT step must not cost us this one.
			update_option( self::OPTION_DB_VERSION, $version, false );
		}

		update_option( self::OPTION_DB_VERSION, SHAPED_GALLERY_VERSION, false );
	}

	/**
	 * Take the run lock, or report that someone else holds it.
	 *
	 * `add_option()` is the atomic primitive here: the options table's unique index
	 * on `option_name` decides the winner, where a read-then-write in PHP would let
	 * two requests through and apply every step twice.
	 *
	 * @return bool
	 */
	private static function acquire_lock(): bool {
		if ( add_option( self::OPTION_LOCK, (string) time(), '', false ) ) {
			return true;
		}

		$held = (int) get_option( self::OPTION_LOCK, 0 );

		if ( $held > 0 && ( time() - $held ) < self::LOCK_TIMEOUT ) {
			return false;
		}

		// Abandoned by a run that died. Take it rather than stall forever.
		update_option( self::OPTION_LOCK, (string) time(), false );

		return true;
	}

	/**
	 * Release the run lock.
	 *
	 * @return void
	 */
	private static function release_lock(): void {
		delete_option( self::OPTION_LOCK );
	}

	/**
	 * 1.2.0 — adopt the install history Easy Lightbox left behind.
	 *
	 * Two values, both one-shot, both impossible to recover once missed.
	 *
	 * The snapshot has to happen before {@see Install::sync_legacy_mirror()} ever
	 * runs, because that mirror keeps `easy_lightbox_current_version` tracking the
	 * RUNNING version — so the first sync replaces 1.1.4 with this release and the
	 * record of where the lightbox era ended is gone.
	 *
	 * The first-activation pair is inherited rather than invented for the same
	 * reason it is written with `add_option()` in the first place: a site that
	 * installed the lightbox in 2019 must not date itself to the day it took this
	 * update, and after the first write it never gets another chance to say so.
	 *
	 * @return void
	 */
	private static function step_1_2_0_adopt_easy_lightbox_record(): void {
		if ( ! Install::is_migrated() ) {
			return;
		}

		Install::adopt_easy_lightbox_record();
	}
}

<?php
/**
 * Install record: the version this site started on, and the one it is running.
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
 * Records what version of this plugin a site first activated, when, and what version
 * is running now. Adapted from Reno Cart's `RenoCart\Install`, which owns the same
 * three rows under the same semantics — a site running both plugins should answer the
 * same questions the same way, so the shapes are kept deliberately identical rather
 * than each product inventing its own.
 *
 * ## Why any of this is stored
 *
 * All three values are write-once-or-rarely and cost nothing to keep, but they cannot
 * be reconstructed after the fact. The first-activation pair is what lets a later
 * release apply a changed default, or a changed policy, only to installs that STARTED
 * after it — the alternative is changing behaviour under sites that never asked for
 * it, because by then "was this site new in 1.4.0?" is unanswerable. The current
 * version is what a future upgrade routine compares against to know what it has to
 * do; {@see Capabilities::VERSION} is the same idea scoped to one subsystem.
 *
 * Nothing here is sent anywhere. These are local rows read by this plugin (and by a
 * support request that asks the site owner to look), not telemetry.
 *
 * ## Why the first-activation values are never rewritten
 *
 * Reactivating a plugin — to debug a conflict, to swap hosts, as half of a manual
 * update — must not make a two-year-old install look brand new. Both values are
 * written with `add_option()`, which refuses to overwrite an existing row, so
 * "record if absent" is the storage layer's guarantee and not a race between two
 * concurrent requests that both read `false`.
 *
 * ## Free / Pro
 *
 * These rows belong to whichever build wrote them. Per §1b this build returns before
 * its own constants the moment Pro is active, so on a Pro site nothing here runs and
 * both values freeze at the last free version — which is the honest answer, since
 * that IS where this build's history ended. Pro tracks its own install separately;
 * the sibling free/pro pairs in this catalogue (Easy Accordion, Location Weather) do
 * exactly the same, and neither build reads the other's rows.
 */
final class Install {

	/**
	 * Option storing the plugin version that was active the very first time this
	 * plugin was ever activated on this site. Set once, never touched again — see
	 * {@see self::maybe_record_first_activation()}.
	 *
	 * @var string
	 */
	const OPTION_FIRST_VERSION = 'shaped_gallery_first_activated_version';

	/**
	 * Option storing the date/time of that same first-ever activation.
	 *
	 * Site-local `mysql` format, matching Reno Cart. A GMT timestamp would compare
	 * more cleanly across sites that later change timezone, but the two plugins
	 * storing one field in two shapes is the worse trade — anything reading this
	 * has to know the site's timezone either way.
	 *
	 * @var string
	 */
	const OPTION_FIRST_DATE = 'shaped_gallery_first_activated_date';

	/**
	 * Option storing whatever version of the plugin last ran on this site. Kept in
	 * sync on every admin load, not just activation, since an update applied by
	 * WordPress's own updater never fires the activation hook.
	 *
	 * @var string
	 */
	const OPTION_CURRENT_VERSION = 'shaped_gallery_current_version';

	/**
	 * Option recording where this install came from: the Easy Lightbox listing this
	 * plugin ships from (§24), or a genuinely new installation.
	 *
	 * Write-once and never compared as a version, so it is not the "another ad-hoc
	 * `*_version` counter" §23 warns against — it answers one question, permanently:
	 * did this site run Easy Lightbox before ShapedGallery 1.2.0 arrived?
	 *
	 * AUTOLOADED, unlike the three rows above, and the exception is deliberate. Those
	 * are read on admin requests only; this one decides whether the legacy lightbox
	 * runs, which is a front-end decision taken on every page view. Left
	 * non-autoloaded it would be an extra query per visitor on a site with no
	 * persistent object cache.
	 *
	 * @var string
	 */
	const OPTION_INSTALL_ORIGIN = 'shaped_gallery_install_origin';

	/**
	 * {@see self::OPTION_INSTALL_ORIGIN} value for a site that ran Easy Lightbox.
	 *
	 * @var string
	 */
	const ORIGIN_EASY_LIGHTBOX = 'easy-lightbox-wp';

	/**
	 * {@see self::OPTION_INSTALL_ORIGIN} value for a site that started here.
	 *
	 * @var string
	 */
	const ORIGIN_NEW = 'new';

	/**
	 * Option preserving the last Easy Lightbox version this site ran, captured at
	 * the moment of migration and never rewritten.
	 *
	 * This row exists because {@see self::sync_legacy_mirror()} keeps
	 * `easy_lightbox_current_version` tracking the RUNNING version — so the first
	 * sync after an update overwrites 1.1.4 with 1.2.0 and the record of where the
	 * lightbox era actually ended is gone. Snapshotting it into a key this plugin
	 * owns is what makes "store the previous record" survive its own mirror.
	 *
	 * Empty string on a site whose Easy Lightbox predates 1.1.4, which recorded
	 * nothing to snapshot — the version is genuinely unknown, and an invented one
	 * would be worse than an absent one.
	 *
	 * @var string
	 */
	const OPTION_MIGRATED_FROM_VERSION = 'shaped_gallery_migrated_from_version';

	/**
	 * Easy Lightbox's own install record.
	 *
	 * Easy Lightbox 1.1.4 began writing these; 1.1.3 and earlier wrote nothing, which
	 * is why their absence cannot be read as "not a migrated site" and
	 * {@see self::detect_origin()} needs a third test.
	 *
	 * The first-activation pair is read and never written: it is history, and §23's
	 * rule against inventing history applies to another plugin's rows at least as
	 * much as to our own. The current-version row is the exception and is kept in
	 * step by {@see self::sync_legacy_mirror()}.
	 *
	 * @var string
	 */
	const LEGACY_FIRST_VERSION = 'easy_lightbox_first_activated_version';

	/**
	 * Easy Lightbox's first-activation date. Read only.
	 *
	 * @var string
	 */
	const LEGACY_FIRST_DATE = 'easy_lightbox_first_activated_date';

	/**
	 * The Easy Lightbox version last recorded running here. Read only.
	 *
	 * @var string
	 */
	const LEGACY_CURRENT_VERSION = 'easy_lightbox_current_version';

	/**
	 * Network option marking a multisite network whose FIRST activation was this
	 * plugin rather than Easy Lightbox.
	 *
	 * Exists for one false positive. A network activation fires no per-site
	 * activation hook, so a brand-new subsite looks exactly like a site that was
	 * running the plugin before this code existed — which is the third test in
	 * {@see self::detect_origin()}. This row is what tells the two apart.
	 *
	 * @var string
	 */
	const SITE_OPTION_NETWORK_ORIGIN = 'shaped_gallery_network_origin';

	/**
	 * Hook registration.
	 *
	 * `admin_init` rather than `init`, and rather than an `is_admin()` branch at boot:
	 * nothing on the front end reads any of these rows, so a visitor's page view has
	 * no reason to check them (§10). `is_admin()` would also be true for
	 * `admin-ajax.php`, i.e. for front-end Ajax from logged-out visitors.
	 *
	 * This is what covers an in-place update and a network activation — neither of
	 * which reaches the activation hook per site — in the same self-healing spirit as
	 * {@see Capabilities::maybe_grant()}.
	 *
	 * @return void
	 */
	public function hooks(): void {
		/*
		 * `accepted_args` of 0, and it is not optional. `do_action()` substitutes an
		 * empty STRING when a hook fires with no arguments, and a callback registered
		 * the default way receives it — which, against this file's `strict_types=1` and
		 * `record()`'s `bool` parameter, is a TypeError on every admin request rather
		 * than the silent coercion it would be elsewhere in WordPress.
		 */
		add_action( 'admin_init', array( __CLASS__, 'record' ), 10, 0 );
	}

	/**
	 * Record the first-activation pair if this is the first time, and bring the
	 * current-version row up to date.
	 *
	 * Called from the activation hook and from every admin load, so it has to be
	 * cheap and idempotent on the overwhelmingly common path where nothing has
	 * changed: two `get_option()` reads that short-circuit, plus one string
	 * comparison, and no write at all.
	 *
	 * @return void
	 */
	public static function record( bool $from_activation = false, bool $network_wide = false ): void {
		self::maybe_record_network_origin( $from_activation, $network_wide );
		self::maybe_record_install_origin( $from_activation );
		self::maybe_record_first_activation();
		self::sync_current_version();
		self::sync_legacy_mirror();
	}

	/**
	 * Take over the install history Easy Lightbox left behind.
	 *
	 * The one-shot half of the migration, so it is driven by {@see Updates} rather
	 * than by {@see self::record()} — and it must land BEFORE
	 * {@see self::sync_legacy_mirror()} runs for the first time, which is why the
	 * runner is hooked ahead of this class.
	 *
	 * Idempotent regardless: every write is an `add_option()`, so a second call after
	 * a resumed or re-entered run changes nothing.
	 *
	 * @return void
	 */
	public static function adopt_easy_lightbox_record(): void {
		if ( ! self::is_migrated() ) {
			return;
		}

		/*
		 * Snapshot first. `sync_legacy_mirror()` keeps
		 * `easy_lightbox_current_version` tracking the RUNNING version, so the first
		 * sync replaces 1.1.4 with this release — this row is the only thing that
		 * remembers where the lightbox era actually ended.
		 *
		 * An empty value on a site whose Easy Lightbox predates 1.1.4 is the honest
		 * answer: that version recorded nothing, so it is genuinely unknown.
		 */
		if ( false === get_option( self::OPTION_MIGRATED_FROM_VERSION, false ) ) {
			add_option( self::OPTION_MIGRATED_FROM_VERSION, (string) get_option( self::LEGACY_CURRENT_VERSION, '' ), '', false );
		}

		/*
		 * Inherit the dates rather than invent them. Both rows refuse to be
		 * overwritten once written, so a site that installed the lightbox in 2019
		 * gets exactly one chance not to date itself to the day it took this update.
		 */
		list( $first_version, $first_date ) = self::legacy_first_activation();

		if ( '' !== $first_version && false === get_option( self::OPTION_FIRST_VERSION, false ) ) {
			add_option( self::OPTION_FIRST_VERSION, $first_version, '', false );
		}

		if ( '' !== $first_date && false === get_option( self::OPTION_FIRST_DATE, false ) ) {
			add_option( self::OPTION_FIRST_DATE, $first_date, '', false );
		}
	}

	/**
	 * Easy Lightbox's own first-activation pair, if it recorded one.
	 *
	 * Read by both {@see self::adopt_easy_lightbox_record()} and
	 * {@see self::maybe_record_first_activation()}, which is why it is a helper and
	 * not two copies of the same two `get_option()` calls (§18).
	 *
	 * @return array{0:string,1:string} Version and date, either possibly empty.
	 */
	private static function legacy_first_activation(): array {
		if ( ! self::is_migrated() ) {
			return array( '', '' );
		}

		return array(
			(string) get_option( self::LEGACY_FIRST_VERSION, '' ),
			(string) get_option( self::LEGACY_FIRST_DATE, '' ),
		);
	}

	/**
	 * Keep Easy Lightbox's current-version row tracking the code that is running.
	 *
	 * On the WordPress.org listing this plugin IS Easy Lightbox — the slug never
	 * changed, only the name and the contents (§24) — so a site that has been
	 * carrying `easy_lightbox_current_version` since before the rebrand is not
	 * carrying a stale foreign row; it is carrying this listing's version. Anything
	 * already reading it (support tooling, a site owner's snippet, an external
	 * integration) keeps seeing the truth rather than silently freezing at 1.1.4.
	 *
	 * Only on migrated installs. A site that started here would otherwise gain rows
	 * named after a plugin it never ran — misleading on its own terms, and it would
	 * destroy the evidence {@see self::detect_origin()}'s second test depends on for
	 * every site classified after it.
	 *
	 * The first-activation pair is deliberately NOT mirrored: those rows are
	 * write-once history, and a site whose Easy Lightbox predates 1.1.4 never
	 * recorded them. Filling them in now would be inventing a past, which is the one
	 * thing §23 exists to prevent.
	 *
	 * @return void
	 */
	private static function sync_legacy_mirror(): void {
		if ( ! self::is_migrated() ) {
			return;
		}

		if ( SHAPED_GALLERY_VERSION !== get_option( self::LEGACY_CURRENT_VERSION ) ) {
			update_option( self::LEGACY_CURRENT_VERSION, SHAPED_GALLERY_VERSION, false );
		}
	}

	/**
	 * The Easy Lightbox version this site ran before migrating.
	 *
	 * Reads the snapshot rather than the live legacy row, which now tracks the
	 * running version.
	 *
	 * @return string Empty string on a site that never ran Easy Lightbox, and on one
	 *                whose Easy Lightbox predates its own install record.
	 */
	public static function migrated_from_version(): string {
		return (string) get_option( self::OPTION_MIGRATED_FROM_VERSION, '' );
	}

	/**
	 * On a network activation, remember that the NETWORK started here.
	 *
	 * Only meaningful on multisite, and only from the activation hook — the one
	 * moment a genuine first activation is observable. Written before any per-site
	 * detection runs, because it is what stops
	 * {@see self::was_running_before_this_code()} from reading every fresh subsite as
	 * an upgraded one.
	 *
	 * Skipped when Easy Lightbox evidence exists anywhere, since a network that was
	 * already running it is exactly the case this row must not claim.
	 *
	 * @param bool $from_activation Whether the activation hook is what called us.
	 * @param bool $network_wide    Whether that activation was network-wide.
	 * @return void
	 */
	private static function maybe_record_network_origin( bool $from_activation, bool $network_wide ): void {
		if ( ! $from_activation || ! $network_wide || ! is_multisite() ) {
			return;
		}

		if ( self::has_legacy_evidence() ) {
			return;
		}

		add_site_option( self::SITE_OPTION_NETWORK_ORIGIN, SHAPED_GALLERY_VERSION );
	}

	/**
	 * Decide, once and permanently, where this install came from.
	 *
	 * `add_option()` rather than `update_option()`: the refusal to overwrite is the
	 * storage layer's guarantee that a site cannot be re-classified later by a
	 * deactivation, a host move, or a second call racing the first.
	 *
	 * @param bool $from_activation Whether the activation hook is what called us.
	 * @return void
	 */
	private static function maybe_record_install_origin( bool $from_activation ): void {
		if ( false !== get_option( self::OPTION_INSTALL_ORIGIN, false ) ) {
			return;
		}

		add_option( self::OPTION_INSTALL_ORIGIN, self::detect_origin( $from_activation ), '', true );
	}

	/**
	 * Which origin this site has, judged from evidence rather than assumption.
	 *
	 * Two tests, any one of which is sufficient, because no single one covers the
	 * whole installed base:
	 *
	 * 1. Easy Lightbox 1.1.4 wrote an install record. Those rows are untouched by
	 *    this plugin, so finding one is proof, with no false positives — nothing else
	 *    writes a row by that name.
	 * 2. Everything older wrote nothing at all, so there is no row to find. What is
	 *    still true of those sites is that the plugin was ALREADY ACTIVE when this
	 *    code first ran: a genuine first activation reaches the activation hook
	 *    before the plugin can serve a page, so an `admin_init` pass that finds no
	 *    first-activation row is looking at an in-place update.
	 *
	 * Ties are broken towards "migrated", because the costs are not symmetrical: a
	 * migrated site misread as new loses the lightbox its visitors can see, while a
	 * new site misread as migrated gets a compatibility layer it will never trigger.
	 *
	 * @param bool $from_activation Whether the activation hook is what called us.
	 * @return string One of the `ORIGIN_*` constants.
	 */
	private static function detect_origin( bool $from_activation ): string {
		if ( self::has_legacy_evidence() ) {
			return self::ORIGIN_EASY_LIGHTBOX;
		}

		if ( ! $from_activation && self::was_running_before_this_code() ) {
			return self::ORIGIN_EASY_LIGHTBOX;
		}

		return self::ORIGIN_NEW;
	}

	/**
	 * Whether Easy Lightbox left its own install record on this site.
	 *
	 * @return bool
	 */
	private static function has_legacy_evidence(): bool {
		return '' !== (string) get_option( self::LEGACY_CURRENT_VERSION, '' )
			|| '' !== (string) get_option( self::LEGACY_FIRST_VERSION, '' )
			|| '' !== (string) get_option( self::LEGACY_FIRST_DATE, '' );
	}

	/**
	 * Whether this plugin was already active before the code that records installs
	 * ever ran here.
	 *
	 * True means an in-place update: WordPress replaced the files under a plugin that
	 * was already switched on, so no activation hook fired and there is no
	 * first-activation row, yet the plugin is listed as active.
	 *
	 * The network-origin row is what keeps a fresh multisite subsite out of this
	 * branch — it has no first-activation row either, for an entirely different
	 * reason.
	 *
	 * @return bool
	 */
	private static function was_running_before_this_code(): bool {
		if ( false !== get_option( self::OPTION_FIRST_VERSION, false ) ) {
			return false;
		}

		if ( is_multisite() && '' !== (string) get_site_option( self::SITE_OPTION_NETWORK_ORIGIN, '' ) ) {
			return false;
		}

		$active = (array) get_option( 'active_plugins', array() );

		if ( is_multisite() ) {
			$active = array_merge( $active, array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) ) );
		}

		return in_array( SHAPED_GALLERY_BASENAME, $active, true );
	}

	/**
	 * Where this install came from, as one of the `ORIGIN_*` constants.
	 *
	 * Safe to call on a front-end request. The stored row is autoloaded, so the
	 * common path costs nothing; the fallback below only runs in the window between
	 * an in-place update landing and the first admin request stamping the row, which
	 * is exactly the window a migrated site would otherwise spend rendering as though
	 * it were new.
	 *
	 * @return string
	 */
	public static function origin( bool $from_activation = false ): string {
		$stored = (string) get_option( self::OPTION_INSTALL_ORIGIN, '' );

		if ( '' !== $stored ) {
			return $stored;
		}

		return self::detect_origin( $from_activation );
	}

	/**
	 * Whether this site ran Easy Lightbox before this plugin.
	 *
	 * The question every compatibility default is answered from.
	 *
	 * `$from_activation` is not cosmetic. `activate_plugin()` writes the plugin into
	 * `active_plugins` before firing its hook, so during a genuine first activation
	 * the site already looks "already active" — which is the third detector's whole
	 * signal. Callers running inside the activation request must say so, or every
	 * fresh install classifies itself as migrated.
	 *
	 * @param bool $from_activation Whether the caller is inside the activation hook.
	 * @return bool
	 */
	public static function is_migrated( bool $from_activation = false ): bool {
		return self::ORIGIN_EASY_LIGHTBOX === self::origin( $from_activation );
	}

	/**
	 * Whether this site started on a version older than the one given.
	 *
	 * This is what lets a later release apply a changed default only to installs that
	 * began after it, instead of changing behaviour under sites that never asked for
	 * it — by then "was this site new in 2.4.0?" is unanswerable.
	 *
	 * An unrecorded install answers TRUE, and that direction is load-bearing. The
	 * first request after an in-place update can be a logged-out page view, arriving
	 * before any `admin_init` has written a row; answering "false" there would show a
	 * visitor the new behaviour for one request and then take it back.
	 *
	 * @param string $version Version the new behaviour was introduced in.
	 * @return bool
	 */
	public static function started_before( string $version ): bool {
		$first = (string) get_option( self::OPTION_FIRST_VERSION, '' );

		if ( '' === $first ) {
			return true;
		}

		return version_compare( $first, $version, '<' );
	}

	/**
	 * Record the first-activation version/date, but only the very first time this
	 * ever runs on this site — every activation after that leaves both values exactly
	 * as they were.
	 *
	 * A site that already had this plugin before these rows existed records the
	 * version it is running now, which is an upper bound rather than the version it
	 * truly started on. That is the same trade Reno Cart and the rest of the
	 * catalogue make: an inexact answer for installs that predate the record, an
	 * exact one for every install after it.
	 *
	 * @return void
	 */
	private static function maybe_record_first_activation(): void {
		/*
		 * On a migrated site the honest answer is Easy Lightbox's, not ours.
		 *
		 * Recording SHAPED_GALLERY_VERSION and today's date here would date a site
		 * that installed the lightbox in 2018 to the day it took this update, and
		 * both rows refuse to be overwritten afterwards — so the wrong answer would
		 * be the permanent one. Where Easy Lightbox left a record, it is carried
		 * across; where it did not (1.1.3 and earlier wrote nothing), the fallback
		 * is the same upper bound every install predating the record gets.
		 */
		list( $first_version, $first_date ) = self::legacy_first_activation();

		if ( false === get_option( self::OPTION_FIRST_VERSION, false ) ) {
			add_option(
				self::OPTION_FIRST_VERSION,
				'' !== $first_version ? $first_version : SHAPED_GALLERY_VERSION,
				'',
				false
			);
		}

		if ( false === get_option( self::OPTION_FIRST_DATE, false ) ) {
			add_option(
				self::OPTION_FIRST_DATE,
				'' !== $first_date ? $first_date : current_time( 'mysql' ),
				'',
				false
			);
		}
	}

	/**
	 * Keep {@see self::OPTION_CURRENT_VERSION} in step with the code actually running.
	 *
	 * Not autoloaded, matching every other option this plugin writes: one extra
	 * query per admin request on a site with no persistent object cache, against a
	 * row no front-end request should be paying for at all. The write only happens
	 * on the request that follows an actual version change.
	 *
	 * @return void
	 */
	public static function sync_current_version(): void {
		if ( SHAPED_GALLERY_VERSION !== get_option( self::OPTION_CURRENT_VERSION ) ) {
			update_option( self::OPTION_CURRENT_VERSION, SHAPED_GALLERY_VERSION, false );
		}
	}
}

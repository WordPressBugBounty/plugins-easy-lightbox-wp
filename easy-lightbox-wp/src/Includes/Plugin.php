<?php
/**
 * Main plugin bootstrap singleton.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Includes;

use ShapedPlugin\ShapedGallery\Core\PostType;
use ShapedPlugin\ShapedGallery\Core\Assets;
use ShapedPlugin\ShapedGallery\Core\Capabilities;
use ShapedPlugin\ShapedGallery\Core\GalleryMeta;
use ShapedPlugin\ShapedGallery\Core\Install;
use ShapedPlugin\ShapedGallery\Core\Updates;
use ShapedPlugin\ShapedGallery\Core\DebugPerformance;
use ShapedPlugin\ShapedGallery\Core\GalleryCache;
use ShapedPlugin\ShapedGallery\Core\MediaCache;
use ShapedPlugin\ShapedGallery\Admin\Admin;
use ShapedPlugin\ShapedGallery\Frontend\Frontend;
use ShapedPlugin\ShapedGallery\Frontend\GalleryPassword;
use ShapedPlugin\ShapedGallery\Integrations\Integrations;
use ShapedPlugin\ShapedGallery\Blocks\BlocksInit;
use ShapedPlugin\ShapedGallery\Providers\Provider_Registry;
use ShapedPlugin\ShapedGallery\Providers\MediaLibraryProvider;
use ShapedPlugin\ShapedGallery\Rest\GalleryController;
use ShapedPlugin\ShapedGallery\Rest\PatternController;
use ShapedPlugin\ShapedGallery\Deprecated\EasyLightboxCompat;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Wires together every subsystem of the plugin.
 */
final class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @return Plugin
	 */
	public static function instance(): Plugin {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor: boot subsystems.
	 */
	private function __construct() {
		$this->register_providers();

		add_action( 'init', array( $this, 'load_textdomain' ) );

		( new PostType() )->hooks();
		// After the post type, whose capability names it derives. Self-healing, so a
		// site updated in place — or network-activated, which fires no per-site
		// activation hook — still ends up with the grant.
		( new Capabilities() )->hooks();
		// The install record. Self-healing for the same two cases as the grant above —
		// an in-place update and a network activation reach no activation hook — but
		// on `admin_init` rather than `init`, since nothing on the front end reads it.
		( new Install() )->hooks();
		/*
		 * The data-update runner. Registered after Install so the dependency reads in
		 * the right direction, but it HOOKS ahead of it (admin_init:5 against the
		 * default 10) because its 1.2.0 step snapshots a value Install's legacy
		 * mirror is about to overwrite.
		 */
		( new Updates() )->hooks();
		( new GalleryMeta() )->hooks();
		( new Assets() )->hooks();
		( new MediaCache() )->hooks();
		// Owns the Clear Cache Timeout's one hook: a changed timeout drops the entries
		// still holding the old one, so the new value applies on the next page view.
		( new GalleryCache() )->hooks();
		// Debug Performance. Collects only what a producer pushes at it, and only while
		// the toggle is on for a user who can manage options — so on a visitor's page
		// view it listens to an action nobody fires.
		( new DebugPerformance() )->hooks();
		( new Admin() )->hooks();
		( new Frontend() )->hooks();
		// The password gate's own half: verifying a submitted password and issuing the
		// unlock cookie have to happen before any output, which the block's
		// render_callback (running inside `the_content`) is far too late for.
		( new GalleryPassword() )->hooks();
		( new GalleryController() )->hooks();
		( new PatternController() )->hooks();
		// Page-builder integrations. Reads the Integrations grid's switches and boots
		// only the builders that are on; each one then checks for its builder LATE,
		// inside an `init`-or-later callback, because the load order between this
		// plugin and Elementor, Divi or Bricks is undefined at `plugins_loaded`.
		( new Integrations() )->hooks();
		/*
		 * The Easy Lightbox compatibility layer (§25). Deliberately LAST, and
		 * deliberately the only reference to `src/Deprecated/` anywhere in the
		 * plugin: a future major deletes that folder, `app/deprecated/` and this
		 * one line, and nothing else has to be unpicked. It is inert on a site
		 * that did not come from the Easy Lightbox listing.
		 */
		( new EasyLightboxCompat() )->hooks();

		BlocksInit::instance();
	}

	/**
	 * Register MVP media providers.
	 *
	 * Only the native Media Library ships for the MVP. Future "Connect & Import"
	 * services register here without touching the layout compiler.
	 *
	 * @return void
	 */
	private function register_providers(): void {
		Provider_Registry::register( new MediaLibraryProvider() );

		/**
		 * Allow add-ons to register additional media providers.
		 *
		 * @since 1.0.0
		 *
		 * @param string $registry_class The provider registry class name.
		 */
		do_action( 'shaped_gallery_register_providers', Provider_Registry::class );
	}

	/**
	 * Load the plugin text domain.
	 *
	 * @return void
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain( 'easy-lightbox-wp', false, dirname( SHAPED_GALLERY_BASENAME ) . '/languages' );
	}
}

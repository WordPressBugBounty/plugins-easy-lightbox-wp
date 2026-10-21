<?php
/**
 * ShapedGallery
 *
 * Bootstraps the plugin: defines constants, loads the Composer autoloader and
 * starts the main plugin singleton.
 *
 * @link    https://shapedplugin.com
 * @package ShapedPlugin\ShapedGallery
 *
 * Plugin Name:       ShapedGallery
 * Plugin URI:        https://shapedgallery.com/
 * Description:       Create responsive image, photo and video galleries with justified, grid and masonry layouts, one-click Ready Patterns and a built-in lightbox.
 * Version:           1.2.2
 * Requires at least: 6.8
 * Requires PHP:      8.1
 * Author:            ShapedPlugin
 * Author URI:        https://shapedplugin.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       easy-lightbox-wp
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/*
 * NOTHING in this file may be an unconditional top-level `function` or `class`
 * declaration, and that is a hard rule rather than a style choice.
 *
 * Free and premium are the SAME plugin at two feature levels: one text domain, one
 * `ShapedPlugin\ShapedGallery` namespace, one `shaped_gallery` post type, one
 * `shaped_gallery_settings` option and one `shaped-gallery/gallery` block. That is what
 * lets a site upgrade with no migration — and it is also why exactly one of the two
 * may boot, which the guard below decides at runtime.
 *
 * PHP binds an unconditional top-level declaration when the file is COMPILED, before
 * a single statement in it runs. So a `function shaped_gallery()` here would collide
 * with the premium build's identically-named one the moment WordPress compiled this
 * file in a request that had already loaded that build — during
 * `plugin_sandbox_scrape()` on activation, for instance — and the guard's `return`
 * would never get the chance to prevent it. A fatal, not a notice.
 *
 * Hence: the boot callback is a closure, and the one named helper is wrapped in
 * `function_exists()` so it is declared conditionally (which also disables the early
 * binding). `define()` and `add_action()` are ordinary statements and are safely
 * governed by the `return` below.
 */

/**
 * Hard requirement: PHP 8.1+. Bail with an admin notice instead of fataling.
 */
if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
	add_action(
		'admin_notices',
		static function () {
			printf(
				'<div class="notice notice-error"><p>%s</p></div>',
				esc_html__( 'ShapedGallery requires PHP 8.1 or higher. Please upgrade PHP to use this plugin.', 'easy-lightbox-wp' )
			);
		}
	);
	return;
}

if ( ! function_exists( 'shaped_gallery_premium_is_active' ) ) {
	/**
	 * Whether the premium build is also installed and active.
	 *
	 * Checked against the stored active-plugin lists rather than `is_plugin_active()`,
	 * which lives in an admin-only file that is not loaded at this point in the
	 * request. The single-site list and the network-activated map are both consulted,
	 * because a multisite can have the premium build switched on at either level.
	 *
	 * @return bool
	 */
	function shaped_gallery_premium_is_active() {
		if ( defined( 'SHAPED_GALLERY_PRO_VERSION' ) ) {
			return true;
		}

		$active = (array) get_option( 'active_plugins', array() );

		if ( is_multisite() ) {
			$active = array_merge( $active, array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) ) );
		}

		foreach ( $active as $plugin ) {
			if ( 0 === strpos( (string) $plugin, 'shaped-gallery-pro/' ) ) {
				return true;
			}
		}

		return false;
	}
}

/*
 * Premium active: stand down, SILENTLY.
 *
 * Pro is not a replacement for this plugin, it is an add-on that carries the unified
 * engine — so this plugin has to stay INSTALLED AND ACTIVE, and the notice that used
 * to say "you can safely deactivate the free plugin" was telling users to do the one
 * thing that breaks the pair. Two reasons it must stay switched on:
 *
 * - WordPress.org counts an active install from `active_plugins`. Deactivating here
 *   is what makes the plugin's own metrics disappear.
 * - Pro declares this plugin as a hard dependency (`Requires Plugins: easy-lightbox-wp`
 *   plus its own runtime check), so deactivating this one stops Pro dead and puts an
 *   error notice in its place.
 *
 * Standing down means exactly this `return`: no constants, no autoloader, no post
 * type, no blocks, no assets. Pro runs the whole engine from its own directory
 * against the same post type, option and block name, so there is nothing to migrate
 * and nothing here for a user to act on — which is why it is silent rather than
 * informational. Anything worth saying about the pairing belongs on Pro's side, where
 * the user can actually do something about it.
 */
if ( shaped_gallery_premium_is_active() ) {
	return;
}

/*
 * NOTHING may be defined above this return — least of all `SHAPED_GALLERY_VERSION`.
 *
 * This is ordering, not tidiness. `active_plugins` is stored alphabetically
 * (`activate_plugin()` sorts it), and since this build ships from the
 * `easy-lightbox-wp` directory (§24) it now loads BEFORE `shaped-gallery-pro/`,
 * where Pro used to load first. Pro's own guard stands itself down when it finds
 * `SHAPED_GALLERY_VERSION` already defined — a rule written for the activation
 * sandbox scrape, but one this file now meets on every single request.
 *
 * The pair works because the return above fires before that constant exists: Pro
 * then sees it undefined and boots. Define anything named `SHAPED_GALLERY_*` above
 * this point and Pro silently stops booting site-wide, with no error anywhere.
 */

// Plugin constants.
define( 'SHAPED_GALLERY_VERSION', '1.2.2' );
define( 'SHAPED_GALLERY_FILE', __FILE__ );
define( 'SHAPED_GALLERY_BASENAME', plugin_basename( __FILE__ ) );
define( 'SHAPED_GALLERY_PATH', plugin_dir_path( __FILE__ ) );
define( 'SHAPED_GALLERY_URL', plugin_dir_url( __FILE__ ) );
define( 'SHAPED_GALLERY_SRC_PATH', SHAPED_GALLERY_PATH . 'src/' );
define( 'SHAPED_GALLERY_DIST_URL', SHAPED_GALLERY_URL . 'dist/' );
define( 'SHAPED_GALLERY_DIST_PATH', SHAPED_GALLERY_PATH . 'dist/' );
define( 'SHAPED_GALLERY_POST_TYPE', 'shaped_gallery' );

// Composer autoloader (PSR-4: ShapedPlugin\ShapedGallery\ => src/).
if ( file_exists( SHAPED_GALLERY_PATH . 'vendor/autoload.php' ) ) {
	require_once SHAPED_GALLERY_PATH . 'vendor/autoload.php';
} else {
	// Fallback PSR-4 autoloader for development environments without vendor/autoload.php.
	spl_autoload_register(
		static function ( $class ) {
			$prefix   = 'ShapedPlugin\\ShapedGallery\\';
			$base_dir = SHAPED_GALLERY_PATH . 'src/';
			$len      = strlen( $prefix );

			if ( 0 !== strncmp( $prefix, $class, $len ) ) {
				return;
			}

			$relative_class = substr( $class, $len );
			$file           = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

			if ( file_exists( $file ) ) {
				require_once $file;
			}
		}
	);
}

/*
 * Begin execution. Everything is registered via hooks, so booting here is
 * side-effect free. A closure rather than a named callback — see the note at the
 * top of this file; `Includes\Plugin::instance()` is the namespaced accessor any
 * integration should call.
 */
add_action(
	'plugins_loaded',
	static function () {
		if ( ! class_exists( '\ShapedPlugin\ShapedGallery\Includes\Plugin' ) ) {
			return;
		}

		\ShapedPlugin\ShapedGallery\Includes\Plugin::instance();
	}
);

/**
 * Activation: register the CPT then flush rewrite rules once.
 */
register_activation_hook(
	__FILE__,
	/**
	 * @param bool $network_wide Whether the activation was network-wide.
	 */
	static function ( $network_wide = false ) {
		if ( class_exists( '\ShapedPlugin\ShapedGallery\Core\PostType' ) ) {
			( new \ShapedPlugin\ShapedGallery\Core\PostType() )->register();

			/*
			 * The gallery capabilities, granted while the post type is registered so the
			 * names are derived rather than restated. Also re-checked on `init` every
			 * request (see Core\Capabilities), which is what covers an in-place update
			 * and a network activation — neither of which reaches this hook per site.
			 */
			if ( class_exists( '\ShapedPlugin\ShapedGallery\Core\Capabilities' ) ) {
				\ShapedPlugin\ShapedGallery\Core\Capabilities::grant();
			}
		}

		/*
		 * The install record: the version this site started on, the date it started,
		 * and the version running now. Here because this is the only moment a genuine
		 * first activation can be observed; also re-checked on `admin_init` (see
		 * Core\Install), which is what covers an in-place update and a network
		 * activation. Outside the post-type block above — it depends on neither.
		 */
		/*
		 * Data migrations FIRST, mirroring the hook order on an ordinary admin load
		 * (the runner at `admin_init:5`, the record at the default 10). The 1.2.0
		 * step snapshots `easy_lightbox_current_version` before the record's legacy
		 * mirror overwrites it with the running version; run the record first and the
		 * snapshot preserves the value that just replaced the one worth keeping.
		 *
		 * `true` says we are inside the activation request. Core writes the plugin
		 * into `active_plugins` before firing this hook, so without it a genuine
		 * first activation looks like an in-place update and a brand-new site would
		 * run the whole migration history.
		 */
		if ( class_exists( '\ShapedPlugin\ShapedGallery\Core\Updates' ) ) {
			\ShapedPlugin\ShapedGallery\Core\Updates::maybe_run( true );
		}

		if ( class_exists( '\ShapedPlugin\ShapedGallery\Core\Install' ) ) {
			\ShapedPlugin\ShapedGallery\Core\Install::record( true, (bool) $network_wide );
		}

		/*
		 * Land the admin on the Dashboard after activation — every activation, not
		 * only the site's first. A transient rather than a redirect issued right
		 * here: core's own `activate_plugin()` is still running and about to send
		 * its own `Location` header, so this only flags the request; Admin\Dashboard
		 * redirects on the `plugins.php` load that follows (see
		 * Dashboard::maybe_redirect_after_activation()).
		 */
		if ( class_exists( '\ShapedPlugin\ShapedGallery\Admin\Dashboard' ) ) {
			\ShapedPlugin\ShapedGallery\Admin\Dashboard::flag_activation_redirect();
		}

		flush_rewrite_rules();
	}
);

/**
 * Deactivation: drop the rewrite rules this plugin's post type added.
 */
register_deactivation_hook(
	__FILE__,
	static function () {
		flush_rewrite_rules();
	}
);

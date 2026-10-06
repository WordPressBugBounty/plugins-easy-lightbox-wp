<?php
/**
 * Admin menu: one top-level menu + its sub-pages.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Admin;

use ShapedPlugin\ShapedGallery\Core\BrandMark;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the ShapedGallery admin menu and renders each sub-page shell.
 *
 * Every screen here is either the dashboard SPA (Dashboard, Manage Galleries,
 * Settings, About Us — one page, hash routes, see {@see Dashboard}) or core's own
 * block editor (Add New Gallery, see {@see GalleryEditor}). The plugin owns no second
 * editor and no list-table screen of its own.
 *
 * The visible top-level submenu is deliberately just Dashboard and Settings —
 * Manage Galleries, Add New Gallery and About Us stay registered (they are still
 * real, reachable pages) but are hidden via `remove_submenu_page()` in
 * {@see register_menu()}.
 */
class Menu {

	const CAPABILITY = 'manage_options';
	const SLUG       = 'shaped-gallery';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_head', array( $this, 'print_menu_icon_styles' ) );
	}

	/**
	 * Register the menu and sub-pages.
	 *
	 * @return void
	 */
	public function register_menu(): void {
		add_menu_page(
			__( 'ShapedGallery', 'easy-lightbox-wp' ),
			__( 'ShapedGallery', 'easy-lightbox-wp' ),
			self::CAPABILITY,
			self::SLUG,
			array( $this, 'render_dashboard' ),
			self::menu_icon(),
			26
		);

		// Must stay the FIRST add_submenu_page() call: re-registering the parent slug
		// is what replaces WordPress's auto-generated duplicate ("ShapedGallery") with
		// a real label, and core builds the top-level menu's own href from the first
		// submenu entry. Hidden below (§ remove_submenu_page call) — visible menu
		// keeps only Dashboard and Settings — but it must still be registered first,
		// since removing it from the list entirely brings the duplicate back.
		add_submenu_page(
			self::SLUG,
			__( 'Saved Galleries', 'easy-lightbox-wp' ),
			__( 'Saved Galleries', 'easy-lightbox-wp' ),
			self::CAPABILITY,
			self::SLUG,
			array( $this, 'render_dashboard' )
		);

		// Add New Gallery is the NATIVE editor, not a plugin screen: the slug is a
		// core file, which `add_submenu_page()` links to directly (no callback, no
		// page of our own). Hidden from the menu (kept registered so the "Add New
		// Gallery" quick-action links and `GalleryEditor`'s own highlight still
		// resolve), since the CPT itself is `show_in_menu => false`.
		add_submenu_page(
			self::SLUG,
			__( 'Add New Gallery', 'easy-lightbox-wp' ),
			__( 'Add New Gallery', 'easy-lightbox-wp' ),
			self::CAPABILITY,
			GalleryEditor::new_url_slug()
		);

		// The two entries below both mount the same SPA. Dashboard::maybe_redirect_route()
		// 302s Settings to this page plus its hash; it keeps a real callback so a
		// filtered-off redirect degrades to a working page instead of a blank screen.
		// Labeled "Dashboard" (not "Getting Started"): it is this same route's own
		// in-app tab name (see `DEFAULT_ROUTE` in `app/admin/routes.js`), and the menu
		// should say what the page actually is.
		add_submenu_page(
			self::SLUG,
			__( 'Dashboard', 'easy-lightbox-wp' ),
			__( 'Dashboard', 'easy-lightbox-wp' ),
			self::CAPABILITY,
			Dashboard::PAGE_SLUG,
			array( $this, 'render_dashboard' )
		);

		add_submenu_page(
			self::SLUG,
			__( 'Settings', 'easy-lightbox-wp' ),
			__( 'Settings', 'easy-lightbox-wp' ),
			self::CAPABILITY,
			Dashboard::SETTINGS_SLUG,
			array( $this, 'render_dashboard' )
		);

		// About Us stays a real page (linked from inside the SPA's own nav) but is
		// dropped from the WP admin submenu — only Dashboard and Settings show there.
		add_submenu_page(
			self::SLUG,
			__( 'About Us', 'easy-lightbox-wp' ),
			__( 'About Us', 'easy-lightbox-wp' ),
			self::CAPABILITY,
			Dashboard::ABOUT_SLUG,
			array( $this, 'render_dashboard' )
		);

		// Keep only Dashboard and Settings visible under the top-level menu. Every
		// hidden slug above stays fully registered (capability check, redirect
		// target, GalleryEditor's own menu-highlight) — `remove_submenu_page()` only
		// deletes the row WordPress would otherwise print in `$submenu`.
		remove_submenu_page( self::SLUG, self::SLUG );
		remove_submenu_page( self::SLUG, GalleryEditor::new_url_slug() );
		remove_submenu_page( self::SLUG, Dashboard::ABOUT_SLUG );
	}

	/**
	 * The brand mark, as the top-level menu icon (base64 SVG data URI).
	 *
	 * The artwork is {@see BrandMark} — the shipped copy of `ShapedMarkMono` that the
	 * page-builder panels use too (§18), so the menu holds no tracing of its own.
	 *
	 * Solid, near-white fill on purpose, NOT the brand gradient: `wp-admin/js/
	 * svg-painter.js` repaints every `#adminmenu` SVG icon's `fill` to the active
	 * admin colour scheme's `icon_colors` (base/focus/current — light-neutral to
	 * white in all eight core schemes) as soon as it runs on `$(document).ready`.
	 * A gradient fill survives until that repaint lands, so the icon flashes brand
	 * blue for one frame on every page load before switching to the scheme colour.
	 * Shipping the same near-white tone core repaints TO means the repaint is a
	 * no-op visually — first paint already matches the settled state.
	 *
	 * Falls back to core's generic gallery dashicon if the asset is missing, so the
	 * menu entry never renders without an icon.
	 *
	 * @return string
	 */
	private static function menu_icon(): string {
		$uri = BrandMark::data_uri( '#f3f1f1' );

		return '' !== $uri ? $uri : 'dashicons-format-gallery';
	}

	/**
	 * Size the brand-mark menu icon to match core's own dashicon metrics.
	 *
	 * WordPress draws a custom SVG image icon at its natural size otherwise, which
	 * dwarfs the 20px dashicons either side of it in the admin menu.
	 *
	 * @return void
	 */
	public function print_menu_icon_styles(): void {
		?>
		<style id="shaped-gallery-menu-icon-styles">
			#adminmenu .toplevel_page_<?php echo esc_attr( self::SLUG ); ?> .wp-menu-image img {
				width: 20px;
				height: 20px;
				padding: 6px 0 0;
			}
		</style>
		<?php
	}

	/**
	 * Dashboard SPA root, shared by Manage Galleries / Dashboard / Settings / About Us.
	 *
	 * Rendered bare — no `.wrap`, no `.sp-shaped-gallery-dashboard` — because React owns
	 * that class on its own shell and the header bar is full-bleed. `data-route` is
	 * only a fallback: the SPA prefers a valid `location.hash`.
	 *
	 * @return void
	 */
	public function render_dashboard(): void {
		?>
		<div id="sp-shaped-gallery-admin-dashboard" data-route="<?php echo esc_attr( Dashboard::current_route() ); ?>"></div>
		<?php
	}
}

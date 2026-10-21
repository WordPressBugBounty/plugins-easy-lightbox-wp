<?php
/**
 * Asset registration & conditional enqueue.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Core;

use ShapedPlugin\ShapedGallery\Admin\Dashboard;
use ShapedPlugin\ShapedGallery\Admin\DashboardConfig;
use ShapedPlugin\ShapedGallery\Admin\GalleryEditor;
use ShapedPlugin\ShapedGallery\Admin\Settings;
use ShapedPlugin\ShapedGallery\Frontend\Frontend;
use ShapedPlugin\ShapedGallery\Includes\Functions;
use ShapedPlugin\ShapedGallery\Modules\ImageCustomUrl;
use ShapedPlugin\ShapedGallery\Modules\Lightbox;
use ShapedPlugin\ShapedGallery\Modules\ReadyPatterns;
use ShapedPlugin\ShapedGallery\Patterns\PatternLibrary;
use ShapedPlugin\ShapedGallery\Providers\Provider_Registry;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Loads the admin React bundles only on the plugin's own screens and provides
 * the shared localize payload reused by the editor, admin and block contexts.
 */
class Assets {

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin' ) );
	}

	/**
	 * Shared JS payload (REST root + nonce, providers, layouts, urls).
	 *
	 * @return array<string,mixed>
	 */
	public static function localize_data(): array {
		// URL of core's media-grid script (defines the Edit Image frame). We no
		// longer enqueue it up front; the media manager injects it on demand on the
		// first Edit Image click. Mirror core's own registration: same SCRIPT_DEBUG
		// suffix and $wp_version so the browser reuses the already-cached file.
		$grid_suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';

		return array(
			'restUrl'               => esc_url_raw( rest_url( 'shaped-gallery/v1/' ) ),
			'restRoot'              => esc_url_raw( rest_url() ),
			'nonce'                 => wp_create_nonce( 'wp_rest' ),
			'adminUrl'              => esc_url_raw( admin_url() ),
			'pluginUrl'             => esc_url_raw( SHAPED_GALLERY_URL ),
			'providers'             => Provider_Registry::catalog(),
			'layouts'               => Functions::layouts(),
			'mediaMonths'           => Functions::media_months(),
			'mediaVersion'          => MediaCache::version(),
			'mediaGridSrc'          => esc_url_raw( add_query_arg( 'ver', get_bloginfo( 'version' ), includes_url( "js/media-grid{$grid_suffix}.js" ) ) ),
			// Consumed by the block's Gallery Information sidebar section, which runs
			// inside Gutenberg as well as on our own screens — so these live in the
			// shared payload rather than the dashboard-only one.
			'postType'              => PostType::POST_TYPE,
			'shortcodeTag'          => Frontend::TAG,
			'manageUrl'             => esc_url_raw( Dashboard::page_url( Dashboard::MANAGE_ROUTE ) ),
			// Deep link to Settings → Modules. The block's Lightbox panel points at
			// it, because the options it does NOT expose are configured there and a
			// note that names a screen without reaching it is a dead end.
			'modulesUrl'            => esc_url_raw( Dashboard::page_url( 'settings' ) . '/modules' ),
			'newUrl'                => esc_url_raw( GalleryEditor::new_url() ),
			'docsUrl'               => esc_url_raw( DashboardConfig::block_docs_url() ),
			'lightboxEnabled'       => Lightbox::is_enabled(),
			'imageCustomUrlEnabled' => ImageCustomUrl::is_enabled(),
			'readyPatternsEnabled'  => ReadyPatterns::is_enabled(),
			// The pattern catalogue is one list for both builds, so the editor needs
			// to know which tier it is drawing for: a premium row becomes a locked
			// card with an upgrade link instead of an Insert button. Presentation
			// only — `PatternLibrary::import()` is what refuses the id.
			'patternsPremium'       => PatternLibrary::premium_active(),
			'patternsUpgradeUrl'    => esc_url_raw( DashboardConfig::pro_url( DashboardConfig::PRO_FROM_BLOCK ) ),
			// Where every Pro teaser points (`app/components/pro/upgrade.js`): the
			// locked layout cards and locked controls. One key on the payload both
			// bundles receive, so no surface spells the URL out. Tagged for the block
			// editor here; the dashboard bundle re-tags it in `enqueue_admin_bundle()`.
			'upgradeUrl'            => esc_url_raw( DashboardConfig::pro_url( DashboardConfig::PRO_FROM_BLOCK ) ),
			// The media gallery modal's locked source tabs (`openMediaUpgrade()`),
			// counted apart from the layout cards. Block editor only — the modal is
			// never drawn on a dashboard screen, so the dashboard needs no re-tag.
			'mediaUpgradeUrl'       => esc_url_raw( DashboardConfig::pro_url( DashboardConfig::PRO_FROM_MEDIA ) ),
			// The Pro note's own link (`ProNotice`): the "Upgrade to Pro" inside an
			// inspector panel, counted apart from the canvas teasers. Re-tagged by
			// the dashboard bundle too, whose Lightbox panel draws the same note.
			'noticeUrl'             => esc_url_raw( DashboardConfig::pro_url( DashboardConfig::PRO_FROM_INSPECTOR ) ),
			// The offer the inspector's upgrade link (`ProNotice` `showOffer`) and the
			// dashboard's offer bar (`OfferBar`) name, the moment it ends — both
			// leave an open screen then — and the bar's translated lead sentence, or
			// an empty array once it has ended. Nested, so `wp_localize_script()`
			// leaves both ints instead of casting to strings.
			'proOffer'              => DashboardConfig::pro_offer(),
		);
	}

	/**
	 * Enqueue the dashboard bundle on the plugin's admin pages.
	 *
	 * The gallery editor needs no bundle of its own: it is core's block editor, and
	 * the block's own `editor_script` handle (registered from block.json) is what
	 * carries the React code and the `shaped_gallery_data` payload there.
	 *
	 * The route slugs normally 302 to the host page before this hook runs, but they
	 * are still matched here so the SPA keeps working if a site filters the redirect
	 * off.
	 *
	 * @param string $hook Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_admin( string $hook ): void {
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( Dashboard::is_dashboard_page( $page ) ) {
			$this->enqueue_admin_bundle();
		}
	}

	/**
	 * Enqueue the dashboard bundle (Manage Galleries / Getting Started / Settings / About Us).
	 *
	 * @return void
	 */
	private function enqueue_admin_bundle(): void {
		$manifest = Functions::asset_manifest( 'admin/shaped-dashboard' );

		/*
		 * Core's media modal. The dashboard is not a block editor, so its media
		 * screens talk to `wp.media` directly (`app/media-manager/`), and that global
		 * only exists once this has run. Still conditional: only the four dashboard
		 * slugs reach this method (§10).
		 */
		wp_enqueue_media();

		wp_enqueue_script(
			'shaped-gallery-admin',
			SHAPED_GALLERY_DIST_URL . 'admin/shaped-dashboard.js',
			$manifest['dependencies'],
			$manifest['version'],
			true
		);

		wp_enqueue_style(
			'shaped-gallery-admin',
			SHAPED_GALLERY_DIST_URL . 'admin/shaped-dashboard.css',
			array( 'wp-components' ),
			Functions::asset_version( 'admin/shaped-dashboard.css' )
		);

		wp_set_script_translations( 'shaped-gallery-admin', 'easy-lightbox-wp', SHAPED_GALLERY_PATH . 'languages' );

		// The dashboard payload is NESTED, not a second global: §2 fixes the admin
		// localize object name, and wp_localize_script() only stringifies top-level
		// scalars — nesting keeps booleans and integers real in JS.
		wp_localize_script(
			'shaped-gallery-admin',
			'shaped_gallery_admin',
			array_merge(
				self::localize_data(),
				array(
					'context'    => 'admin',
					// The same teasers, clicked on a dashboard screen, so the campaign
					// reports tell them from the block editor's. No dashboard surface
					// reads `upgradeUrl` today, but one added later must not be counted
					// as the block editor's.
					'upgradeUrl' => esc_url_raw( DashboardConfig::pro_url( DashboardConfig::PRO_FROM_MODULES ) ),
					// The Lightbox gear panel's Pro note, which sits under Settings →
					// Modules — not the block inspector the shared payload tags it for.
					'noticeUrl'  => esc_url_raw( DashboardConfig::pro_url( DashboardConfig::PRO_FROM_MODULES ) ),
					// The offer bar's own link (`OfferBar`): the campaign strip over
					// every dashboard screen, counted apart from the teasers.
					'offerUrl'   => esc_url_raw( DashboardConfig::pro_url( DashboardConfig::PRO_FROM_OFFER_BAR ) ),
					// Through Settings::get(), not get_option(): the SPA seeds its draft
					// from this, so it needs every key present and correctly typed even
					// before the option has ever been written.
					'settings'   => Settings::get(),
					// What "Reset to Default" restores. Shipped from here so the screen
					// never has to treat its own JS mirror as authoritative — a default
					// changed in PHP would otherwise keep restoring the old value.
					'defaults'   => Settings::screen_defaults(),
					'dashboard'  => DashboardConfig::localize(),
				)
			)
		);
	}
}

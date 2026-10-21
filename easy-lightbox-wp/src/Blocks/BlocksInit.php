<?php
/**
 * Block bootstrap: category, asset handles, registration.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Blocks;

use ShapedPlugin\ShapedGallery\Blocks\BlockTypes\Gallery;
use ShapedPlugin\ShapedGallery\Core\Assets;
use ShapedPlugin\ShapedGallery\Includes\Functions;
use ShapedPlugin\ShapedGallery\Modules\Lightbox as LightboxModule;
use ShapedPlugin\ShapedGallery\Rest\GalleryController;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the block category, the shared block/frontend asset handles, and
 * the gallery block itself.
 */
class BlocksInit {

	/**
	 * Singleton instance.
	 *
	 * @var BlocksInit|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @return BlocksInit
	 */
	public static function instance(): BlocksInit {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor: hook everything.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'register_assets' ), 5 );
		add_action( 'init', array( $this, 'register_blocks' ), 10 );
		// The editor payload, on the one hook that only fires where it is read. See
		// localize_editor_data() for why it cannot stay beside the registration.
		add_action( 'enqueue_block_editor_assets', array( $this, 'localize_editor_data' ) );
		$this->register_category();
	}

	/**
	 * Add the ShapedGallery block category.
	 *
	 * @return void
	 */
	private function register_category(): void {
		/*
		 * `block_categories_all` unconditionally. This used to pick between it and the
		 * pre-5.8 `block_categories` on a `version_compare()`, which became dead the
		 * moment the block declared `apiVersion: 3` — that needs 6.3 at the very least,
		 * so the older branch could never be taken again and only read as though 5.8
		 * were still supported.
		 */
		add_filter(
			'block_categories_all',
			static function ( $categories ) {
				return array_merge(
					array(
						array(
							'slug'  => 'shaped-gallery',
							'title' => __( 'ShapedGallery', 'easy-lightbox-wp' ),
							// The brand mark is attached client-side (`updateCategory()` in the
							// block bundle): this array only takes a dashicon slug.
							'icon'  => null,
						),
					),
					$categories
				);
			}
		);
	}

	/**
	 * Register shared script/style handles (referenced by block.json registration).
	 *
	 * @return void
	 */
	public function register_assets(): void {
		$block_manifest = Functions::asset_manifest( 'block/index' );
		$front_manifest = Functions::asset_manifest( 'frontend/shaped-layout' );

		// Editor bundle (Gutenberg sidebar + canvas). Depend on `media-editor`
		// (wp.media attachment models + uploader) — what the media manager needs
		// when it opens. The heavier `media-grid` (Edit Image frame only) is not a
		// dependency; it is lazy-injected on the first Edit Image click (see
		// useAttachmentDetails.js).
		wp_register_script(
			'shaped-gallery-block',
			SHAPED_GALLERY_DIST_URL . 'block/index.js',
			array_merge( $block_manifest['dependencies'], array( 'media-editor' ) ),
			$block_manifest['version'],
			true
		);

		/*
		 * The editor bundle's own strings. Without this the ~700 `__()` calls the
		 * block bundle carries are untranslatable at RUNTIME however complete the
		 * translation is: `@wordpress/i18n` reads its catalogue from a JSON file that
		 * only this call tells WordPress to load, so every panel label, every control
		 * and the whole media manager stay in English.
		 *
		 * ~700 rather than the block folder's own ~300 because the `@shaped-gallery/*`
		 * aliases bundle `components`, `media-manager`, `layouts`, `picker` and `lib`
		 * INTO this one script (§5) — the handle is the translation unit, not the
		 * folder.
		 *
		 * The frontend handles below deliberately get no equivalent: nothing under
		 * `app/frontend/` imports `@wordpress/i18n` at all. Their strings arrive
		 * already translated on the `shaped_gallery_frontend.i18n` payload, which is
		 * what keeps a JSON fetch off the front end.
		 */
		wp_set_script_translations( 'shaped-gallery-block', 'easy-lightbox-wp', SHAPED_GALLERY_PATH . 'languages' );

		// Editor-only styles.
		wp_register_style(
			'shaped-gallery-editor-style',
			SHAPED_GALLERY_DIST_URL . 'block/index.css',
			array(),
			Functions::asset_version( 'block/index.css' )
		);

		// Shared gallery styles (front + editor).
		wp_register_style(
			'shaped-gallery-style',
			SHAPED_GALLERY_DIST_URL . 'block/style-index.css',
			array(),
			Functions::asset_version( 'block/style-index.css' )
		);

		// Frontend reflow script (justified / masonry / lightbox / ajax pagination).
		wp_register_script(
			'shaped-gallery-frontend',
			SHAPED_GALLERY_DIST_URL . 'frontend/shaped-layout.js',
			$front_manifest['dependencies'],
			$front_manifest['version'],
			true
		);

		// The ONLY data the frontend runtime needs: the public pagination endpoint,
		// a rest nonce (used for logged-in requests; the route is a public read), the
		// live-region strings, and the Lightbox module's viewer configuration.
		// Attached at registration so it prints whenever the handle is enqueued
		// (Gallery::render(), frontend only). Kept minimal — no admin/provider
		// payload reaches the frontend.
		//
		// The lightbox config rides here rather than per-container data-*: the
		// overlay is ONE element shared by every gallery on the page, so its
		// settings are one answer, not N copies of one answer.
		wp_localize_script(
			'shaped-gallery-frontend',
			'shaped_gallery_frontend',
			array(
				'restUrl'  => esc_url_raw( rest_url( GalleryController::NAMESPACE . '/gallery-page' ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'lightbox' => LightboxModule::frontend_config(),
				'i18n'     => array(
					'loading'    => __( 'Loading more images…', 'easy-lightbox-wp' ),
					'loaded'     => __( 'More images loaded.', 'easy-lightbox-wp' ),
					'error'      => __( 'Could not load more images. Please try again.', 'easy-lightbox-wp' ),
					/*
					 * The viewer's control labels — exactly the set
					 * `app/frontend/lightbox.js` looks up, so a translator is never
					 * handed a string no control shows. The viewer falls back to its
					 * own English for any key missing here, which is what keeps a
					 * stale translation from blanking a button's accessible name.
					 */
					'lightbox'   => array(
						'dialog'   => __( 'Image lightbox', 'easy-lightbox-wp' ),
						'close'    => __( 'Close', 'easy-lightbox-wp' ),
						'previous' => __( 'Previous image', 'easy-lightbox-wp' ),
						'next'     => __( 'Next image', 'easy-lightbox-wp' ),
						'error'    => __( 'This image could not be loaded.', 'easy-lightbox-wp' ),
						/* translators: 1: current image number, 2: total number of images. */
						'counter'  => __( '%1$d / %2$d', 'easy-lightbox-wp' ),
					),
					// The video popup's labels — exactly the set
					// `app/frontend/video-popup.js` looks up, with the same English
					// fallback for a missing key.
					'videoPopup' => array(
						'dialog' => __( 'Video player', 'easy-lightbox-wp' ),
						'close'  => __( 'Close video', 'easy-lightbox-wp' ),
					),
				),
			)
		);

		/*
		 * Lightbox viewer runtime + its CSS. A SEPARATE bundle: a gallery whose click
		 * action is "None" or "Custom URL" — or a site with the Lightbox module
		 * switched off — should never download the viewer or its stylesheet.
		 * Enqueued only when GalleryOptions::lightbox_active() (see
		 * Gallery::render()).
		 *
		 * Depends on `shaped-gallery-frontend` purely for its localize payload: the
		 * viewer reads `shaped_gallery_frontend.lightbox`, §2 fixes that object name,
		 * and one payload printed once beats two globals that could disagree.
		 */
		$lightbox_manifest = Functions::asset_manifest( 'frontend/lightbox' );

		wp_register_script(
			'shaped-gallery-lightbox',
			SHAPED_GALLERY_DIST_URL . 'frontend/lightbox.js',
			array_merge( $lightbox_manifest['dependencies'], array( 'shaped-gallery-frontend' ) ),
			$lightbox_manifest['version'],
			true
		);

		wp_register_style(
			'shaped-gallery-lightbox-style',
			SHAPED_GALLERY_DIST_URL . 'frontend/lightbox.css',
			array(),
			Functions::asset_version( 'frontend/lightbox.css' )
		);

	}

	/**
	 * Attach `shaped_gallery_data` to the editor bundle.
	 *
	 * On `enqueue_block_editor_assets` rather than beside the registration at `init:5`,
	 * because `Assets::localize_data()` is EAGER — building the array runs
	 * `Functions::media_months()`, which on a cache miss executes a grouped `wp_posts`
	 * query and then WRITES a transient. At `init` that happened on every request,
	 * including an anonymous front-end GET, for a payload only the editor and the
	 * dashboard ever read (`shaped-gallery-block` is the block's `editor_script`, so the
	 * front end never enqueues it and the data was built and thrown away). Measured: 3
	 * queries and ~4ms on the first front-end view after any attachment edit, plus two
	 * option writes on a public read — which is the part that matters on a host with a
	 * read replica.
	 *
	 * Safe to attach this late because `wp_localize_script()` only needs the handle
	 * REGISTERED, which `init:5` has already done. The data is read when the script is
	 * PRINTED in the footer, so this runs comfortably before it and is independent of
	 * whatever priority core enqueues registered block scripts at.
	 *
	 * This hook covers every editor that can insert the block — the post editor, the
	 * site editor and the widgets screen all fire it — and nothing else.
	 *
	 * @return void
	 */
	public function localize_editor_data(): void {
		wp_localize_script( 'shaped-gallery-block', 'shaped_gallery_data', Assets::localize_data() );
	}

	/**
	 * Register block types.
	 *
	 * @return void
	 */
	public function register_blocks(): void {
		( new Gallery() )->register();
	}
}

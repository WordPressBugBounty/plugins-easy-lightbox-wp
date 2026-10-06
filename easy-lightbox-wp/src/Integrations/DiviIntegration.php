<?php
/**
 * Divi integration: a "ShapedGallery" module in the Divi Builder.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Integrations;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the Divi module.
 *
 * Divi's module API is a class you instantiate once, and it is only safe to do so
 * after `et_builder_ready` — before that `ET_Builder_Module` does not exist, and
 * after it Divi has already collected its module list. Instantiating twice is a
 * fatal, so the guard is a static flag rather than a `class_exists()` check: the
 * module class is PSR-4 autoloaded, so `class_exists()` on it would load it and
 * always answer true.
 *
 * Divi's Visual Builder renders a `vb_support => partial` module by asking the
 * server to run the shortcode over ajax, which is why the module reports itself as
 * editing in that context and the builder canvas gets the front-end bundles.
 */
final class DiviIntegration {

	/**
	 * Whether the module has already been constructed this request.
	 *
	 * @var bool
	 */
	private static bool $registered = false;

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'et_builder_ready', array( $this, 'register_module' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_builder_assets' ) );
	}

	/**
	 * Whether Divi's module API is loaded.
	 *
	 * Checked on the class rather than on `ET_BUILDER_VERSION`, because the Divi
	 * Builder ships as a theme AND as a plugin and only the class is common to both.
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return class_exists( '\ET_Builder_Module' );
	}

	/**
	 * Whether this request is the Visual Builder rendering, rather than a page view.
	 *
	 * @return bool
	 */
	public static function is_editing(): bool {
		if ( function_exists( 'et_core_is_fb_enabled' ) && et_core_is_fb_enabled() ) {
			return true;
		}

		// The Visual Builder's own ajax render. Read defensively — this is a context
		// probe, not form processing, so there is no nonce of ours to verify and the
		// value is only ever compared against a fixed string.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$action = isset( $_POST['action'] ) ? sanitize_key( wp_unslash( $_POST['action'] ) ) : '';

		return 'et_fb_ajax_render_shortcode' === $action;
	}

	/**
	 * Construct the module, once.
	 *
	 * @return void
	 */
	public function register_module(): void {
		if ( self::$registered || ! self::is_available() ) {
			return;
		}

		self::$registered = true;

		new DiviGalleryModule();
	}

	/**
	 * Put the gallery bundles on the Visual Builder canvas.
	 *
	 * @return void
	 */
	public function maybe_enqueue_builder_assets(): void {
		if ( self::is_available() && self::is_editing() ) {
			GalleryEmbed::enqueue_preview_assets();
		}
	}
}

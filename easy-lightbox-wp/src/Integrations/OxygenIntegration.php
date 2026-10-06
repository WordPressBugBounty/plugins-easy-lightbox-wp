<?php
/**
 * Oxygen Builder integration: a "ShapedGallery" element.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Integrations;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the Oxygen element.
 *
 * Oxygen's element base class (`OxyEl`) registers a subclass by CONSTRUCTING it, so
 * this is one `new` behind a "have we already" flag — the same shape the Divi
 * integration uses, for the same reason (the element class is autoloaded, so
 * `class_exists()` on it cannot be the guard).
 */
final class OxygenIntegration {

	/**
	 * Whether the element has already been constructed this request.
	 *
	 * @var bool
	 */
	private static bool $registered = false;

	/**
	 * Hook registration.
	 *
	 * Priority 11 on `init`: Oxygen declares `OxyEl` on `init` itself, and a
	 * same-priority callback would be a coin toss on registration order.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_element' ), 11 );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_builder_assets' ) );
	}

	/**
	 * Whether Oxygen's element API is loaded.
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return class_exists( '\OxyEl' );
	}

	/**
	 * Whether Oxygen is rendering for its own canvas.
	 *
	 * Two contexts, and both are needed: `SHOW_CT_BUILDER` is defined while the
	 * builder shell loads, and the builder then re-renders individual elements over
	 * ajax actions whose names begin `oxy_render_`.
	 *
	 * @return bool
	 */
	public static function is_editing(): bool {
		if ( defined( 'SHOW_CT_BUILDER' ) && SHOW_CT_BUILDER ) {
			return true;
		}

		// A context probe against a fixed prefix, not form processing — Oxygen owns
		// the nonce on its own ajax route.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$action = isset( $_GET['action'] ) ? sanitize_key( wp_unslash( $_GET['action'] ) ) : '';

		return 0 === strpos( $action, 'oxy_render_' );
	}

	/**
	 * Construct the element, once.
	 *
	 * @return void
	 */
	public function register_element(): void {
		if ( self::$registered || ! self::is_available() ) {
			return;
		}

		self::$registered = true;

		new OxygenGalleryElement();
	}

	/**
	 * Put the gallery bundles on the Oxygen canvas.
	 *
	 * @return void
	 */
	public function maybe_enqueue_builder_assets(): void {
		if ( self::is_available() && self::is_editing() ) {
			GalleryEmbed::enqueue_preview_assets();
		}
	}
}

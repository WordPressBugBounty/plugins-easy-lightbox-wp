<?php
/**
 * Bricks Builder integration: a "ShapedGallery" element.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Integrations;

use ShapedPlugin\ShapedGallery\Core\BrandMark;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the Bricks element.
 *
 * Bricks registers an element from a FILE PATH: it includes the file and takes the
 * class it declares. Handing it the PSR-4 path of the element class is safe in both
 * directions — Composer will not include a class that is already declared, and Bricks
 * will not re-include a file it has already required.
 */
final class BricksIntegration {

	/**
	 * Hook registration.
	 *
	 * Priority 11 on `init`: Bricks builds its element list on `init`, and a
	 * same-priority callback would be a coin toss on ordering.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_element' ), 11 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_icon_style' ) );
	}

	/**
	 * Whether Bricks' element API is loaded.
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return defined( 'BRICKS_VERSION' )
			&& class_exists( '\Bricks\Elements' )
			&& method_exists( '\Bricks\Elements', 'register_element' );
	}

	/**
	 * Whether Bricks is rendering for its own canvas.
	 *
	 * @return bool
	 */
	public static function is_editing(): bool {
		return function_exists( 'bricks_is_builder' ) && bricks_is_builder();
	}

	/**
	 * Register the element with Bricks.
	 *
	 * @return void
	 */
	public function register_element(): void {
		if ( ! self::is_available() ) {
			return;
		}

		\Bricks\Elements::register_element(
			SHAPED_GALLERY_SRC_PATH . 'Integrations/BricksGalleryElement.php',
			'shaped-gallery',
			BricksGalleryElement::class
		);
	}

	/**
	 * Paint the brand mark onto the element's panel icon — inside the builder only.
	 *
	 * Bricks' builder is a front-end request, so this rides `wp_enqueue_scripts`
	 * and bails everywhere but the builder: a visitor's page never gets the rule
	 * (§10).
	 *
	 * @return void
	 */
	public function enqueue_icon_style(): void {
		if ( ! self::is_editing() ) {
			return;
		}

		BrandMark::enqueue_icon_style();
	}
}

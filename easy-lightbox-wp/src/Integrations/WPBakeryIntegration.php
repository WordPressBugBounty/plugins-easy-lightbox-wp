<?php
/**
 * WPBakery Page Builder integration: a "ShapedGallery" element.
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
 * Maps the element and renders it.
 *
 * WPBakery elements ARE shortcodes: `vc_map()` only describes the panel, and the
 * element's own shortcode is what renders it on the front end. That splits the two
 * halves across two hooks with different lifetimes, and the split is deliberate:
 *
 * - The shortcode is registered on every request, because a saved page contains it
 *   and a visitor must be able to render it.
 * - `vc_map()` runs only where a panel can be drawn. It is the expensive half — the
 *   dropdown embeds the whole gallery list — and `vc_before_init` fires on the front
 *   end too, so mapping unconditionally would put a query on anonymous page views
 *   for a control nobody is looking at. {@see GalleryEmbed::choices()} is capability
 *   gated as a second line of the same defence.
 */
final class WPBakeryIntegration {

	/**
	 * The element's shortcode tag.
	 *
	 * A WPBakery implementation detail, not the plugin's public shortcode: it is
	 * written into pages built with WPBakery, so it is fixed, but `[shaped_gallery]`
	 * (CLAUDE.md §2) remains the one a user is ever given to copy.
	 *
	 * @var string
	 */
	const TAG = 'shaped_gallery_wpbakery';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_shortcode( self::TAG, array( $this, 'render' ) );
		add_action( 'vc_before_init', array( $this, 'map_element' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_builder_assets' ) );
	}

	/**
	 * Whether WPBakery is active.
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return defined( 'WPB_VC_VERSION' ) && function_exists( 'vc_map' );
	}

	/**
	 * Whether a panel is being drawn — the backend editor, or the front-end inline one.
	 *
	 * @return bool
	 */
	public static function is_editing(): bool {
		if ( function_exists( 'vc_is_inline' ) && vc_is_inline() ) {
			return true;
		}

		return is_admin();
	}

	/**
	 * Describe the element to WPBakery.
	 *
	 * @return void
	 */
	public function map_element(): void {
		if ( ! self::is_available() || ! self::is_editing() ) {
			return;
		}

		vc_map(
			array(
				'name'        => __( 'ShapedGallery', 'easy-lightbox-wp' ),
				'base'        => self::TAG,
				'description' => __( 'Display a saved ShapedGallery.', 'easy-lightbox-wp' ),
				'category'    => __( 'ShapedGallery', 'easy-lightbox-wp' ),
				'icon'        => BrandMark::url(),
				'params'      => array(
					array(
						'type'        => 'dropdown',
						'heading'     => __( 'Select Gallery', 'easy-lightbox-wp' ),
						'param_name'  => 'gallery_id',
						// WPBakery's dropdown is label => value, the opposite way round
						// from every other builder here, so the shared list is flipped
						// rather than built twice.
						'value'       => array_flip( GalleryEmbed::choices( __( 'Select a gallery…', 'easy-lightbox-wp' ) ) ),
						'std'         => '',
						'description' => __( 'Galleries are created and styled in ShapedGallery. Every placement of a gallery shows the same gallery, so editing it updates them all.', 'easy-lightbox-wp' ),
						'save_always' => true,
					),
				),
			)
		);
	}

	/**
	 * Render the element.
	 *
	 * @param array|string $atts    Shortcode attributes.
	 * @param string|null  $content Inner content (unused).
	 * @return string
	 */
	public function render( $atts, $content = null ): string {
		$atts = shortcode_atts( array( 'gallery_id' => 0 ), $atts, self::TAG );

		return GalleryEmbed::render( $atts['gallery_id'], self::is_editing() );
	}

	/**
	 * Put the gallery bundles on the front-end inline editor's canvas.
	 *
	 * The backend editor needs nothing: it draws WPBakery's own placeholders rather
	 * than the element's markup.
	 *
	 * @return void
	 */
	public function maybe_enqueue_builder_assets(): void {
		if ( self::is_available() && function_exists( 'vc_is_inline' ) && vc_is_inline() ) {
			GalleryEmbed::enqueue_preview_assets();
		}
	}
}

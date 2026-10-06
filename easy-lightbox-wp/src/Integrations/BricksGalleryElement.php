<?php
/**
 * The Bricks Builder element that places a saved gallery.
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
 * Picks a gallery and renders it through the shortcode.
 *
 * Bricks calls `enqueue_scripts()` for every element it renders, in the builder and
 * on the front end alike, which makes it the one builder whose canvas needs no
 * separate hook: the same method covers both.
 */
final class BricksGalleryElement extends \Bricks\Element {

	/**
	 * Panel category.
	 *
	 * @var string
	 */
	public $category = 'general';

	/**
	 * Element name — stored in page content, never change it.
	 *
	 * @var string
	 */
	public $name = 'shaped-gallery';

	/**
	 * Panel icon. Bricks only takes a class here, so the brand mark is painted onto it
	 * by {@see BrandMark::icon_css()}, enqueued by
	 * {@see BricksIntegration::enqueue_icon_style()} inside the builder alone.
	 *
	 * @var string
	 */
	public $icon = BrandMark::ICON_CLASS;

	/**
	 * Element label.
	 *
	 * @return string
	 */
	public function get_label() {
		return esc_html__( 'ShapedGallery', 'easy-lightbox-wp' );
	}

	/**
	 * Panel controls.
	 *
	 * @return void
	 */
	public function set_controls() {
		$this->controls['gallery_id'] = array(
			'type'        => 'select',
			'label'       => esc_html__( 'Select Gallery', 'easy-lightbox-wp' ),
			'options'     => GalleryEmbed::choices(),
			'placeholder' => esc_html__( 'Select a gallery…', 'easy-lightbox-wp' ),
			'clearable'   => true,
			'searchable'  => true,
			'inline'      => true,
			'description' => esc_html__( 'Galleries are created and styled in ShapedGallery. Every placement of a gallery shows the same gallery, so editing it updates them all.', 'easy-lightbox-wp' ),
		);
	}

	/**
	 * Assets this element needs, in the builder and on the front end alike.
	 *
	 * @return void
	 */
	public function enqueue_scripts() {
		wp_enqueue_style( 'shaped-gallery-style' );
		wp_enqueue_script( 'shaped-gallery-frontend' );
	}

	/**
	 * Render the element.
	 *
	 * @return void
	 */
	public function render() {
		$gallery = GalleryEmbed::render(
			$this->settings['gallery_id'] ?? 0,
			BricksIntegration::is_editing()
		);

		// `render_attributes( '_root' )` is Bricks' own already-escaped attribute
		// string for this element (its id, classes and any custom attributes); the
		// gallery markup is the block's own SSR output, which escapes late and
		// inline as it builds.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<div ' . $this->render_attributes( '_root' ) . '>' . $gallery . '</div>';
	}
}

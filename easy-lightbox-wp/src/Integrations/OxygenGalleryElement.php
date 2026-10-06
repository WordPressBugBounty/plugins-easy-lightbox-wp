<?php
/**
 * The Oxygen Builder element that places a saved gallery.
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
 * Oxygen's element API is `OxyEl`, whose methods are camelCase because Oxygen calls
 * them by those names — the one place in this plugin where PHP methods are not
 * `snake_case` (CLAUDE.md §2), because they are not ours to name.
 */
final class OxygenGalleryElement extends \OxyEl {

	/**
	 * Element name in Oxygen's Add panel.
	 *
	 * @return string
	 */
	public function name() {
		return __( 'ShapedGallery', 'easy-lightbox-wp' );
	}

	/**
	 * Element slug — stored in page content, never change it.
	 *
	 * @return string
	 */
	public function slug() {
		return 'shaped-gallery';
	}

	/**
	 * Panel icon.
	 *
	 * @return string
	 */
	public function icon() {
		return BrandMark::url();
	}

	/**
	 * The element's own tag.
	 *
	 * @return string
	 */
	public function tag() {
		return 'div';
	}

	/**
	 * Panel controls.
	 *
	 * `rebuildElementOnChange()` is what makes the canvas re-render on a new
	 * selection; without it Oxygen keeps showing the previously chosen gallery.
	 *
	 * @return void
	 */
	public function controls() {
		$this->addOptionControl(
			array(
				'type'    => 'dropdown',
				'name'    => esc_html__( 'Select Gallery', 'easy-lightbox-wp' ),
				'slug'    => 'gallery_id',
				'default' => '',
			)
		)->setValue( GalleryEmbed::choices( esc_html__( 'Select a gallery…', 'easy-lightbox-wp' ) ) )
			->rebuildElementOnChange();
	}

	/**
	 * Render the element.
	 *
	 * @param array  $options  Element options.
	 * @param array  $defaults Element defaults (unused).
	 * @param string $content  Inner content (unused).
	 * @return void
	 */
	public function render( $options, $defaults, $content ) {
		/*
		 * Resolved into a variable first, as BricksGalleryElement::render() already
		 * does. `WordPress.Security.EscapeOutput` flags every call in an `echo`
		 * statement that is not a known escaping function — `is_editing()` in the
		 * argument list included — and a trailing `phpcs:ignore` covers only its own
		 * line, so the annotation that used to sit on the `echo` never reached it and
		 * suppressed nothing.
		 */
		$markup = GalleryEmbed::render(
			$options['gallery_id'] ?? 0,
			OxygenIntegration::is_editing()
		);

		// Escaped inside GalleryEmbed::render(); the gallery markup itself is the
		// block's own SSR output, which escapes late and inline as it builds.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- see above.
		echo $markup;
	}
}

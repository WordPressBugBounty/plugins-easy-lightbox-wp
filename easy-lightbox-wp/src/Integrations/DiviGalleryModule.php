<?php
/**
 * The Divi Builder module that places a saved gallery.
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
 * One control, for {@see ElementorGalleryWidget}'s reason: how a gallery looks
 * belongs to the gallery, not to a placement of it.
 *
 * Divi identifies a module by its `$slug`, which is written into every page that
 * uses one — so `shaped_gallery` here is as fixed as the shortcode tag is.
 */
final class DiviGalleryModule extends \ET_Builder_Module {

	/**
	 * Module slug — stored in page content, never change it.
	 *
	 * @var string
	 */
	public $slug = 'shaped_gallery';

	/**
	 * Visual Builder support level.
	 *
	 * `partial`: the module has no React counterpart, so the Visual Builder renders
	 * it by asking the server for the real markup. That is the right level for a
	 * server-rendered module — `on` would promise a live JS preview that does not
	 * exist, and `off` would show the canvas a "not supported" placeholder.
	 *
	 * @var string
	 */
	public $vb_support = 'partial';

	/**
	 * Path to the module's panel icon.
	 *
	 * @var string
	 */
	public $icon_path = '';

	/**
	 * Divi's own init hook for a module.
	 *
	 * The panel section is declared here rather than as a property initializer,
	 * because its title is translatable and a property default cannot call a
	 * function. It has to be declared at all: a field carrying a `toggle_slug` Divi
	 * does not know is dropped from the panel silently, which reads as "this module
	 * has no settings".
	 *
	 * @return void
	 */
	public function init() {
		$this->name      = esc_html__( 'ShapedGallery', 'easy-lightbox-wp' );
		$this->icon_path = BrandMark::path();

		$this->settings_modal_toggles = array(
			'general' => array(
				'toggles' => array(
					'main_content' => array(
						'title'    => esc_html__( 'Gallery', 'easy-lightbox-wp' ),
						'priority' => 10,
					),
				),
			),
		);
	}

	/**
	 * Module fields.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public function get_fields() {
		return array(
			'gallery_id' => array(
				'label'           => esc_html__( 'Select Gallery', 'easy-lightbox-wp' ),
				'type'            => 'select',
				'option_category' => 'basic_option',
				'options'         => GalleryEmbed::choices( esc_html__( 'Select a gallery…', 'easy-lightbox-wp' ) ),
				'default'         => '',
				'description'     => esc_html__( 'Galleries are created and styled in ShapedGallery. Every placement of a gallery shows the same gallery, so editing it updates them all.', 'easy-lightbox-wp' ),
				'toggle_slug'     => 'main_content',
			),
		);
	}

	/**
	 * Render the module.
	 *
	 * @param array  $attrs       Module attributes (unused — Divi resolves them into `$this->props`).
	 * @param string $content     Inner content (unused — the module has none).
	 * @param string $render_slug Slug Divi is rendering as.
	 * @return string
	 */
	public function render( $attrs, $content = null, $render_slug = '' ) {
		return GalleryEmbed::render(
			$this->props['gallery_id'] ?? 0,
			DiviIntegration::is_editing()
		);
	}
}

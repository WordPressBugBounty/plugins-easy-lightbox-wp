<?php
/**
 * The Elementor widget that places a saved gallery.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Integrations;

use ShapedPlugin\ShapedGallery\Admin\GalleryEditor;
use ShapedPlugin\ShapedGallery\Admin\Menu;
use ShapedPlugin\ShapedGallery\Core\BrandMark;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Picks a gallery and renders it through the shortcode.
 *
 * Deliberately ONE control. Everything about how a gallery looks is edited on the
 * gallery itself, in the block editor, and is shared by every placement of it — a
 * second set of layout controls here would be a second editor for the same data
 * (CLAUDE.md §18), and the two would disagree the moment either changed.
 *
 * The class is loaded by Composer's autoloader, which means the parent must exist by
 * the time it is first referenced. {@see ElementorIntegration::register_widget()} is
 * the only thing that references it, from inside `elementor/widgets/register`.
 */
final class ElementorGalleryWidget extends \Elementor\Widget_Base {

	/**
	 * Widget slug, stored in every page that uses it — fixed.
	 *
	 * @return string
	 */
	public function get_name(): string {
		return 'shaped-gallery';
	}

	/**
	 * Widget title, shown in the panel.
	 *
	 * @return string
	 */
	public function get_title(): string {
		return __( 'ShapedGallery', 'easy-lightbox-wp' );
	}

	/**
	 * Panel icon.
	 *
	 * Elementor only takes a class here, so the brand mark is painted onto it by
	 * {@see BrandMark::icon_css()}, enqueued from
	 * {@see ElementorIntegration::hooks()} on the editor screen alone.
	 *
	 * @return string
	 */
	public function get_icon(): string {
		return BrandMark::ICON_CLASS;
	}

	/**
	 * Panel categories.
	 *
	 * @return array<int,string>
	 */
	public function get_categories(): array {
		return array( ElementorIntegration::CATEGORY );
	}

	/**
	 * Panel search keywords.
	 *
	 * @return array<int,string>
	 */
	public function get_keywords(): array {
		return array( 'gallery', 'images', 'photo', 'masonry', 'justified', 'shaped' );
	}

	/**
	 * Stylesheets this widget needs wherever Elementor renders it.
	 *
	 * @return array<int,string>
	 */
	public function get_style_depends(): array {
		return array( 'shaped-gallery-style' );
	}

	/**
	 * Scripts this widget needs wherever Elementor renders it.
	 *
	 * @return array<int,string>
	 */
	public function get_script_depends(): array {
		return array( 'shaped-gallery-frontend' );
	}

	/**
	 * Nothing here is worth caching in Elementor's static CSS/HTML: the gallery is
	 * rendered server-side per request and its own gates (visibility, password,
	 * random order) vary per visitor.
	 *
	 * @return bool
	 */
	protected function is_dynamic_content(): bool {
		return true;
	}

	/**
	 * Panel controls.
	 *
	 * @return void
	 */
	protected function register_controls(): void {
		$this->start_controls_section(
			'shaped_gallery_content',
			array(
				'label' => __( 'Gallery', 'easy-lightbox-wp' ),
				'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'gallery_id',
			array(
				'label'       => __( 'Select Gallery', 'easy-lightbox-wp' ),
				'type'        => \Elementor\Controls_Manager::SELECT2,
				'label_block' => true,
				'default'     => '',
				'options'     => GalleryEmbed::choices( __( 'Select a gallery…', 'easy-lightbox-wp' ) ),
				'description' => __( 'Galleries are created and styled in ShapedGallery. Every placement of a gallery shows the same gallery, so editing it updates them all.', 'easy-lightbox-wp' ),
			)
		);

		$this->add_control(
			'shaped_gallery_links',
			array(
				'type' => \Elementor\Controls_Manager::RAW_HTML,
				'raw'  => $this->manage_links(),
			)
		);

		$this->end_controls_section();
	}

	/**
	 * Render the widget.
	 *
	 * @return void
	 */
	protected function render(): void {
		$settings = $this->get_settings_for_display();

		// Escaped inside GalleryEmbed::render(); the gallery markup itself is the
		// block's own SSR output, which escapes late and inline as it builds.
		echo GalleryEmbed::render( $settings['gallery_id'] ?? 0, self::is_editing() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Whether this render is for Elementor's own canvas.
	 *
	 * @return bool
	 */
	private static function is_editing(): bool {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! isset( \Elementor\Plugin::$instance->editor ) ) {
			return false;
		}

		$editor = \Elementor\Plugin::$instance->editor;

		return method_exists( $editor, 'is_edit_mode' ) && $editor->is_edit_mode();
	}

	/**
	 * "Manage galleries" / "Add new gallery" links under the control.
	 *
	 * Both point at the plugin's own screens, so the round trip from "this gallery
	 * needs another image" back to the page being built is two clicks rather than a
	 * hunt through the admin menu.
	 *
	 * @return string
	 */
	private function manage_links(): string {
		// Both read the plugin's own helpers rather than re-spelling an admin URL:
		// `Menu::SLUG` is Manage Galleries, and the native editor's "add new" target
		// has one builder ({@see GalleryEditor::new_url()}).
		$manage = admin_url( 'admin.php?page=' . Menu::SLUG );
		$create = GalleryEditor::new_url();

		return sprintf(
			'<a href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a> &middot; <a href="%3$s" target="_blank" rel="noopener noreferrer">%4$s</a>',
			esc_url( $manage ),
			esc_html__( 'Manage galleries', 'easy-lightbox-wp' ),
			esc_url( $create ),
			esc_html__( 'Add new gallery', 'easy-lightbox-wp' )
		);
	}
}

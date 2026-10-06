<?php
/**
 * Elementor integration: a "ShapedGallery" widget in its own panel category.
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
 * Wires the widget into Elementor.
 *
 * Elementor is the one builder of the six with a real dependency API: a widget
 * declares its handles through `get_style_depends()` / `get_script_depends()` and
 * Elementor enqueues them wherever it renders the widget. That covers the front end
 * and most of the editor; {@see GalleryEmbed::enqueue_preview_assets()} on the
 * preview hook covers the rest — a widget dragged in mid-session is rendered by an
 * ajax round trip into a document whose enqueues are long finished.
 */
final class ElementorIntegration {

	/**
	 * The panel category the widget lives in.
	 *
	 * Its own, rather than Elementor's "General": the block editor already puts the
	 * gallery block in a `shaped-gallery` category (CLAUDE.md §2), and one plugin
	 * appearing under one name in both editors is what a user expects.
	 *
	 * @var string
	 */
	const CATEGORY = 'shaped-gallery';

	/**
	 * Hook registration.
	 *
	 * Every callback re-checks Elementor rather than trusting this ran late enough:
	 * these hooks only ever fire from inside Elementor, but `register_widget()` is
	 * the one place a fatal would land on a user's editor screen, so it is worth the
	 * one `did_action()`.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'elementor/elements/categories_registered', array( $this, 'register_category' ) );
		add_action( 'elementor/widgets/register', array( $this, 'register_widget' ) );
		add_action( 'elementor/preview/enqueue_scripts', array( GalleryEmbed::class, 'enqueue_preview_assets' ) );
		// The panel (not the preview iframe) is where the widget's icon is drawn.
		add_action( 'elementor/editor/after_enqueue_styles', array( BrandMark::class, 'enqueue_icon_style' ) );
	}

	/**
	 * Whether Elementor is loaded far enough to extend.
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return did_action( 'elementor/loaded' ) && class_exists( '\Elementor\Widget_Base' );
	}

	/**
	 * Add the plugin's own widget category to Elementor's panel.
	 *
	 * @param \Elementor\Elements_Manager $elements_manager Elementor's category registry.
	 * @return void
	 */
	public function register_category( $elements_manager ): void {
		if ( ! is_object( $elements_manager ) || ! method_exists( $elements_manager, 'add_category' ) ) {
			return;
		}

		$elements_manager->add_category(
			self::CATEGORY,
			array(
				'title' => __( 'ShapedGallery', 'easy-lightbox-wp' ),
				'icon'  => BrandMark::ICON_CLASS,
			)
		);
	}

	/**
	 * Register the widget.
	 *
	 * @param \Elementor\Widgets_Manager $widgets_manager Elementor's widget registry.
	 * @return void
	 */
	public function register_widget( $widgets_manager ): void {
		if ( ! self::is_available() || ! is_object( $widgets_manager ) || ! method_exists( $widgets_manager, 'register' ) ) {
			return;
		}

		$widgets_manager->register( new ElementorGalleryWidget() );
	}
}

<?php
/**
 * Beaver Builder integration: a "ShapedGallery" module.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Integrations;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the Beaver Builder module.
 *
 * Beaver's `FLBuilder::register_module()` takes the class name AND the whole field
 * definition, so — unlike every other builder here — the panel's contents are
 * declared at registration, on every request Beaver is active for. That is why
 * {@see GalleryEmbed::choices()} is capability gated: on an anonymous page view the
 * list is empty and no query runs, and Beaver only ever reads those options while
 * drawing its panel.
 */
final class BeaverIntegration {

	/**
	 * Hook registration.
	 *
	 * Priority 11 on `init`, after Beaver has declared `FLBuilderModule`.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register_module' ), 11 );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_builder_assets' ) );
	}

	/**
	 * Whether Beaver Builder's module API is loaded.
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return class_exists( '\FLBuilder' ) && class_exists( '\FLBuilderModule' );
	}

	/**
	 * Whether the Beaver Builder canvas is open on this request.
	 *
	 * @return bool
	 */
	public static function is_editing(): bool {
		return class_exists( '\FLBuilderModel' )
			&& method_exists( '\FLBuilderModel', 'is_builder_active' )
			&& \FLBuilderModel::is_builder_active();
	}

	/**
	 * Register the module and its one field.
	 *
	 * @return void
	 */
	public function register_module(): void {
		if ( ! self::is_available() ) {
			return;
		}

		\FLBuilder::register_module(
			BeaverGalleryModule::class,
			array(
				'general' => array(
					'title'    => __( 'General', 'easy-lightbox-wp' ),
					'sections' => array(
						'gallery' => array(
							'title'  => __( 'Gallery', 'easy-lightbox-wp' ),
							'fields' => array(
								'gallery_id' => array(
									'type'    => 'select',
									'label'   => __( 'Select Gallery', 'easy-lightbox-wp' ),
									'default' => '',
									'options' => GalleryEmbed::choices( __( 'Select a gallery…', 'easy-lightbox-wp' ) ),
									'help'    => __( 'Galleries are created and styled in ShapedGallery. Every placement of a gallery shows the same gallery, so editing it updates them all.', 'easy-lightbox-wp' ),
								),
							),
						),
					),
				),
			)
		);
	}

	/**
	 * Put the gallery bundles on the Beaver canvas.
	 *
	 * @return void
	 */
	public function maybe_enqueue_builder_assets(): void {
		if ( self::is_available() && self::is_editing() ) {
			GalleryEmbed::enqueue_preview_assets();
		}
	}
}

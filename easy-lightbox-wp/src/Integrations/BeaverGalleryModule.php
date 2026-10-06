<?php
/**
 * The Beaver Builder module that places a saved gallery.
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
 * Declares the module to Beaver Builder.
 *
 * Beaver is the only builder of the six that renders a module by INCLUDING a
 * template file rather than by calling a method, so this class holds no render logic
 * at all — `Beaver/includes/frontend.php` is the render, and `dir` below is what
 * points Beaver at it. Both the slug and that directory are therefore fixed: the
 * slug is written into every saved layout, and the path is how the layout finds its
 * own template again.
 */
final class BeaverGalleryModule extends \FLBuilderModule {

	/**
	 * Declare the module.
	 */
	public function __construct() {
		parent::__construct(
			array(
				'name'            => __( 'ShapedGallery', 'easy-lightbox-wp' ),
				'description'     => __( 'Display a saved ShapedGallery.', 'easy-lightbox-wp' ),
				'category'        => __( 'ShapedGallery', 'easy-lightbox-wp' ),
				// Passed explicitly rather than left to Beaver's default, which is the
				// class FILE's basename — a PSR-4 path-matched name, so the module
				// would be stored in every layout as `BeaverGalleryModule`.
				'slug'            => 'shaped-gallery',
				// Beaver resolves `includes/frontend.php` under this directory. Without
				// it the default is this file's own directory, where there is none.
				'dir'             => SHAPED_GALLERY_SRC_PATH . 'Integrations/Beaver/',
				'url'             => SHAPED_GALLERY_URL . 'src/Integrations/Beaver/',
				'editor_export'   => false,
				'enabled'         => true,
				// A new selection re-renders this module alone rather than the whole
				// page, which is what keeps the canvas responsive with a large gallery
				// in it.
				'partial_refresh' => true,
			)
		);

		// Assigned after construction rather than passed in. Beaver's `icon` param is
		// resolved against its OWN icon folder and then against the module's `dir`,
		// neither of which is where this plugin keeps shipped art — passing it would
		// have meant a second copy of the same SVG living under `src/`.
		$this->icon = BrandMark::svg();
	}
}

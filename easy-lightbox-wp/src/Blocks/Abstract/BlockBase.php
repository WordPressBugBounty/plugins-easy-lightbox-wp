<?php
/**
 * Abstract base for every ShapedGallery block.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Blocks\Abstract;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers a single block from its generated block.json (dist/block/<name>)
 * and binds a server render callback. Subclasses provide the directory name and
 * the render() implementation.
 */
abstract class BlockBase {

	/**
	 * Generated block.json directory name under dist/block/.
	 *
	 * @return string
	 */
	abstract protected function block_dir(): string;

	/**
	 * Server-side render callback.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Inner content.
	 * @return string
	 */
	abstract public function render( array $attributes, string $content = '' ): string;

	/**
	 * Shared asset handles passed to register_block_type().
	 *
	 * @return array<string,string>
	 */
	protected function asset_handles(): array {
		return array(
			'editor_script' => 'shaped-gallery-block',
			'editor_style'  => 'shaped-gallery-editor-style',
			'style'         => 'shaped-gallery-style',
			'view_script'   => 'shaped-gallery-frontend',
		);
	}

	/**
	 * Register the block type.
	 *
	 * @return void
	 */
	public function register(): void {
		$metadata_dir = SHAPED_GALLERY_DIST_PATH . 'block/' . $this->block_dir();
		if ( ! file_exists( $metadata_dir . '/block.json' ) ) {
			return;
		}

		$args = array_merge(
			$this->asset_handles(),
			array( 'render_callback' => array( $this, 'render' ) )
		);

		// Allow child classes to inject dynamic attributes to merge with block.json.
		if ( method_exists( $this, 'get_dynamic_attributes' ) ) {
			$args['attributes'] = $this->get_dynamic_attributes();
		}

		register_block_type(
			$metadata_dir,
			$args
		);
	}
}

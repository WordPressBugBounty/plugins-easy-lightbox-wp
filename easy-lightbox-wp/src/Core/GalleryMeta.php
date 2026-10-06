<?php
/**
 * Derived gallery meta, kept in step with the saved block content.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Core;

use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryAttributesFactory;
use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryOptions;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Recomputes `_shaped_gallery_layout` / `_shaped_gallery_item_count` from `post_content`
 * whenever a gallery is saved.
 *
 * The block attributes are the source of truth; these two meta values are a *cache*
 * that exists so the Manage Galleries screen can list dozens of galleries without
 * parsing dozens of block trees. Deriving them here — on `save_post`, from the content
 * that was actually stored — means every writer stays in sync automatically: the
 * native block editor (core's REST route), the plugin's own `/galleries` route,
 * `wp_insert_post()` in a migration, an import, a duplicate.
 *
 * The alternative, each writer remembering to update the meta itself, is what produced
 * a stale layout column the moment a second writer existed.
 */
class GalleryMeta {

	/**
	 * Meta key holding the gallery's layout id.
	 *
	 * @var string
	 */
	const LAYOUT_KEY = '_shaped_gallery_layout';

	/**
	 * Meta key holding the gallery's item count.
	 *
	 * @var string
	 */
	const COUNT_KEY = '_shaped_gallery_item_count';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'save_post_' . PostType::POST_TYPE, array( $this, 'sync' ), 20, 2 );
	}

	/**
	 * Recompute the cached meta for one gallery.
	 *
	 * @param int      $post_id Post id.
	 * @param \WP_Post $post    Post object.
	 * @return void
	 */
	public function sync( $post_id, $post ): void {
		$post_id = absint( $post_id );
		if ( ! $post_id || ! $post instanceof \WP_Post ) {
			return;
		}
		// Revisions and autosaves are separate posts; the parent's meta is authoritative.
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		$attributes = self::gallery_attributes( (string) $post->post_content );

		update_post_meta( $post_id, self::LAYOUT_KEY, self::layout_of( $attributes ) );
		update_post_meta( $post_id, self::COUNT_KEY, self::count_of( $attributes ) );
	}

	/**
	 * The gallery block's attributes inside serialized block markup.
	 *
	 * Returns the FIRST gallery block: a gallery post holds one (the inserter is
	 * narrowed to it), and the shortcode renders whatever `do_blocks()` finds, so the
	 * first block is what the list table is describing.
	 *
	 * @param string $content Serialized block markup.
	 * @return array<string,mixed> Raw block attributes (empty when none found).
	 */
	public static function gallery_attributes( string $content ): array {
		if ( '' === trim( $content ) || ! function_exists( 'parse_blocks' ) ) {
			return array();
		}

		foreach ( parse_blocks( $content ) as $block ) {
			if ( 'shaped-gallery/gallery' === ( $block['blockName'] ?? '' ) ) {
				return is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
			}
		}

		return array();
	}

	/**
	 * Layout id from block attributes, validated against the layout allow-list.
	 *
	 * A saved block usually omits attributes equal to their default, so an absent
	 * `layout` means "the default layout", not "no layout".
	 *
	 * @param array<string,mixed> $attributes Raw block attributes.
	 * @return string
	 */
	public static function layout_of( array $attributes ): string {
		$default = (string) ( GalleryAttributesFactory::defaults()['layout'] ?? 'justified' );
		$layout  = isset( $attributes['layout'] ) ? sanitize_key( (string) $attributes['layout'] ) : '';

		return in_array( $layout, GalleryOptions::LAYOUTS, true ) ? $layout : $default;
	}

	/**
	 * Item count from block attributes.
	 *
	 * @param array<string,mixed> $attributes Raw block attributes.
	 * @return int
	 */
	public static function count_of( array $attributes ): int {
		return is_array( $attributes['items'] ?? null ) ? count( $attributes['items'] ) : 0;
	}
}

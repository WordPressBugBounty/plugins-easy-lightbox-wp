<?php
/**
 * Frontend: shortcode + conditional asset loading.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Frontend;

use ShapedPlugin\ShapedGallery\Blocks\BlockTypes\Gallery;
use ShapedPlugin\ShapedGallery\Core\PostType;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the `[shaped_gallery id="X"]` shortcode — the reusable gallery's public
 * placement mechanism.
 *
 * Rendering reuses the block's `render_callback` via `do_blocks()`, so a shortcode and
 * an inline block produce byte-identical markup, CSS and runtime, and editing the
 * gallery updates every page that embeds it with no synchronisation step: the pages
 * store a reference (the id), never a copy of the gallery.
 */
class Frontend {

	/**
	 * The shortcode tag (fixed — stored in user content, see CLAUDE.md §2).
	 *
	 * @var string
	 */
	const TAG = 'shaped_gallery';

	/**
	 * Gallery ids currently being rendered, used as a recursion guard.
	 *
	 * A gallery whose own content contains its shortcode — trivially achievable by
	 * pasting the shortcode into a gallery's caption — would otherwise recurse
	 * until the request died with a memory error.
	 *
	 * @var array<int,bool>
	 */
	private static array $rendering = array();

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_shortcode( self::TAG, array( $this, 'render_shortcode' ) );
	}

	/**
	 * The permanent shortcode for a gallery.
	 *
	 * The ONE place the shortcode string is built. The editor sidebar, the Manage
	 * Galleries table, the REST responses and the "gallery saved" notice all read it,
	 * so the string a user copies can never drift from the tag actually registered.
	 * It depends on nothing but the post id, which is why it survives every edit and
	 * only dies with the gallery itself.
	 *
	 * @param int $gallery_id Gallery post id.
	 * @return string
	 */
	public static function shortcode_for( int $gallery_id ): string {
		return sprintf( '[%s id="%d"]', self::TAG, $gallery_id );
	}

	/**
	 * Render the [shaped_gallery id="X"] shortcode.
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @return string
	 */
	public function render_shortcode( $atts ): string {
		$atts = shortcode_atts( array( 'id' => 0 ), $atts, self::TAG );
		$id   = absint( $atts['id'] );
		if ( ! $id ) {
			return '';
		}

		$post = get_post( $id );
		if ( ! $post || PostType::POST_TYPE !== $post->post_type ) {
			return '';
		}

		// A trashed gallery renders for nobody — it is deleted as far as the site is
		// concerned. A draft renders only for someone who could edit it, so an author
		// previewing a page sees the gallery they are still working on.
		if ( 'trash' === $post->post_status ) {
			return '';
		}
		if ( 'publish' !== $post->post_status && ! current_user_can( 'edit_post', $id ) ) {
			return '';
		}

		if ( isset( self::$rendering[ $id ] ) ) {
			return '';
		}

		self::$rendering[ $id ] = true;

		try {
			// Tell the block which gallery post it is being rendered for, so it can
			// fall back to a correct `galleryId` when its own stored attribute is
			// unset (the CPT's post_content was written before the post had an id).
			Gallery::push_render_context_id( $id );

			// do_blocks() runs the same shaped-gallery/gallery render_callback that
			// the block editor uses — single render path, guaranteed parity. It also
			// enqueues the gallery's assets from inside render(), so a page carrying
			// no shortcode loads none of them.
			$html = do_blocks( $post->post_content );
		} finally {
			Gallery::pop_render_context_id();
			unset( self::$rendering[ $id ] );
		}

		/**
		 * Filters the rendered output of one gallery shortcode.
		 *
		 * @since 1.0.0
		 *
		 * @param string   $html    Rendered gallery markup.
		 * @param int      $id      Gallery post id.
		 * @param \WP_Post $gallery The gallery post.
		 */
		return (string) apply_filters( 'shaped_gallery_shortcode_output', $html, $id, $post );
	}
}

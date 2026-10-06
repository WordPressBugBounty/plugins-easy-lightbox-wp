<?php
/**
 * The ShapedGallery block.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Blocks\BlockTypes;

use ShapedPlugin\ShapedGallery\Blocks\Abstract\BlockBase;
use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryOptions;
use ShapedPlugin\ShapedGallery\Frontend\GalleryPassword;
use ShapedPlugin\ShapedGallery\Frontend\GalleryVisibility;
use ShapedPlugin\ShapedGallery\Render\LayoutRenderer;
use ShapedPlugin\ShapedGallery\Core\DebugPerformance;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers `shaped-gallery/gallery` and renders it server-side.
 */
class Gallery extends BlockBase {

	/**
	 * Stack of gallery CPT ids for the render(s) currently in progress
	 * ({@see \ShapedPlugin\ShapedGallery\Frontend\Frontend::render_shortcode()}),
	 * read as a fallback below when the block's own `galleryId` attribute is unset.
	 *
	 * The gallery CPT is not publicly queryable (`public => false`), so every
	 * front-end render reaches this class through the shortcode (page builders
	 * delegate to it too) — the caller always knows which gallery post it is
	 * serving even though the block's own serialized attributes, being the CPT's
	 * literal `post_content`, were written before that post had an id to record.
	 *
	 * A stack, not a single id, because a gallery's caption can itself contain
	 * `[shaped_gallery id="…"]` (the same self-embed the class doc for
	 * `Frontend::$rendering` already guards against for the id-equal case) — the
	 * inner render must not leave the outer one thinking it has no context once it
	 * returns.
	 *
	 * @var int[]
	 */
	private static array $render_context_stack = array();

	/**
	 * Push the gallery post id the next nested {@see render()} call should fall
	 * back to.
	 *
	 * @param int $id Gallery CPT id.
	 * @return void
	 */
	public static function push_render_context_id( int $id ): void {
		self::$render_context_stack[] = $id;
	}

	/**
	 * Pop the id pushed by the matching {@see push_render_context_id()} call.
	 *
	 * @return void
	 */
	public static function pop_render_context_id(): void {
		array_pop( self::$render_context_stack );
	}

	/**
	 * The gallery post id the render currently in progress should fall back to.
	 *
	 * @return int
	 */
	private static function current_render_context_id(): int {
		return self::$render_context_stack ? (int) end( self::$render_context_stack ) : 0;
	}

	/**
	 * {@inheritDoc}
	 */
	protected function block_dir(): string {
		return 'gallery';
	}

	/**
	 * Render the gallery block.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Inner content (unused — fully dynamic).
	 * @return string
	 */
	public function render( array $attributes, string $content = '' ): string {
		if ( empty( $attributes['galleryId'] ) && self::current_render_context_id() > 0 ) {
			$attributes['galleryId'] = self::current_render_context_id();
		}

		$attrs    = GalleryOptions::normalize( $attributes );
		$advanced = $attrs['advanced'] ?? array();

		/*
		 * The visibility gate. The DECISION is GalleryVisibility's, shared with the
		 * public /gallery-page endpoint so one gallery cannot be gated on one render
		 * path and open on the other (it was, until that class existed). What stays
		 * here is only the RESPONSE, because the two refusals are not the same thing:
		 *
		 * - Private is not "locked", it is hidden. A visitor who cannot read private
		 *   content is told nothing at all, exactly as WordPress treats a private post.
		 * - Password draws a form, because the point is to invite the visitor to fill
		 *   it in. This method is a READER of that verdict and nothing more —
		 *   verifying a submission and issuing the unlock cookie happen in
		 *   Frontend\GalleryPassword on `template_redirect`, because `render()` runs
		 *   during `the_content`, by which point the response headers are long gone and
		 *   `setcookie()` is a no-op with a warning attached.
		 */
		$blocked = GalleryVisibility::blocked_by( $attrs );

		if ( GalleryVisibility::PRIVATE_MODE === $blocked ) {
			return self::gated( $attrs, 'private' );
		}

		if ( GalleryVisibility::PASSWORD_MODE === $blocked ) {
			// The challenge replaces the gallery, so the gallery's own enqueue below
			// never runs — but the form still needs the stylesheet that draws it.
			if ( ! is_admin() ) {
				wp_enqueue_style( 'shaped-gallery-style' );
			}

			// challenge() rather than a form built here: it is the half that also
			// refreshes the unlock token the submit handler verifies against, and it
			// returns the same verdict blocked_by() just read.
			return (string) GalleryPassword::challenge( $attrs ) . self::gated( $attrs, 'password-form' );
		}

		/*
		 * The one measured span. `get_num_queries()` and the memory reading are taken
		 * either side of the render alone, not of this whole method: the gates above are
		 * capability checks, and the enqueues below are registration, so folding either
		 * in would report time this gallery did not spend on itself.
		 */
		$started  = microtime( true );
		$queries  = function_exists( 'get_num_queries' ) ? get_num_queries() : 0;
		// `false`, not `true`: the real-allocation figure moves in multi-megabyte chunks,
		// so the delta across one render is almost always exactly 0 — a number that reads
		// as "this cost nothing" rather than "this was not measurable".
		$memory   = memory_get_usage( false );
		$renderer = new LayoutRenderer();
		$markup   = $renderer->render( $attributes );
		$elapsed  = ( microtime( true ) - $started ) * 1000;
		$queries  = ( function_exists( 'get_num_queries' ) ? get_num_queries() : 0 ) - $queries;
		$memory   = memory_get_usage( false ) - $memory;
		$stats    = $renderer->stats();

		if ( '' === $markup ) {
			// An empty render is the question support gets asked most ("my gallery
			// vanished"), so it is worth a line of its own rather than silence.
			return self::gated( $attrs, 'empty' );
		}

		// Ensure the reflow script + gallery styles load for this render.
		$bundles = array();
		if ( ! is_admin() ) {
			wp_enqueue_script( 'shaped-gallery-frontend' );
			wp_enqueue_style( 'shaped-gallery-style' );
			$bundles[] = 'frontend';

			// Lightbox: load the viewer bundle ONLY when a click here actually
			// opens one. The same predicate gates the trigger badge and its
			// styling, so the bundle can never be missing for a gallery that needs it
			// — nor present for one that does not. Without it every tile stays what
			// the markup already made it: a link to the full-size file.
			if ( GalleryOptions::lightbox_active( $attrs ) ) {
				wp_enqueue_script( 'shaped-gallery-lightbox' );
				wp_enqueue_style( 'shaped-gallery-lightbox-style' );
				$bundles[] = 'lightbox';
			}

		}

		$classes = array( 'shaped-gallery-block' );

		// Custom CSS Class(es).
		if ( ! empty( $advanced['customCssClass'] ) ) {
			$custom_classes = preg_split( '/\s+/', trim( $advanced['customCssClass'] ) );
			foreach ( $custom_classes as $class ) {
				$sanitized = sanitize_html_class( $class );
				if ( ! empty( $sanitized ) ) {
					$classes[] = $sanitized;
				}
			}
		}

		// Responsive Visibility (Advanced → Visibility → Hide on <device>). The map
		// lives on GalleryOptions so the class names have ONE spelling shared with the
		// stylesheet that hides them and the editor mirror that reports them (§18).
		$classes = array_merge( $classes, GalleryOptions::hidden_classes( $attrs ) );

		// Custom CSS ID.
		$id_attr = '';
		if ( ! empty( $advanced['customCssId'] ) ) {
			$id_attr = sprintf( 'id="%s"', esc_attr( $advanced['customCssId'] ) );
		}

		$class_string = implode( ' ', $classes );
		$wrapper      = function_exists( 'get_block_wrapper_attributes' )
			? get_block_wrapper_attributes( array( 'class' => $class_string ) )
			: sprintf( 'class="%s"', esc_attr( $class_string ) );

		/*
		 * The debug comment sits OUTSIDE the block wrapper, after it: inside, a theme or
		 * a later filter walking the wrapper's children would have to step over it, and
		 * `:first-child` / `:last-child` in anyone's CSS would start matching differently
		 * on an administrator's view of the page only. Empty string when the toggle is
		 * off, so the markup below is byte-identical to before the feature existed.
		 */
		$facts = array(
			'gallery'   => $attrs['galleryId'] ?? 0,
			'layout'    => $attrs['layout'] ?? '',
			// Three counts, because they answer three different questions: what the
			// block stores, what survived resolving and filtering, and what this
			// response actually emitted.
			'stored'    => count( $attrs['items'] ?? array() ),
			'items'     => $stats['total'] ?? 0,
			'rendered'  => $stats['rendered'] ?? 0,
			'paginated' => $stats['paginated'] ?? 'no',
			'ms'        => round( $elapsed, 2 ),
			'queries'   => $queries,
			'memory'    => size_format( max( 0, $memory ) ),
			'bundles'   => $bundles,
			'order'     => $attrs['order'] ?? 'default',
			// Reported because "why are my images blurry on a Mac" is answered by this
			// line and nothing else on the page shows it.
			'retina'    => GalleryOptions::retina_active() ? 'on' : 'off',
		);

		$debug = DebugPerformance::comment( $facts );

		// The console payload gets a string for `bundles` so console.table() renders it
		// in one cell instead of nesting an array inside a row.
		DebugPerformance::note( array_merge( $facts, array( 'bundles' => implode( ' ', $bundles ) ) ) );

		if ( ! empty( $id_attr ) ) {
			return sprintf( '<div %s %s>%s</div>%s', $id_attr, $wrapper, $markup, $debug );
		}
		return sprintf( '<div %s>%s</div>%s', $wrapper, $markup, $debug );
	}

	/**
	 * One line for a gallery that produced no gallery, and the reason why.
	 *
	 * "My gallery vanished" is the most common support question this plugin can be
	 * asked, and every path that can cause it — private visibility, a password
	 * prompt, an empty item list — otherwise returns an empty string that says
	 * nothing. With the toggle on, each says which one it was.
	 *
	 * Returns '' when the toggle is off, so a gated gallery is byte-identical to before.
	 *
	 * @param array<string,mixed> $attrs  Normalized attributes, or an empty array when
	 *                                    the gate fired before normalization.
	 * @param string              $reason Which gate closed.
	 * @return string
	 */
	private static function gated( array $attrs, string $reason ): string {
		DebugPerformance::note(
			array(
				'gallery' => $attrs['galleryId'] ?? 0,
				'gated'   => $reason,
			)
		);

		return DebugPerformance::comment(
			array(
				'gallery' => $attrs['galleryId'] ?? 0,
				'layout'  => $attrs['layout'] ?? '',
				'gated'   => $reason,
			)
		);
	}

	/**
	 * Provide dynamic attributes from the factory.
	 *
	 * @return array
	 */
	public function get_dynamic_attributes(): array {
		return \ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryAttributesFactory::get_all_attributes();
	}
}

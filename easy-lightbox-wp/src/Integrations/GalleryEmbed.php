<?php
/**
 * The one thing every page-builder integration actually does: turn a chosen gallery
 * id into gallery markup, and offer the list of galleries to choose from.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Integrations;

use ShapedPlugin\ShapedGallery\Core\PostType;
use ShapedPlugin\ShapedGallery\Frontend\Frontend;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Shared by all six builder integrations.
 *
 * Every one of them is the same three decisions wearing a different builder's API:
 * offer a list of galleries, render the chosen one, and say something useful in the
 * builder's canvas when nothing is chosen. Those three live here once, so a builder
 * class holds only the glue its own API forces — which is what keeps six
 * integrations from becoming six half-divergent renderers.
 *
 * Rendering goes through the SHORTCODE, never through `LayoutRenderer`. That is the
 * pillar (CLAUDE.md §1): the shortcode calls `do_blocks()` on the gallery's stored
 * content, which runs the block's own `render_callback` — so a gallery placed with
 * Elementor, with Divi or with the block itself produces byte-identical markup, CSS
 * and runtime, and the shortcode's own guards (trashed, draft-for-strangers, a
 * gallery embedding itself) apply here for free rather than being restated six times.
 * The tag is never spelled out either — {@see Frontend::shortcode_for()} builds it.
 */
final class GalleryEmbed {

	/**
	 * Wrapper class placed around every builder-rendered gallery.
	 *
	 * A marker, not a style hook: it gives support and a site's own CSS one selector
	 * for "this gallery came from a page builder", and it carries the gallery id for
	 * the same reason.
	 *
	 * @var string
	 */
	const WRAPPER_CLASS = 'sp-shaped-gallery-builder';

	/**
	 * Most galleries a builder dropdown will list.
	 *
	 * A dropdown is not a browse UI — past a few hundred entries it stops being
	 * usable and starts being a page-weight problem, since every builder embeds the
	 * whole list in its editor payload. Capped rather than paged because no builder's
	 * select control can page.
	 *
	 * @var int
	 */
	const MAX_CHOICES = 300;

	/**
	 * Memoized choice list, so several builders (or one builder asking twice) share
	 * one query per request.
	 *
	 * @var array<int|string,string>|null
	 */
	private static ?array $choices = null;

	/**
	 * The galleries a builder control can offer, as `id => label`.
	 *
	 * Gated on `edit_posts`, which every page builder already requires to open at
	 * all. That is a privacy guard — gallery titles are not public data — and it is
	 * also what keeps the query off an anonymous front-end request: two of the six
	 * builders (WPBakery, Beaver) can only declare their control's options at
	 * registration time, which happens on every request their builder is active for.
	 * The gate is re-read on every call rather than baked into the memo; see below.
	 *
	 * Draft galleries are included: a builder is where a page is being BUILT, and the
	 * shortcode already shows a draft only to someone who could edit it.
	 *
	 * @param string $placeholder Label for the empty first entry. Omit for no entry.
	 * @return array<int|string,string> Gallery id => title, newest first.
	 */
	public static function choices( string $placeholder = '' ): array {
		/*
		 * Deliberately outside the memo, and checked on every call. A caller that asks
		 * before the current user is resolved would otherwise cache "nobody may see
		 * this" for the rest of the request, and a builder that then asks again — as
		 * Elementor does, since it builds a widget's controls lazily on first access —
		 * would be handed an empty dropdown with no way to refill it.
		 */
		if ( ! current_user_can( 'edit_posts' ) ) {
			return array();
		}

		if ( null === self::$choices ) {
			self::$choices = self::query_choices();
		}

		if ( '' === $placeholder ) {
			return self::$choices;
		}

		return array( '' => $placeholder ) + self::$choices;
	}

	/**
	 * Run the one query behind {@see choices()}.
	 *
	 * @return array<int,string>
	 */
	private static function query_choices(): array {
		$query = new \WP_Query(
			array(
				'post_type'              => PostType::POST_TYPE,
				'post_status'            => array( 'publish', 'draft' ),
				'posts_per_page'         => self::MAX_CHOICES,
				'orderby'                => 'date',
				'order'                  => 'DESC',
				'fields'                 => 'ids',
				// Nothing here reads a total, a term or a meta value, so none of the
				// three companion queries `WP_Query` would otherwise run is wanted.
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		$choices = array();
		foreach ( $query->posts as $gallery_id ) {
			$gallery_id = (int) $gallery_id;
			// `fields => 'ids'` still primes the post cache, so this reads from it.
			$title = trim( (string) get_the_title( $gallery_id ) );

			$choices[ $gallery_id ] = '' !== $title
				? $title
				/* translators: %d: gallery post id. */
				: sprintf( __( 'Gallery #%d', 'easy-lightbox-wp' ), $gallery_id );
		}

		return self::disambiguate( $choices );
	}

	/**
	 * Suffix repeated titles with their gallery id.
	 *
	 * Gallery titles are not unique, and two entries reading "Homepage" in a dropdown
	 * are a coin toss. It also stops one of them DISAPPEARING: WPBakery's dropdown is
	 * keyed by label, so identical labels collapse into a single option there — the
	 * one builder where an ambiguous list is a lost gallery rather than a confusing
	 * one.
	 *
	 * Every occurrence is suffixed, not just the second: labelling one "Homepage" and
	 * the other "Homepage (#12)" implies the first is somehow the canonical one.
	 *
	 * @param array<int,string> $choices Gallery id => title.
	 * @return array<int,string>
	 */
	private static function disambiguate( array $choices ): array {
		$counts = array_count_values( $choices );

		foreach ( $choices as $gallery_id => $title ) {
			if ( ( $counts[ $title ] ?? 0 ) < 2 ) {
				continue;
			}

			$choices[ $gallery_id ] = sprintf(
				/* translators: 1: gallery title. 2: gallery post id. */
				__( '%1$s (#%2$d)', 'easy-lightbox-wp' ),
				$title,
				$gallery_id
			);
		}

		return $choices;
	}

	/**
	 * Render one gallery for a page builder.
	 *
	 * @param mixed $gallery_id Chosen gallery id, in whatever shape the builder stored it.
	 * @param bool  $editing    Whether this render is for the builder's own canvas. Only
	 *                          then is a problem worth describing: on a visitor's page a
	 *                          missing gallery is silence, exactly as the block and the
	 *                          shortcode already behave.
	 * @return string
	 */
	public static function render( $gallery_id, bool $editing = false ): string {
		$gallery_id = absint( $gallery_id );

		if ( ! $gallery_id ) {
			return $editing ? self::notice( __( 'Select a gallery to display here.', 'easy-lightbox-wp' ) ) : '';
		}

		$html = do_shortcode( Frontend::shortcode_for( $gallery_id ) );

		if ( $editing ) {
			self::suppress_lightbox();
		}

		if ( '' === trim( $html ) ) {
			return $editing
				? self::notice( __( 'This gallery is empty, unavailable, or has been deleted.', 'easy-lightbox-wp' ) )
				: '';
		}

		return sprintf(
			'<div class="%1$s" data-shaped-gallery-id="%2$d">%3$s</div>',
			esc_attr( self::WRAPPER_CLASS ),
			$gallery_id,
			$html
		);
	}

	/**
	 * The placeholder a builder canvas shows in place of a gallery.
	 *
	 * Styled inline rather than from a stylesheet on purpose: it exists only inside a
	 * builder's editor, and shipping a stylesheet for it would mean registering,
	 * enqueueing and cache-busting an asset for six editors that would each need
	 * their own hook to load it. One `<p>` with a `style` attribute costs nothing and
	 * cannot be missing.
	 *
	 * @param string $message Already-translated message.
	 * @return string
	 */
	private static function notice( string $message ): string {
		return sprintf(
			'<p class="%1$s__notice" style="margin:0;padding:20px;border:2px dashed #d5d8dc;border-radius:4px;color:#7a7f87;font-size:14px;text-align:center;">%2$s</p>',
			esc_attr( self::WRAPPER_CLASS ),
			esc_html( $message )
		);
	}

	/**
	 * Drop the lightbox viewer from a builder canvas.
	 *
	 * Every builder canvas except WPBakery's backend editor is a FRONT-END request, so
	 * `Gallery::render()` sees `! is_admin()` and enqueues exactly what the gallery
	 * needs — the viewer included, when the gallery's click action opens one. That is
	 * right on a page and wrong in a canvas: there, a click on a tile means "select
	 * this widget", and the viewer would open over the editor and swallow it.
	 *
	 * Dequeued after the render rather than prevented before it, because the decision
	 * belongs to `Gallery::render()`'s own predicate and there is no hook between the
	 * two. Editing-only, so a visitor's page is untouched — and it is the same
	 * exclusion {@see enqueue_preview_assets()} makes, applied to the path that
	 * enqueues on its own.
	 *
	 * @return void
	 */
	private static function suppress_lightbox(): void {
		wp_dequeue_script( 'shaped-gallery-lightbox' );
		wp_dequeue_style( 'shaped-gallery-lightbox-style' );
	}

	/**
	 * Put the gallery front-end bundles on a builder's EDITOR canvas.
	 *
	 * On a real page view nothing here is needed: the builders all render their
	 * content during the front-end request, so `Gallery::render()` enqueues exactly
	 * the bundles that gallery needs, as it does for the block and the shortcode. A
	 * builder canvas is the one place that breaks down — a widget dropped in is
	 * rendered by an `admin-ajax` round trip and injected into a page whose enqueues
	 * already happened, so it would arrive unstyled until the editor was reloaded.
	 *
	 * Registered handles only, and only ever from a builder-editor hook: this is not
	 * a route by which a front-end page can pick up an asset it did not ask for.
	 *
	 * The lightbox bundle is deliberately NOT among them — the one bundle whose
	 * presence changes what the editor DOES rather than how it looks. A gallery that
	 * asks for it on its own is handled by {@see suppress_lightbox()}; this is the
	 * other half of one rule.
	 *
	 * @return void
	 */
	public static function enqueue_preview_assets(): void {
		wp_enqueue_style( 'shaped-gallery-style' );
		wp_enqueue_script( 'shaped-gallery-frontend' );
	}
}

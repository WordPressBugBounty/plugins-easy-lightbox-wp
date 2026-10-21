<?php
/**
 * Server-side layout renderer.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render;

use ShapedPlugin\ShapedGallery\Frontend\GalleryVisibility;
use ShapedPlugin\ShapedGallery\Providers\Provider_Registry;
use ShapedPlugin\ShapedGallery\Render\Css\StyleEngine;
use ShapedPlugin\ShapedGallery\Render\Css\Contributors\GeometryVars;
use ShapedPlugin\ShapedGallery\Core\GalleryCache;
use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryOptions;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Turns gallery attributes + a MediaItem[] into semantic SSR markup.
 *
 * Grid is pure CSS Grid. Justified and Masonry emit the same markup plus
 * intrinsic data-w/data-h so the lightweight frontend script can compute final
 * geometry. data-w/data-h are emitted for EVERY layout so switching layouts
 * never needs a server round-trip.
 */
class LayoutRenderer {

	/**
	 * Hidden SVG duotone filters collected while rendering items, keyed by id so
	 * a palette shared by several images is emitted once. Emitted before the
	 * gallery markup; the <img>s reference them via `filter: url(#id)`.
	 *
	 * @var array<string,string>
	 */
	private array $duotone_svgs = array();

	/**
	 * Dynamic-CSS engine — turns attributes into the container's inline custom
	 * properties via its ordered StyleContributor list. Markup stays this
	 * class's job; styling is delegated here.
	 *
	 * @var StyleEngine
	 */
	private StyleEngine $style_engine;

	/**
	 * @param StyleEngine|null $style_engine Style engine; defaults to the built-in
	 *                                       contributor set. Injectable for tests.
	 */
	public function __construct( ?StyleEngine $style_engine = null ) {
		$this->style_engine = $style_engine ?? new StyleEngine();
	}

	/**
	 * What the last render() actually produced, for Debug Performance.
	 *
	 * Reporting what you just did is not a second responsibility — the alternative was
	 * having `Gallery::render()` count figures out of the finished HTML, which is a
	 * parser guessing at a number this method already holds. Debug-only: nothing in the
	 * render path reads it.
	 *
	 * @var array<string,mixed>
	 */
	private array $stats = array();

	/**
	 * Figures from the last render.
	 *
	 * @return array<string,mixed> `total`, `rendered`, `paginated`.
	 */
	public function stats(): array {
		return $this->stats;
	}

	/**
	 * Render the gallery.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public function render( array $attributes ): string {
		$attrs = GalleryOptions::normalize( $attributes );
		// The stored count, not a resolved one: `provider_items()` is 1:1 with the
		// stored list (a deleted attachment falls back to its stored row rather
		// than being dropped), so counting the stored array is exact and free —
		// no provider round trip just to know how many items there are.
		$total = count( $attrs['items'] );

		if ( 0 === $total ) {
			return '';
		}

		// Random order's permutation seed for THIS page load. Published as
		// `data-ap-seed` below and echoed back by every window request, so one visit
		// sees one deck however many windows it pulls (see ItemOrder).
		$seed = 'random' === $attrs['order'] ? random_int( 1, 0x7FFFFFFF ) : 0;

		$this->duotone_svgs = array();

		// Ajax Pagination: at SSR render only the first window (desktop showPerView)
		// when more items exist than fit one view; the remainder load on demand via
		// the /gallery-page REST route (through the SAME render_item path). The full
		// render context is stashed in a short-lived, content-hashed transient so the
		// endpoint can re-render a window WITHOUT trusting client-supplied attributes
		// — universal for inline blocks and saved galleries alike. `showPerView`
		// sizes both the first window and every appended one.
		$ajax_active = GalleryOptions::ajax_active( $attrs );
		$per_view    = $ajax_active
			? GalleryOptions::responsive_int( $attrs['ajaxPagination']['showPerView'] ?? null, 'desktop', 15 )
			: $total;
		$paginated   = $ajax_active && $total > $per_view;
		// Resolve only what this window shows — see resolve_window() for why
		// resolving the whole gallery to render 15 tiles is not this method's cost
		// to pay, on the first paint or on any Ajax window after it.
		$window = $this->resolve_window( $attrs, $seed, 0, $paginated ? $per_view : $total );

		// `$total` is the stored count (exact — see the comment above); `$window` is
		// what this response actually emits.
		$this->stats = array(
			'total'     => $total,
			'rendered'  => count( $window ),
			'paginated' => $paginated ? 'yes' : 'no',
		);

		$ctx_key = '';
		if ( $paginated ) {
			$ctx_key = md5( (string) wp_json_encode( $attrs ) );
			set_transient(
				GalleryCache::ctx_name( $ctx_key ),
				$attrs,
				/**
				 * Filter the render-context transient's lifetime for Ajax pagination.
				 *
				 * Settings → Advanced Controls → Clear Cache Timeout owns the default
				 * (24h, i.e. the DAY_IN_SECONDS this used to hardcode); this still wins,
				 * so an integration can pin one gallery.
				 *
				 * @since 1.0.0
				 *
				 * @param int                  $ttl   Lifetime in seconds.
				 * @param array<string,mixed>  $attrs Normalized block attributes.
				 */
				(int) apply_filters( 'shaped_gallery_ajax_context_ttl', GalleryCache::ttl(), $attrs )
			);
		}

		$layout  = $attrs['layout'];
		$unique  = $attrs['uniqueId'] ? sanitize_html_class( $attrs['uniqueId'] ) : wp_unique_id( 'sp-shaped-gallery-' );
		$classes = trim( 'sp-shaped-gallery sp-shaped-gallery--' . $layout . ' ' . $unique );

		// Image & Video Settings — the per-item media behaviour CSS keys on: the
		// loading placeholder and the video play-icon reveal. Each value is
		// allow-listed / cast in GalleryOptions, and the preloader gate is the shared
		// predicate the styling + runtime read too, so markup can never disagree
		// with it.
		if ( GalleryOptions::preloader_active( $attrs ) ) {
			$classes .= ' sp-shaped-gallery--preloader';
		}
		if ( ! empty( $attrs['imageVideo']['displayIconOnHover'] ) ) {
			$classes .= ' sp-shaped-gallery--play-hover';
		}

		$container_attrs = array(
			'class'        => $classes,
			'data-layout'  => $layout,
			// Effective (mode-resolved) target row height — auto ignores the stored
			// custom value so the frontend matches the editor preview exactly.
			'data-row'     => GeometryVars::effective_row_height( $attrs ),
			'data-rowmode' => $attrs['rowHeightMode'],
			'data-click'   => $attrs['clickAction'],
			// Responsive scalars ship as JSON (like data-cols) so the measured.
			'data-cols'    => wp_json_encode( $attrs['columns'] ),
			'data-gap-h'   => wp_json_encode( $attrs['horizontalGap'] ),
			'data-gap-v'   => wp_json_encode( $attrs['verticalGap'] ),
			'style'        => $this->style_engine->container_style( $attrs ),
		);

		// Video Play Mode — what the runtime does with a click on a video's play
		// button: swap a playing <video> into the tile (inline), or open it in the
		// video popup (popup). Every video carries the same button either way.
		$container_attrs['data-video'] = GalleryOptions::video_popup( $attrs ) ? 'popup' : 'inline';

		// AutoPlay governs the popup too: the popup's player starts on its own
		// unless this opt-out is present (absence = the `true` default, so the flag
		// only reaches the DOM when it changes behaviour).
		if ( empty( $attrs['imageVideo']['autoplay'] ) ) {
			$container_attrs['data-video-autoplay'] = '0';
		}

		// Pagination config the frontend runtime reads (only when a bar is shown):
		// the total item count, the per-page size (responsive JSON) and the
		// server-owned render-context key.
		if ( $paginated ) {
			$container_attrs['data-ap']          = 'load_more';
			$container_attrs['data-ap-total']    = $total;
			$container_attrs['data-ap-per-view'] = wp_json_encode( $attrs['ajaxPagination']['showPerView'] );
			$container_attrs['data-ap-ctx']      = $ctx_key;
			// Random order only: the deck this page was dealt from. Absent for Default
			// order, where there is nothing to keep consistent between windows.
			if ( $seed > 0 ) {
				$container_attrs['data-ap-seed'] = $seed;
			}
			$gallery_id = absint( $attributes['galleryId'] ?? 0 );
			if ( $gallery_id > 0 ) {
				$container_attrs['data-ap-gallery'] = $gallery_id;
			}
		}

		$html = '<div ' . $this->build_attrs( $container_attrs ) . '>';
		foreach ( $window as $index => $item ) {
			$html .= $this->render_item( $item, $attrs, (int) $index );
		}
		$html .= '</div>';

		// The pagination bar is a SIBLING of the grid (inside the block wrapper), so
		// it is never a grid / flex / absolutely-positioned masonry child.
		if ( $paginated ) {
			$html .= $this->pagination_markup( $attrs );
		}

		// Duotone <filter> defs come first so url(#id) resolves.
		return implode( '', $this->duotone_svgs ) . $html;
	}

	/**
	 * Build the Ajax-pagination bar (Load More button + a status live region).
	 *
	 * A semantic <nav> SIBLING of the grid: a real <button> (with an inline
	 * spinner), a hidden end-of-list message and a live region the runtime writes
	 * progress into. Appearance comes from the AjaxStyle contributor's
	 * `--sp-shaped-gallery-ap-*` custom properties, emitted inline on the bar element
	 * (siblings don't inherit the grid's vars). Escaped inline.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes (ajax_active).
	 * @return string Bar markup.
	 */
	private function pagination_markup( array $attrs ): string {
		$p     = $attrs['ajaxPagination'];
		$align = sanitize_html_class( $p['alignment'] );

		$bar_attrs = array(
			'class'      => 'sp-shaped-gallery__pagination sp-shaped-gallery__pagination--' . $align,
			'aria-label' => __( 'Gallery pagination', 'easy-lightbox-wp' ),
			'style'      => $this->style_engine->pagination_style( $attrs ),
		);

		$label  = '' !== trim( (string) $p['buttonLabel'] ) ? $p['buttonLabel'] : __( 'Load More', 'easy-lightbox-wp' );
		$ending = '' !== trim( (string) $p['endingMessage'] ) ? $p['endingMessage'] : __( 'No more images available', 'easy-lightbox-wp' );

		$inner  = '<button type="button" class="sp-shaped-gallery__load-more">'
			. '<span class="sp-shaped-gallery__spinner" aria-hidden="true"></span>'
			. '<span class="sp-shaped-gallery__load-more-label">' . esc_html( $label ) . '</span>'
			. '</button>';
		$inner .= '<p class="sp-shaped-gallery__end" hidden>' . esc_html( $ending ) . '</p>';
		$inner .= '<span class="sp-shaped-gallery__pg-status" role="status" aria-live="polite"></span>';

		return '<nav ' . $this->build_attrs( $bar_attrs ) . '>' . $inner . '</nav>';
	}

	/**
	 * Render a window of items as an HTML fragment for the /gallery-page endpoint.
	 *
	 * Re-normalizes the (server-owned) attributes, re-resolves the item set, then
	 * renders the slice [offset, offset+limit) through the SAME {@see render_item()}
	 * the SSR path uses (one render path — no figure template duplicated in JS). The
	 * per-request limit is the device-resolved showPerView (capped at 100), so the
	 * client never dictates window size; the offset — a position into public,
	 * published content — is clamped to the item count. Duotone <filter> defs the
	 * slice needs are prepended so `filter:url(#id)` resolves for appended items.
	 *
	 * Under Random order the `$seed` is what makes this window belong to the same
	 * deck the SSR page dealt: it is minted once per render, published as
	 * `data-ap-seed`, and echoed back by the runtime. A request that arrives without
	 * one falls back to a seed derived from the attributes, which is deterministic —
	 * so the worst case is a window from a DIFFERENT but stable permutation, rather
	 * than a fresh permutation per request, which is what actually produces duplicated
	 * and skipped items. The client always sends it; the fallback exists so the
	 * endpoint has no undefined behaviour.
	 *
	 * @param array<string,mixed> $attributes Server-owned block attributes.
	 * @param int                 $offset     Item offset (count already loaded).
	 * @param string              $device     desktop|tablet|mobile.
	 * @param int                 $seed       Random-order permutation seed; 0 to derive one.
	 * @return array{html:string,hasMore:bool,next:int,total:int}
	 */
	public function render_window( array $attributes, int $offset, string $device, int $seed = 0 ): array {
		$attrs = GalleryOptions::normalize( $attributes );

		/*
		 * The visibility gate, asked HERE rather than trusted to have been asked
		 * upstream. This method is reached through a deliberately public REST route,
		 * and the reason it once served private and password-protected galleries to
		 * anonymous callers is precisely that the gate lived only in the OTHER render
		 * path ({@see \ShapedPlugin\ShapedGallery\Blocks\BlockTypes\Gallery::render()}).
		 * A shared decision that each door asks for itself is the only version of this
		 * a third door cannot be added without.
		 *
		 * Before `resolve_window()`, so a locked gallery costs the request nothing: the
		 * item resolution it skips is a provider lookup per stored item, on an
		 * unauthenticated endpoint.
		 *
		 * The caller is expected to refuse the request outright — the endpoint answers
		 * 410 rather than an empty window, so the item TOTAL is not disclosed either.
		 * This is the backstop for a caller that does not.
		 */
		if ( ! GalleryVisibility::is_viewable( $attrs ) ) {
			return array(
				'html'    => '',
				'hasMore' => false,
				'next'    => $offset,
				'total'   => 0,
			);
		}

		if ( 'random' === $attrs['order'] && $seed <= 0 ) {
			$seed = self::derived_seed( $attrs );
		}

		// The stored count — see the matching comment in render() for why this is
		// exact without a provider round trip.
		$total  = count( $attrs['items'] );
		$offset = max( 0, $offset );

		$limit = GalleryOptions::responsive_int( $attrs['ajaxPagination']['showPerView'] ?? null, $device, 15 );

		/**
		 * Filter the pagination window (offset / limit) before slicing.
		 *
		 * @since 1.0.0
		 *
		 * @param array{offset:int,limit:int} $window Window bounds.
		 * @param array<string,mixed>         $attrs  Normalized attributes.
		 * @param string                      $device desktop|tablet|mobile.
		 */
		$w      = (array) apply_filters(
			'shaped_gallery_ajax_window',
			array(
				'offset' => $offset,
				'limit'  => $limit,
			),
			$attrs,
			$device
		);
		$offset = max( 0, (int) ( $w['offset'] ?? $offset ) );
		$limit  = max( 1, min( 100, (int) ( $w['limit'] ?? $limit ) ) );

		$this->duotone_svgs = array();
		$slice              = $this->resolve_window( $attrs, $seed, $offset, $limit );
		$html               = '';
		foreach ( $slice as $i => $item ) {
			$html .= $this->render_item( $item, $attrs, $offset + (int) $i );
		}

		$count = count( $slice );
		$next  = $offset + $count;

		return array(
			'html'    => $count > 0 ? implode( '', $this->duotone_svgs ) . $html : '',
			'hasMore' => $next < $total,
			'next'    => $next,
			'total'   => $total,
		);
	}

	/**
	 * Render a single figure.
	 *
	 * @param array $item   MediaItem.
	 * @param array $attrs  Normalized attributes.
	 * @param int   $index  Item index.
	 * @return string
	 */
	private function render_item( array $item, array $attrs, int $index ): string {
		$iv         = (array) ( $attrs['imageVideo'] ?? array() );
		$is_video   = isset( $item['type'] ) && 'video' === $item['type'];
		$has_poster = $is_video && ! empty( $item['poster'] );
		$src        = $has_poster ? $item['poster'] : ( $item['url'] ?? $item['full'] ?? '' );
		$full       = $item['full'] ?? $src;

		// A provider embed's `full` is framed by the runtime, so it is held to the
		// provider's own hosts here, before it reaches `data-video-src` (which is only
		// attribute-escaped) or the lightbox anchor. Anything else becomes '' and the
		// tile simply has nothing to play. See EmbedUrl.
		if ( EmbedUrl::is_provider( (string) ( $item['provider'] ?? '' ) ) ) {
			$full = EmbedUrl::sanitize( (string) $item['provider'], (string) $full );
		}
		$width   = (int) ( $item['width'] ?? 0 );
		$height  = (int) ( $item['height'] ?? 0 );
		$alt     = $item['alt'] ?? '';
		$caption = $item['caption'] ?? '';
		$dims    = ( $width && $height ) ? sprintf( 'width="%d" height="%d"', $width, $height ) : '';

		// Video Play Mode: EVERY video plays in the tile under Inline — a file as a
		// `<video>`, a provider embed as its iframe (the runtime builds both). Only a
		// real file can ship ALREADY playing though, so autoplay upgrades a file tile
		// to a live muted player and leaves an embed click-to-play. Under Popup every
		// video is click-to-play, and the click opens the video popup instead.
		$playable        = $this->is_playable_file( $item );
		$plays_inline    = $is_video && GalleryOptions::video_inline( $attrs );
		$autoplay_inline = $plays_inline && $playable && ! empty( $iv['autoplay'] );
		$pops_up         = $is_video && GalleryOptions::video_popup( $attrs );

		$figure_attrs = array(
			'class'      => 'sp-shaped-gallery__item' . ( $is_video ? ' sp-shaped-gallery__item--video' : '' ) . $this->shape_class( $item ),
			'data-w'     => $width > 0 ? $width : 4,
			'data-h'     => $height > 0 ? $height : 3,
			'data-index' => $index,
		);

		if ( $autoplay_inline ) {
			// The tile IS the player: muted + looping so the autoplay policy allows it.
			$img = sprintf(
				'<video class="sp-shaped-gallery__img" src="%s"%s autoplay muted loop playsinline preload="metadata" %s></video>',
				esc_url( $full ),
				$has_poster ? sprintf( ' poster="%s"', esc_url( $item['poster'] ) ) : '',
				$dims
			);
		} elseif ( $is_video && ! $has_poster && $playable ) {
			// Poster-less FILE video (e.g. an external .mp4) renders a <video>
			// first-frame. An embed must never take this path: its `src` would be the
			// provider's HTML page, which paints nothing.
			//
			// `$full`, not `$src`: on this branch the media file is what has to be
			// decoded, and `full` is the field that means that by definition, while
			// `url` only means "what to display". They agree for an item normalized
			// today — but galleries saved by an earlier build carry core's generic
			// mime-type icon in `url` for a poster-less video, and a `<video>` pointed
			// at an SVG paints nothing. Reading `full` renders those correctly without
			// the item having to be re-added.
			$img = sprintf(
				'<video class="sp-shaped-gallery__img" src="%s" muted preload="metadata" playsinline %s></video>',
				esc_url( self::first_frame_src( $full ) ),
				$dims
			);
		} else {
			// An attachment video with a poster — and every image — renders an <img>.
			// Per-image duotone (native core/image control) rides as a custom property
			// rather than an inline `filter`, so the stylesheet can compose it with the
			// panel's own filter + hover states instead of being overridden by it.
			$duotone   = $this->duotone_style( $item );
			$img_style = '' !== $duotone ? sprintf( ' style="%s"', esc_attr( $duotone ) ) : '';
			$img       = sprintf(
				'<img class="sp-shaped-gallery__img" src="%s" alt="%s" %s%s%s loading="%s" decoding="async" />',
				esc_url( $src ),
				esc_attr( $alt ),
				$dims,
				$this->srcset_attrs( $item, $attrs ),
				$img_style,
				GalleryOptions::lazy_load_active( $attrs ) ? 'lazy' : 'eager'
			);
		}

		// A play badge only makes sense while the video is NOT already playing.
		if ( $is_video && ! $autoplay_inline ) {
			$img = '<span class="sp-shaped-gallery__playicon" aria-hidden="true"></span>' . $img;
		}

		// Click-to-play video, inline or popup: a REAL button so the tile is
		// keyboard-operable (§14) and distinct from `.sp-shaped-gallery__link`, which
		// the delegated lightbox handler binds. The runtime reads the file off the
		// figure and the mode off the container; a popup button says it opens one.
		if ( ( $plays_inline && ! $autoplay_inline ) || $pops_up ) {
			$figure_attrs['data-video-src'] = $full;
			// The provider tells the runtime WHICH player to build (iframe vs video);
			// it recognizes the embed ids itself, so no flag is duplicated here.
			$figure_attrs['data-video-provider'] = (string) ( $item['provider'] ?? '' );
			$img                                 = sprintf(
				'<button type="button" class="sp-shaped-gallery__play"%s aria-label="%s">%s</button>',
				$pops_up ? ' aria-haspopup="dialog"' : '',
				esc_attr(
					'' !== trim( (string) ( $item['title'] ?? '' ) )
						/* translators: %s: video title. */
						? sprintf( __( 'Play video: %s', 'easy-lightbox-wp' ), $item['title'] )
						: __( 'Play video', 'easy-lightbox-wp' )
				),
				$img
			);
		}

		// Click behaviour. A video's click belongs to Video Play Mode alone — the
		// runtime swaps in a player or opens the popup — so a video never becomes a
		// lightbox or URL link, which also keeps the delegated lightbox handler from
		// firing for it, with no JS-side exception. The lightbox is images only.
		$click = $is_video ? 'none' : $attrs['clickAction'];
		if ( 'lightbox' === $click ) {
			// The anchor wraps the image, so the whole tile is the trigger. It stays a
			// real link to the full-size file, which is what the viewer's click handler
			// intercepts — and what a no-JS visitor follows instead.
			$inner = sprintf(
				'<a class="sp-shaped-gallery__link" href="%s" data-full="%s" data-type="%s" data-provider="%s"%s>%s</a>',
				esc_url( $full ),
				esc_url( $full ),
				esc_attr( $item['type'] ?? 'image' ),
				esc_attr( $item['provider'] ?? '' ),
				$this->lightbox_data( $item, $caption ),
				$img
			);
		} elseif ( 'url' === $click && ! empty( $item['link'] ) && GalleryOptions::custom_url_active( $attrs ) ) {
			$inner = sprintf( '<a class="sp-shaped-gallery__link" href="%s">%s</a>', esc_url( $item['link'] ), $img );
		} else {
			$inner = $img;
		}

		// The figure's caption slot is owned by the Content Settings block (title /
		// description). Only one <figcaption> is ever emitted (valid HTML).
		$caption_region = $this->content_markup( $item, $attrs );

		/*
		 * The media sits in its own frame, and the frame — not the figure — is the box
		 * every layout sizes.
		 *
		 * The figure cannot be that box while it is also the flow container for a
		 * Classic content block: justified pins it to the row height, masonry to the
		 * aspect-scaled column height and grid to a 1:1 ratio, and each of those is the
		 * IMAGE's height with nothing left over for a title and description. The
		 * content block then fought the media for that fixed height (the media is
		 * `flex: 1 1 0%`, so it shrank towards nothing as the text grew) and whatever
		 * still did not fit was cut off by the figure's `overflow: hidden`. Splitting
		 * the two lets the figure auto-height to frame + content, so large text extends
		 * the tile instead of destroying it.
		 *
		 * The play badge and the preloader shimmer live inside the frame for the same
		 * reason: both are `inset: 0` overlays that mean "over the media", and over the
		 * figure they would also cover the caption.
		 *
		 * Overlay is unaffected either way — it is absolutely positioned, so it never
		 * took flow height from the media and does not gain any now.
		 */
		$inner = '<div class="sp-shaped-gallery__frame">' . $inner . '</div>';

		return '<figure ' . $this->build_attrs( $figure_attrs ) . '>' . $inner . $caption_region . '</figure>';
	}

	/**
	 * Build the image title / description content block for a figure.
	 *
	 * Rendered as the figure's `<figcaption>`. Title and description are
	 * independently gated, sourced from the MediaItem per the Content Settings,
	 * escaped, and positioned/styled via `.sp-shaped-gallery__content` CSS (the ContentStyle
	 * contributor's `--sp-shaped-gallery-ct-*` custom properties).
	 *
	 * @param array $item  MediaItem.
	 * @param array $attrs Normalized attributes.
	 * @return string figcaption markup, or '' when content is disabled/empty.
	 */
	private function content_markup( array $item, array $attrs ): string {
		$c = $attrs['content'] ?? array();
		if ( empty( $c['imageTitle'] ) && empty( $c['imageDescription'] ) ) {
			return '';
		}

		$parts = '';

		if ( ! empty( $c['imageTitle'] ) ) {
			$title = 'caption' === $c['imageTitleSource'] ? ( $item['caption'] ?? '' ) : ( $item['title'] ?? '' );
			if ( '' !== trim( (string) $title ) ) {
				$tag    = $c['imageTitleTag']; // Allow-listed in GalleryOptions.
				$parts .= sprintf( '<%1$s class="sp-shaped-gallery__title">%2$s</%1$s>', $tag, esc_html( $title ) );
			}
		}

		if ( ! empty( $c['imageDescription'] ) ) {
			$desc = 'description' === $c['imageDescriptionSource'] ? ( $item['description'] ?? '' ) : ( $item['caption'] ?? '' );
			$desc = $this->limit_description( (string) $desc, (array) ( $c['descriptionLimit'] ?? array() ) );
			if ( '' !== trim( $desc ) ) {
				$parts .= '<div class="sp-shaped-gallery__desc">' . esc_html( $desc ) . '</div>';
			}
		}

		if ( '' === $parts ) {
			return '';
		}

		$classes = sprintf(
			'sp-shaped-gallery__content sp-shaped-gallery__content--%s is-%s',
			sanitize_html_class( $c['position'] ),
			sanitize_html_class( $c['displayStyle'] )
		);

		return '<figcaption class="' . esc_attr( $classes ) . '">' . $parts . '</figcaption>';
	}

	/**
	 * Apply the description word limit. Line limits are enforced by CSS
	 * (`-webkit-line-clamp` via `--sp-shaped-gallery-ct-desc-clamp`), so only the "word" unit
	 * truncates server-side (using the desktop count).
	 *
	 * @param string $text  Description text.
	 * @param array  $limit Responsive limit bundle ({desktop,tablet,mobile,unit}).
	 * @return string
	 */
	private function limit_description( string $text, array $limit ): string {
		if ( 'word' !== ( $limit['unit'] ?? '' ) ) {
			return $text;
		}
		$max = (int) ( $limit['desktop'] ?? 0 );
		if ( $max < 1 ) {
			return $text;
		}
		$words = preg_split( '/\s+/', trim( $text ) );
		if ( count( $words ) <= $max ) {
			return $text;
		}
		return implode( ' ', array_slice( $words, 0, $max ) ) . '…';
	}

	/**
	 * The item's text + thumbnail, as data-* on the lightbox trigger link.
	 *
	 * The overlay is built in the browser from whatever is on screen, so everything
	 * it can display has to travel with the tile — including the per-item overrides
	 * a gallery may carry, which is why this is emitted unconditionally rather than
	 * gated on what the viewer currently displays. A gate here would also leave a
	 * paginated gallery's appended tiles carrying whatever the settings were when the
	 * FIRST window rendered.
	 *
	 * Empty values are omitted rather than emitted blank, so the payload stays small
	 * and the runtime's `dataset` lookups read as "absent" instead of "empty string".
	 *
	 * @param array  $item    MediaItem.
	 * @param string $caption The item's caption, already resolved by the caller.
	 * @return string Leading-space attribute string, or ''.
	 */
	private function lightbox_data( array $item, string $caption ): string {
		$map = array(
			'data-title'       => (string) ( $item['title'] ?? '' ),
			'data-caption'     => $caption,
			'data-description' => (string) ( $item['description'] ?? '' ),
		);

		$out = '';
		foreach ( $map as $key => $value ) {
			if ( '' !== trim( $value ) ) {
				$out .= sprintf( ' %s="%s"', $key, esc_attr( $value ) );
			}
		}

		$thumb = (string) ( $item['thumb'] ?? '' );
		if ( '' !== $thumb ) {
			$out .= sprintf( ' data-thumb="%s"', esc_url( $thumb ) );
		}

		return $out;
	}

	/**
	 * Per-item shape/style class suffix from the native core/image block-style
	 * selection (e.g. `is-style-rounded`). Each token is class-sanitized.
	 *
	 * @param array $item MediaItem (may carry a `styleClass` string).
	 * @return string Leading-space class string, or ''.
	 */
	private function shape_class( array $item ): string {
		if ( empty( $item['styleClass'] ) || ! is_string( $item['styleClass'] ) ) {
			return '';
		}
		$tokens = array_filter( array_map( 'sanitize_html_class', preg_split( '/\s+/', $item['styleClass'] ) ) );
		return $tokens ? ' ' . implode( ' ', $tokens ) : '';
	}

	/**
	 * Resolve a per-item duotone value into an inline custom-property declaration,
	 * registering the backing SVG filter for one-time output. Returns '' when the
	 * item has no (resolvable) duotone.
	 *
	 * The duotone rides as `--sp-shaped-gallery-iv-dt` rather than an inline
	 * `filter: url(#id)`: the stylesheet composes that property with the Image &
	 * Video panel's own filter (and its hover state) into ONE `filter` list, so a
	 * duotoned image still honours the gallery filter and hover — which an inline
	 * `filter` declaration would silently win over.
	 *
	 * @param array $item MediaItem (may carry a `duotone` array/preset value).
	 * @return string CSS custom-property declaration, or ''.
	 */
	private function duotone_style( array $item ): string {
		if ( ! isset( $item['duotone'] ) ) {
			return '';
		}
		$colors = DuotoneFilter::resolve_colors( $item['duotone'] );
		if ( count( $colors ) < 2 ) {
			return '';
		}
		$id                        = DuotoneFilter::id( $colors );
		$this->duotone_svgs[ $id ] = DuotoneFilter::svg( $colors, $id );
		return '--sp-shaped-gallery-iv-dt:url(#' . $id . ')';
	}

	/**
	 * Build the responsive `srcset` (+ `sizes`) attribute pair for an item's image.
	 *
	 * Silent while Retina Images is off ({@see GalleryOptions::retina_active()}): a
	 * plain `src` is exactly what an image had before responsive candidates existed, so
	 * the tile stays valid and simply stops offering a sharper file. The same predicate
	 * also stops the provider computing the list at all, so this early return is the
	 * SECOND of two gates rather than the only one — belt and braces on purpose, since a
	 * stored item could still carry candidates from a render before the setting changed.
	 *
	 * The candidate list is provider data (opt-in via the `srcset` fetch arg, so it
	 * never bloats the stored `items`); the `sizes` hint that makes it useful is
	 * layout geometry, so it comes from {@see ImageSizes}. Items without candidates
	 * — external URLs, single-width uploads — contribute nothing and keep a plain
	 * `src`. Escaped inline.
	 *
	 * @param array $item  MediaItem.
	 * @param array $attrs Normalized attributes.
	 * @return string Leading-space attribute string, or ''.
	 */
	private function srcset_attrs( array $item, array $attrs ): string {
		if ( ! GalleryOptions::retina_active() ) {
			return '';
		}

		if ( empty( $item['srcset'] ) || ! is_string( $item['srcset'] ) ) {
			return '';
		}

		$out   = sprintf( ' srcset="%s"', esc_attr( $item['srcset'] ) );
		$sizes = ImageSizes::attr( $attrs, (string) ( $item['sizes'] ?? '' ) );
		if ( '' !== $sizes ) {
			$out .= sprintf( ' sizes="%s"', esc_attr( $sizes ) );
		}

		return $out;
	}

	/**
	 * Whether a video item is a playable media FILE (so it can play in the tile)
	 * rather than a provider embed whose `full` URL is an iframe player.
	 *
	 * @param array $item MediaItem.
	 * @return bool
	 */
	private function is_playable_file( array $item ): bool {
		return ! EmbedUrl::is_provider( (string) ( $item['provider'] ?? '' ) );
	}

	/**
	 * The source a poster-less video tile is drawn from.
	 *
	 * `preload="metadata"` on a `<video>` with no `poster` is not guaranteed to paint
	 * anything — metadata is enough to size the element, not to decode a frame — so
	 * the tile can sit there as an empty black box. A `#t=` media fragment makes the
	 * browser seek to that time and paint the frame it lands on, which is what gives
	 * the tile a still. 0.1s rather than 0 dodges the all-black opening frame most
	 * encoders emit.
	 *
	 * §18: the editor preview and the media manager's thumbnails apply the SAME rule
	 * through `app/lib/video-poster.js`, so all three surfaces show the same frame.
	 * Only the drawn source gets the fragment — `data-video-src` keeps the clean URL,
	 * so the runtime's player still starts from the beginning.
	 *
	 * @param string $src Video file URL.
	 * @return string The URL with a seek fragment appended, unchanged when it already carries one.
	 */
	private static function first_frame_src( string $src ): string {
		if ( '' === $src || str_contains( $src, '#' ) ) {
			return $src;
		}

		return $src . '#t=0.1';
	}

	/**
	 * The MediaItems for one window: ordered, THEN resolved — only the slice a
	 * caller is about to render.
	 *
	 * One method, and both callers ({@see render()} and {@see render_window()}) go
	 * through it — which is the point. `render_window()` re-runs this method for
	 * every Ajax window, so a shuffle anywhere else — or an unseeded one here —
	 * would deal page 2 out of a different deck than page 1 and the visitor would
	 * see items twice while others never appeared.
	 *
	 * Ordering the STORED items first and resolving only the slice — rather than
	 * resolving the whole gallery and slicing the result — is what keeps this
	 * O(window) instead of O(gallery). It is safe because {@see ItemOrder::apply()}
	 * is a pure permutation of the array (position only, seeded and reproducible)
	 * and {@see provider_items()} is order-preserving and 1:1 with whatever list it
	 * is given, so permuting before or after resolving reaches the same tiles in
	 * the same order — one of them is just far cheaper. `/gallery-page` is a public,
	 * unauthenticated, unthrottled route; resolving every stored item (a provider
	 * lookup each) to answer a 15-item window turned an ordinary Load More click,
	 * and a trivial offset-looping client, into a cost proportional to the whole
	 * gallery instead of the page actually returned.
	 *
	 * @param array<string,mixed> $attrs  Normalized attributes.
	 * @param int                 $seed   Random-order permutation seed (0 when order is Default).
	 * @param int                 $offset Position into the ordered, stored list.
	 * @param int                 $limit  Window size.
	 * @return array<int,array<string,mixed>>
	 */
	private function resolve_window( array $attrs, int $seed, int $offset, int $limit ): array {
		$ordered = ItemOrder::apply( $attrs['items'], $attrs['order'], $seed );

		if ( $offset >= count( $ordered ) ) {
			return array();
		}

		$slice = array_slice( $ordered, $offset, $limit );

		return $this->provider_items( array_merge( $attrs, array( 'items' => $slice ) ) );
	}

	/**
	 * A stable seed for a gallery whose window request carried none.
	 *
	 * Derived from the attributes, so it is the same on every request for the same
	 * gallery: a lost seed then costs the visitor a different permutation, not a
	 * different permutation PER REQUEST — which is the failure that duplicates and
	 * skips items. Never `random_int()` here for exactly that reason.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return int
	 */
	private static function derived_seed( array $attrs ): int {
		return (int) ( crc32( (string) wp_json_encode( $attrs['items'] ) ) & 0x7FFFFFFF ) ?: 1;
	}

	/**
	 * Re-fetch fresh data by id for attachment-backed items, keeping non-attachment
	 * items (e.g. external pasted URLs, id === url) as stored.
	 *
	 * The stored order is preserved and external items are never dropped, so a
	 * gallery mixing Media Library and External Images renders every item.
	 *
	 * The Image Resolution setting travels to the provider as the `size` fetch
	 * argument, so the display URL is resolved ONCE where the media lives instead of
	 * the renderer growing attachment-API knowledge (and without shipping four
	 * candidate URLs per item). Providers with a single URL simply ignore it.
	 *
	 * @param array $attrs Normalized attributes.
	 * @return array<int,array<string,mixed>>
	 */
	private function provider_items( array $attrs ): array {
		$stored = $attrs['items'];
		if ( empty( $stored ) ) {
			return array();
		}

		$ids = array();
		foreach ( $stored as $it ) {
			if ( ! empty( $it['id'] ) && is_numeric( $it['id'] ) ) {
				$ids[] = (int) $it['id'];
			}
		}

		$provider = Provider_Registry::get( $attrs['provider'] );
		if ( ! $provider || ! $provider->is_available() || empty( $ids ) ) {
			return $stored;
		}

		$fresh = $provider->fetch(
			array(
				'ids'    => $ids,
				'size'   => (string) ( $attrs['imageVideo']['resolution'] ?? 'large' ),
				// Only the render path wants the candidate strings (see the provider
				// contract) — the media manager's browse payload stays lean.
				// Not an unconditional `true` any more: with Retina Images off, computing
				// candidates nobody will emit is two attachment-meta lookups per image
				// per render, which is the saving that makes switching it off worth
				// something rather than merely cosmetic.
				'srcset' => GalleryOptions::retina_active(),
			)
		);
		if ( empty( $fresh ) ) {
			return $stored;
		}

		// Index fresh attachment data by id for a stored-order rebuild.
		$fresh_by_id = array();
		foreach ( $fresh as $f ) {
			$fresh_by_id[ (int) $f['id'] ] = $f;
		}

		$resolved = array();
		foreach ( $stored as $it ) {
			$id = $it['id'] ?? null;
			if ( ! empty( $id ) && is_numeric( $id ) && isset( $fresh_by_id[ (int) $id ] ) ) {
				// Attachment item: take fresh data, keep stored per-item overrides.
				$item = $fresh_by_id[ (int) $id ];
				if ( ! empty( $it['link'] ) ) {
					$item['link'] = $it['link'];
				}

				/*
				 * Per-item text edited in the media picker's Attachment Details and in
				 * the Edit Gallery modal. Those fields are gallery-only by design — they
				 * patch the stored MediaItem and never touch the WP attachment (see
				 * app/media-manager/AttachmentDetails.jsx) — so the fresh provider row
				 * would overwrite every one of them if they were not carried across, the
				 * same reason `link` and the per-gallery presentation overrides below
				 * are. `caption` was already carried; `title`, `alt` and `description`
				 * were not, which silently discarded three of the five editable fields
				 * (and with them the Content Settings title/description sources).
				 *
				 * A blank stored value means "no override", so the attachment's own value
				 * still shows — clearing a field falls back rather than blanking the tile.
				 */
				foreach ( array( 'title', 'alt', 'caption', 'description' ) as $field ) {
					if ( isset( $it[ $field ] ) && '' !== $it[ $field ] ) {
						$item[ $field ] = $it[ $field ];
					}
				}
				// Presentation overrides set via the native image toolbar (shape/
				// duotone) live only on the stored item, not on fresh provider data.
				if ( ! empty( $it['styleClass'] ) ) {
					$item['styleClass'] = $it['styleClass'];
				}
				if ( ! empty( $it['duotone'] ) ) {
					$item['duotone'] = $it['duotone'];
				}
				$resolved[] = $item;
			} else {
				// External or otherwise unresolved item: render from stored data.
				$resolved[] = $it;
			}
		}

		return $resolved;
	}

	/**
	 * Build an HTML attribute string from a map (values escaped).
	 *
	 * @param array<string,mixed> $attrs Attributes.
	 * @return string
	 */
	private function build_attrs( array $attrs ): string {
		$out = array();
		foreach ( $attrs as $key => $value ) {
			if ( '' === $value && 0 !== $value ) {
				continue;
			}
			$out[] = sprintf( '%s="%s"', esc_attr( $key ), esc_attr( (string) $value ) );
		}
		return implode( ' ', $out );
	}
}

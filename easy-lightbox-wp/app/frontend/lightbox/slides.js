/**
 * What the viewer shows: which tiles make up a slide set, and how one slide's
 * media element is built.
 *
 * Kept apart from the overlay's chrome and from the gesture layer because it is
 * the only part that knows about the GALLERY — the renderer's markup, its
 * `data-*` contract, and the two layouts that complicate it. Everything else in
 * the viewer deals only with the descriptors this module returns.
 */

import { EMBED_PARAMS, embedUrl } from '../embeds';

/**
 * Sizing for a GENERIC frame — a page, or a provider player with no entry in
 * `EMBED_PARAMS`. Unlike a known provider there is no aspect ratio to honour, so
 * this is a plain box the stylesheet's `max-width` / `max-height` then cap.
 *
 * @type {string}
 */
const GENERIC_FRAME = 'width:min(90vw, 1100px);height:min(80vh, 800px);border:0';

/**
 * The element an inline selector points at, or `null`.
 *
 * `querySelector` throws on a malformed selector, and the selector here comes
 * from an author's `href` — so a typo in one link must not take the whole click
 * handler with it.
 *
 * @param {string} selector Selector from the trigger's href.
 * @return {?Element} Matching element.
 */
function inlineSource( selector ) {
	if ( ! selector ) {
		return null;
	}

	try {
		return document.querySelector( selector );
	} catch ( error ) {
		return null;
	}
}

/**
 * Read one slide descriptor off a trigger link.
 *
 * Every field the viewer can display travels on the anchor as `data-*`, put
 * there by `LayoutRenderer::lightbox_data()`. Reading them here — rather than
 * re-fetching or re-deriving — is what makes a tile appended by Ajax pagination
 * as complete as one that was server-rendered.
 *
 * @param {HTMLAnchorElement} link Trigger.
 * @return {Object} Slide descriptor.
 */
export function itemFromLink( link ) {
	return {
		full: link.dataset.full || link.getAttribute( 'href' ) || '',
		type: link.dataset.type || 'image',
		provider: link.dataset.provider || '',
		title: link.dataset.title || '',
		caption: link.dataset.caption || '',
		description: link.dataset.description || '',
		thumb: link.dataset.thumb || '',
		alt: link.querySelector( 'img' )?.alt || '',
		trigger: link,
	};
}

/**
 * The slide set for a click, and where in it to start.
 *
 * @param {HTMLElement}       box  Gallery container.
 * @param {HTMLAnchorElement} link The clicked trigger.
 * @return {{items: Object[], index: number}} Descriptors and start position.
 */
export function slidesFor( box, link ) {
	const links = Array.from( box.querySelectorAll( '.sp-shaped-gallery__link' ) ).filter(
		( node ) => ! node.closest( '[hidden]' )
	);

	return {
		items: links.map( itemFromLink ),
		index: Math.max( 0, links.indexOf( link ) ),
	};
}

/**
 * Whether a slide is a still image — the only kind zoom, pan and the download
 * control apply to. A provider embed owns its own gestures, a `<video>` owns its
 * own controls, and the two kinds the Easy Lightbox compatibility layer adds
 * (§25) own their scrolling: pinching a framed page would fight it.
 *
 * @param {Object} item Slide descriptor.
 * @return {boolean} True for an image slide.
 */
export function isImage( item ) {
	return (
		'video' !== item?.type &&
		'frame' !== item?.type &&
		'inline' !== item?.type &&
		! EMBED_PARAMS[ item?.provider ]
	);
}

/**
 * Whether a URL may be put in an iframe's `src`.
 *
 * A scheme-less or protocol-relative href is the page's own origin and is
 * allowed; anything with an explicit scheme must be `http` or `https`. That is
 * what stops a `javascript:` href — which the Easy Lightbox viewer would happily
 * have assigned — from being anything but the error state (§25).
 *
 * @param {string} url Candidate URL.
 * @return {boolean} True when framing it is safe.
 */
export function isFramableUrl( url ) {
	const scheme = /^([a-z][a-z0-9+.\-]*):/i.exec( String( url ).trim() );

	if ( ! scheme ) {
		return true;
	}

	const name = scheme[ 1 ].toLowerCase();

	return 'http' === name || 'https' === name;
}

/**
 * Build the media element for a slide.
 *
 * DOM APIs rather than an `innerHTML` template: the URLs and titles come from
 * the media library and from providers, and must never be parsed as markup
 * (§13). The element is returned unattached so the caller controls when it
 * lands — which is what lets the stage swap without an empty frame.
 *
 * Returns `null` when the descriptor cannot be shown at all — an unframable URL,
 * or an inline selector matching nothing on the page. Both reach the viewer only
 * through the compatibility layer (§25), and both are the error state rather than
 * a blank stage the visitor cannot tell from a slow one.
 *
 * @param {Object}  item     Slide descriptor.
 * @param {boolean} autoplay Whether video slides start playing.
 * @return {?HTMLElement} Media element, or `null` when there is nothing to show.
 */
export function buildMedia( item, autoplay ) {
	const embed = EMBED_PARAMS[ item.provider ];

	if ( embed ) {
		// A provider embed (YouTube) is an <iframe>, not a <video src>.
		// The URL — and whether the provider's autoplay parameter rides along —
		// comes from the shared embeds module, so the inline-video runtime and the
		// viewer frame a provider identically.
		const frame = document.createElement( 'iframe' );
		frame.className = 'sp-shaped-gallery-lightbox__media';
		frame.src = embedUrl( item.full, item.provider, autoplay );
		frame.title = item.title || item.alt || '';
		frame.setAttribute( 'allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen' );
		frame.setAttribute( 'allowfullscreen', '' );
		frame.setAttribute( 'style', embed.frame );
		return frame;
	}

	// A framed page or a non-YouTube provider player. Deprecated-only (§25): the
	// gallery block never produces this kind.
	if ( 'frame' === item.type ) {
		if ( ! isFramableUrl( item.full ) ) {
			return null;
		}

		const frame = document.createElement( 'iframe' );
		frame.className = 'sp-shaped-gallery-lightbox__media';
		frame.src = item.full;
		frame.title = item.title || item.alt || '';
		frame.setAttribute( 'allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen' );
		frame.setAttribute( 'allowfullscreen', '' );
		frame.setAttribute( 'style', GENERIC_FRAME );
		return frame;
	}

	// Inline content: a clone of an element already on this page, which is what
	// `href="#some-id"` meant to Easy Lightbox. Deprecated-only (§25).
	if ( 'inline' === item.type ) {
		const source = inlineSource( item.full );

		if ( ! source ) {
			return null;
		}

		const wrap = document.createElement( 'div' );
		wrap.className = 'sp-shaped-gallery-lightbox__media sp-shaped-gallery-lightbox__media--inline';
		// A CLONE, never the node itself: moving it would tear the element out of
		// the page it belongs to and leave a hole behind once the viewer closed.
		wrap.appendChild( source.cloneNode( true ) );
		return wrap;
	}

	if ( 'video' === item.type ) {
		const video = document.createElement( 'video' );
		video.className = 'sp-shaped-gallery-lightbox__media';
		video.src = item.full;
		video.controls = true;
		video.autoplay = autoplay;
		video.playsInline = true;
		video.preload = 'metadata';
		return video;
	}

	const img = document.createElement( 'img' );
	img.className = 'sp-shaped-gallery-lightbox__media';
	img.src = item.full;
	img.alt = item.alt || '';
	img.decoding = 'async';
	return img;
}

/**
 * Warm the browser cache for the slides either side of the current one, so
 * paging is instant rather than showing a spinner the visitor could have been
 * spared. Images only — preloading a video would pull megabytes nobody asked for.
 *
 * @param {Object[]} items Slide descriptors.
 * @param {number}   index Current position.
 * @return {void}
 */
export function preloadNeighbours( items, index ) {
	if ( items.length < 2 ) {
		return;
	}
	[ index - 1, index + 1 ].forEach( ( position ) => {
		const item = items[ ( position + items.length ) % items.length ];
		if ( item && isImage( item ) && item.full ) {
			const image = new Image();
			image.decoding = 'async';
			image.src = item.full;
		}
	} );
}

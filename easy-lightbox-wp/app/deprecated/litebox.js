/**
 * Easy Lightbox compatibility: binding the markup Easy Lightbox 1.x opened on.
 *
 * DEPRECATED BY DESIGN (§25). This folder keeps sites that ran Easy Lightbox
 * working after 1.2.0 replaced it with ShapedGallery, and is meant to be deleted
 * in a future major. It is the ONLY thing outside the viewer that opens the
 * viewer, and it does so through the `openItems()` primitive it is handed — there
 * is no second overlay, no second keyboard handler and no second set of gestures.
 * Deleting this folder and the one `initLegacy()` call in
 * `app/frontend/lightbox.js` removes the layer whole.
 *
 * ## What Easy Lightbox 1.1.x actually did
 *
 * Its entire front end was three lines printed into `wp_head` (preserved in
 * `wp-content/repos/easy-lightbox-wp/plugin-main.php`):
 *
 *     jQuery( '.litebox' ).liteBox();
 *     jQuery( 'div[id^=gallery] a' ).liteBox();
 *     jQuery( 'div.gallery a' ).attr( 'data-litebox-group', 'galone' );
 *
 * Three behaviours follow, and all three are reproduced here:
 *
 * 1. **Two selectors open the viewer** — anything classed `litebox`, and every
 *    anchor inside a classic `[gallery]` shortcode's wrapper.
 * 2. **`data-litebox-group` chains the slides.** The clicked anchor's own group
 *    value selects its set; an anchor with no group is a set of one and shows no
 *    arrows. LiteBox read the attribute at click time, so this does too.
 * 3. **Every classic gallery on a page is stamped into ONE chain** named
 *    `galone`. Two `[gallery]` shortcodes in one post paged into each other, and
 *    sites have been laid out around that for a decade — so the stamp is applied
 *    here exactly as it was, overwriting any value already present, rather than
 *    quietly becoming per-gallery.
 *
 * ## What is deliberately NOT reproduced
 *
 * The viewer's markup and chrome are this plugin's (`litebox-*` classes are gone),
 * Escape always closes, and the close button is never hidden — the readme lists
 * these as the deliberate exceptions. The keyboard handler is the viewer's too,
 * which fixes the one real bug here: Easy Lightbox bound `keyup` on `body` with a
 * namespace it cleared first, removing every other handler registered there.
 *
 * ## The chrome rides along
 *
 * `./litebox-chrome.scss` restores 1.x's close ring and its black nav discs, and it is
 * imported HERE rather than from the viewer's own stylesheet so that deleting
 * this folder removes it too. It is scoped to the `is-legacy` class the viewer
 * puts on the overlay for an open this module asked for: one element serves both
 * eras, so the chrome follows the CLICK, not the page. A gallery block's lightbox
 * on a migrated site looks like 1.2.0's — this layer restores what legacy markup
 * had, it does not restyle the new product.
 *
 * ## Why delegation, and why on the document
 *
 * One listener, resolved at click time. Legacy markup arrives from post content,
 * widgets, theme templates and other plugins' shortcodes — there is no container
 * to scope to, and no guarantee the DOM is final when this runs. A chain is
 * rebuilt from the live DOM on every open, so content injected later pages
 * correctly with no rebinding.
 */

import './litebox-chrome.scss';
import { resolveLegacyMedia } from './media';

/** Anchors Easy Lightbox bound directly. */
const CLASS_TRIGGER = 'a.litebox';

/** Anchors inside a classic `[gallery]` shortcode wrapper. */
const CLASSIC_TRIGGER = 'div[id^="gallery"] a';

/** The wrapper whose anchors were stamped into the shared chain. */
const CLASSIC_WRAPPER = 'div.gallery a';

/** The chain name every classic gallery on a page was stamped with. */
const CLASSIC_GROUP = 'galone';

/** The grouping attribute, read at click time. */
const GROUP_ATTRIBUTE = 'data-litebox-group';

/** Bound once per page, however many times `initLegacy()` is called. */
let bound = false;

/**
 * The viewer's open primitive, handed in by `initLegacy()`.
 *
 * Injected rather than imported, and the reason is structural: the viewer imports
 * this module to boot it, so importing the viewer back would make a cycle —
 * survivable under webpack, but it would also let a careless edit here pull the
 * whole viewer into some future bundle that only wanted the resolver. Injection
 * keeps the dependency pointing one way, and makes the seam a parameter a test
 * can substitute.
 *
 * @type {?Function}
 */
let open = null;

/**
 * Whether the compatibility layer is switched on for this site.
 *
 * Fails CLOSED, like the Ready Patterns tier gate: the flag is printed only by
 * `Deprecated\EasyLightboxCompat`, and only on a site whose install origin is the
 * Easy Lightbox listing — so a new install, where `litebox` on a theme element
 * means nothing of the sort, never binds a thing.
 *
 * @return {boolean} True when this site came from Easy Lightbox.
 */
function enabled() {
	return true === window.shaped_gallery_frontend?.deprecated?.easyLightbox;
}

/**
 * Stamp every classic gallery anchor into the one shared chain.
 *
 * Overwrites, as `jQuery.attr()` did. The attribute is also OBSERVABLE — themes
 * and snippets have styled and scripted against it — so it is written to the DOM
 * rather than merely implied by how chains are resolved below.
 *
 * @return {void}
 */
function stampClassicGroups() {
	document
		.querySelectorAll( CLASSIC_WRAPPER )
		.forEach( ( link ) => link.setAttribute( GROUP_ATTRIBUTE, CLASSIC_GROUP ) );
}

/**
 * Whether this anchor is one the compatibility layer owns.
 *
 * A tile inside a ShapedGallery container is excluded whatever classes it carries:
 * that anchor belongs to `bindLightbox()`, which resolves a richer slide set from
 * the renderer's own `data-*`. Two handlers on one click would open the viewer
 * twice with two different sets.
 *
 * @param {Element} node Candidate.
 * @return {boolean} True when this layer should handle it.
 */
function isLegacyTrigger( node ) {
	if ( ! ( node instanceof HTMLAnchorElement ) || node.closest( '.sp-shaped-gallery' ) ) {
		return false;
	}

	return node.matches( CLASS_TRIGGER ) || node.matches( CLASSIC_TRIGGER );
}

/**
 * The slide chain a click belongs to, and where in it to start.
 *
 * An anchor with no group is a set of one — LiteBox showed its arrows only inside
 * the `if ( attr( 'data-litebox-group' ) )` branch, and the viewer hides them for
 * a single slide, so the two agree with no special case here.
 *
 * Group members are read from the attribute alone, NOT from the two trigger
 * selectors: LiteBox chained `[data-litebox-group="X"]`, which lets an author add
 * a plain anchor to a chain by stamping it. Members with no `href` are dropped,
 * since there is nothing to resolve them to.
 *
 * The value is compared in JavaScript rather than interpolated into the selector.
 * A group name is author data — it reaches us from a `data-` attribute anyone who
 * can edit a post can write — and a quote in it would otherwise either throw or
 * change which elements the selector matches.
 *
 * @param {HTMLAnchorElement} link Clicked trigger.
 * @return {{links: HTMLAnchorElement[], index: number}} Chain and start position.
 */
export function chainFor( link ) {
	const group = link.getAttribute( GROUP_ATTRIBUTE );

	if ( ! group ) {
		return { links: [ link ], index: 0 };
	}

	const links = Array.from( document.querySelectorAll( `[${ GROUP_ATTRIBUTE }]` ) ).filter(
		( node ) =>
			node instanceof HTMLAnchorElement &&
			node.getAttribute( 'href' ) &&
			node.getAttribute( GROUP_ATTRIBUTE ) === group
	);

	// The clicked anchor always leads a chain it somehow fell out of, rather than
	// silently paging from somewhere else.
	return links.includes( link )
		? { links, index: links.indexOf( link ) }
		: { links: [ link ], index: 0 };
}

/**
 * Build one slide descriptor from a legacy anchor.
 *
 * The text fields are the viewer's, not LiteBox's — it displayed none of them —
 * so they are filled from what the markup already carries: the anchor's `title`,
 * and the image's `alt`. A descriptor with no resolvable media still returns, as
 * the error state, because dropping it would silently renumber the chain.
 *
 * @param {HTMLAnchorElement} link Trigger.
 * @return {Object} Slide descriptor.
 */
function itemFor( link ) {
	const media = resolveLegacyMedia( link.getAttribute( 'href' ) ) || {
		type: 'frame',
		provider: '',
		full: '',
	};
	const image = link.querySelector( 'img' );

	return {
		...media,
		title: link.getAttribute( 'title' ) || image?.getAttribute( 'alt' ) || '',
		caption: '',
		description: '',
		thumb: image?.currentSrc || image?.src || '',
		alt: image?.getAttribute( 'alt' ) || '',
		trigger: link,
	};
}

/**
 * Handle a click anywhere in the document.
 *
 * The guards match `bindLightbox()`'s exactly, for the same reasons: a modified
 * or secondary click must still open the file in a new tab, and `preventDefault()`
 * runs only once a viewer has actually opened — so if anything here throws or the
 * module is off, the anchor does what its markup says.
 *
 * @param {MouseEvent} event Click.
 * @return {void}
 */
function onClick( event ) {
	if (
		event.defaultPrevented ||
		event.button > 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey
	) {
		return;
	}

	const link = event.target instanceof Element ? event.target.closest( 'a' ) : null;

	if ( ! link || ! isLegacyTrigger( link ) ) {
		return;
	}

	const { links, index } = chainFor( link );

	// `autoplay` is true because LiteBox appended `?autoplay=1` to every provider
	// player it built. A framed page and an image ignore it.
	//
	// `legacy` is what draws 1.x's chrome for THIS open and only this one: the
	// overlay is shared with the gallery block, whose lightbox must look like
	// 1.2.0's, and the two can appear on the same page.
	if ( open( links.map( itemFor ), index, { opener: link, autoplay: true, legacy: true } ) ) {
		event.preventDefault();
	}
}

/**
 * Switch the compatibility layer on, if this site is one that needs it.
 *
 * @param {Function} openViewer The viewer's `openItems( items, index, options )`.
 * @return {void}
 */
export function initLegacy( openViewer ) {
	if ( bound || ! enabled() || 'function' !== typeof openViewer ) {
		return;
	}

	bound = true;
	open = openViewer;
	stampClassicGroups();
	document.addEventListener( 'click', onClick );
}

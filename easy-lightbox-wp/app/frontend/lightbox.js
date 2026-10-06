/**
 * The lightbox viewer — ShapedGallery's own, with no third-party engine.
 *
 * A commercial library was evaluated and rejected: every maintained one that
 * covers this feature set (Fancybox, lightGallery) is commercial for a product
 * sold to end users, which a GPL-2.0-or-later plugin cannot bundle at any price.
 * WordPress core reached the same conclusion for its own image lightbox and
 * hand-wrote ~7KB against the Interactivity API. This is the same call.
 *
 * "Not a library" does not mean "not built on the platform". The overlay is a
 * real `<dialog>` opened with `showModal()`, so the top layer, the focus trap,
 * background `inert` and Escape are the browser's — see `lightbox/overlay.js`
 * for why that matters more in a WordPress theme than anywhere else. Pointer
 * Events give one code path for mouse, touch and pen. What is left for us is the
 * part that is genuinely ours: turning the module's settings into a viewer.
 *
 * ## Layout
 *
 * | File                    | Owns                                          |
 * | ----------------------- | --------------------------------------------- |
 * | `lightbox.js` (here)    | config, binding, open/close, paging           |
 * | `lightbox/overlay.js`   | the DOM: counter, arrows, close button        |
 * | `lightbox/gestures.js`  | zoom, pan, pinch, swipe-to-page               |
 * | `lightbox/slides.js`    | the slide set and each slide's media element  |
 *
 * ## Where the configuration comes from
 *
 * The viewer's two settings are SITE-WIDE (Settings → Modules → Lightbox),
 * delivered once on `shaped_gallery_frontend.lightbox`. The overlay is a single
 * element shared by every gallery on the page, so per-container `data-*` would be
 * N copies of one answer. What IS per gallery — whether a click opens the viewer at
 * all — is resolved server-side before the markup reaches us.
 *
 * ## Its own bundle
 *
 * A SEPARATE entry (§10) enqueued from
 * `Gallery::render()` only when `GalleryOptions::lightbox_active()`, so a gallery
 * whose click action is "None" or "Custom URL" — or a site with the module off —
 * downloads neither the script nor its CSS. On a site that came from Easy Lightbox
 * `Deprecated\EasyLightboxCompat` enqueues the same bundle site-wide, which is the
 * one deliberate exception to that rule and is argued for where it is taken (§25).
 * It self-initialises rather than being imported by `shaped-layout.js`, which is
 * what keeps the two bundles independent.
 *
 * ## Degrading
 *
 * Nothing here rewrites the markup. Each trigger is already a real `<a href>` to
 * the full-size file, and this only intercepts the click — so with the module off
 * (no enqueue), with JavaScript off, or if this bundle fails to load, every tile
 * is still a working link. That is the whole fallback, and it is why
 * `preventDefault()` runs only after a viewer has actually opened.
 */

import './lightbox.scss';

import { createGestures, ZOOM_MIN } from './lightbox/gestures';
import {
	buildOverlay,
	closeModal,
	focusables,
	needsManualFocus,
	openModal,
} from './lightbox/overlay';
import { buildMedia, isImage, preloadNeighbours, slidesFor } from './lightbox/slides';
import { initLegacy } from '../deprecated/litebox';

/**
 * The module's shipped viewer configuration.
 *
 * Mirrors `Modules\Lightbox::frontend_config()`. Used when the payload is absent
 * (a cached page, a filtered enqueue) so the viewer still behaves rather than
 * opening an unconfigured one.
 *
 * @type {Object}
 */
const DEFAULTS = {
	enabled: true,
	closeOutside: true,
	counter: true,
};

/** Fallback control labels, used when the localized strings are absent. */
const LABELS = {
	dialog: 'Image lightbox',
	close: 'Close',
	previous: 'Previous image',
	next: 'Next image',
	counter: '%1$d / %2$d',
	error: 'This image could not be loaded.',
};

/** Viewer state. One overlay per page, so one state object. */
const state = {
	el: null,
	nodes: {},
	gestures: null,
	manualFocus: false,
	items: [],
	index: 0,
	opener: null,
	autoplay: true,
	scrollLock: null,
};

/** @type {?Object} Resolved once, on the first open. */
let settings = null;

/** Containers already bound, so a double `init()` cannot double-open. */
const bound = new WeakSet();

/**
 * The viewer configuration, merged over the shipped defaults.
 *
 * @return {Object} Config.
 */
export function config() {
	if ( settings ) {
		return settings;
	}
	const payload = window.shaped_gallery_frontend?.lightbox || {};
	settings = { ...DEFAULTS, ...payload };
	return settings;
}

/**
 * A localized control label.
 *
 * @param {string} key Label key.
 * @return {string} Label.
 */
function label( key ) {
	return window.shaped_gallery_frontend?.i18n?.lightbox?.[ key ] || LABELS[ key ];
}

/**
 * Fill `%d` / `%1$d` / `%2$d` placeholders — the format PHP's `sprintf()` strings
 * use, kept so translators write one pattern for both runtimes.
 *
 * @param {string}             template Localized template.
 * @param {...(number|string)} values   Positional values.
 * @return {string} Formatted string.
 */
function format( template, ...values ) {
	let position = 0;
	return String( template ).replace( /%(?:(\d+)\$)?d/g, ( match, index ) => {
		const value = index ? values[ Number( index ) - 1 ] : values[ position++ ];
		return undefined === value ? match : String( value );
	} );
}

/* ---------------- Scroll lock ---------------- */

/**
 * Stop the page behind the overlay from scrolling.
 *
 * The padding compensation matters: hiding a classic scrollbar reclaims its
 * width, and without this the whole page — including any `position: fixed` theme
 * header — jumps sideways as the viewer opens. Overlay scrollbars report 0 and
 * are unaffected. The previous inline values are restored rather than cleared, so
 * a theme that sets its own is not trampled.
 *
 * @return {void}
 */
function lockScroll() {
	if ( state.scrollLock ) {
		return;
	}
	const { style } = document.body;
	const gap = window.innerWidth - document.documentElement.clientWidth;

	state.scrollLock = { overflow: style.overflow, paddingRight: style.paddingRight };
	style.overflow = 'hidden';
	if ( gap > 0 ) {
		const current = parseFloat( window.getComputedStyle( document.body ).paddingRight ) || 0;
		style.paddingRight = `${ current + gap }px`;
	}
}

/**
 * Restore the page's scrolling.
 *
 * @return {void}
 */
function unlockScroll() {
	if ( ! state.scrollLock ) {
		return;
	}
	document.body.style.overflow = state.scrollLock.overflow;
	document.body.style.paddingRight = state.scrollLock.paddingRight;
	state.scrollLock = null;
}

/* ---------------- Build ---------------- */

/**
 * Build (once) and return the overlay.
 *
 * @return {HTMLDialogElement} Overlay.
 */
function ensureOverlay() {
	if ( state.el ) {
		return state.el;
	}

	const cfg = config();
	const { el, nodes } = buildOverlay( cfg, label, { step, close } );

	state.el = el;
	state.nodes = nodes;
	state.manualFocus = needsManualFocus( el );

	state.gestures = createGestures( nodes.stage, {
		onStep: step,
		onZoom: onZoomChange,
		// Images only: there is nothing to zoom on a video, and pinching one would
		// fight its own controls.
		canZoom: () => isImage( state.items[ state.index ] ),
		canSwipe: () => state.items.length > 1,
	} );

	document.body.appendChild( el );
	bindOverlay( el, cfg );

	return el;
}

/**
 * Wire the overlay's own listeners. Bound once, on the single overlay.
 *
 * @param {HTMLDialogElement} el  Overlay.
 * @param {Object}            cfg Viewer config.
 * @return {void}
 */
function bindOverlay( el, cfg ) {
	// `cancel` is the dialog's own Escape — a modal that cannot be dismissed from
	// the keyboard is broken (§14).
	el.addEventListener( 'cancel', ( event ) => {
		event.preventDefault();
		close();
	} );
	// A native dialog can also be closed by the platform (form submission, a
	// browser affordance), so the teardown hangs off `close` rather than only off
	// our own handler.
	el.addEventListener( 'close', teardown );

	if ( cfg.closeOutside ) {
		// The backdrop is the dialog itself and its centring body — a click that
		// landed on either missed every control and the media.
		el.addEventListener( 'click', ( event ) => {
			if ( event.target === el || event.target === state.nodes.body ) {
				close();
			}
		} );
	}

	el.addEventListener( 'keydown', onKeyDown );
}

/* ---------------- Keyboard ---------------- */

/**
 * Keyboard handling while the overlay is open.
 *
 * Escape is the dialog's `cancel` event, not here. The Tab trap is only needed on
 * the fallback path — a native modal dialog traps focus itself, and running a
 * second trap over it would fight the browser.
 *
 * @param {KeyboardEvent} event Event.
 * @return {void}
 */
function onKeyDown( event ) {
	const el = state.el;

	if ( state.manualFocus && 'Tab' === event.key ) {
		const nodes = focusables( el );
		if ( ! nodes.length ) {
			return;
		}
		const first = nodes[ 0 ];
		const last = nodes[ nodes.length - 1 ];
		const active = el.ownerDocument.activeElement;
		if ( event.shiftKey && ( active === first || active === el ) ) {
			event.preventDefault();
			last.focus();
		} else if ( ! event.shiftKey && active === last ) {
			event.preventDefault();
			first.focus();
		}
		return;
	}

	// Escape on the fallback path, where there is no `cancel` event to listen to.
	if ( state.manualFocus && 'Escape' === event.key ) {
		close();
		return;
	}

	if ( 'ArrowLeft' === event.key ) {
		step( -1 );
	} else if ( 'ArrowRight' === event.key ) {
		step( 1 );
	} else if ( 'Home' === event.key ) {
		go( 0 );
	} else if ( 'End' === event.key ) {
		go( state.items.length - 1 );
	}
}

/* ---------------- Controls ---------------- */

/**
 * Reflect a zoom change on the stage — the pinch / wheel / double-click gestures
 * are the only way in, so this is the whole of the viewer's zoom UI.
 *
 * @param {number} zoom Current level.
 * @return {void}
 */
function onZoomChange( zoom ) {
	state.el?.classList.toggle( 'is-zoomed', zoom > ZOOM_MIN );
}

/* ---------------- Slides ---------------- */

/**
 * Announce a change through the polite live region.
 *
 * @param {string} text Message.
 * @return {void}
 */
function announce( text ) {
	if ( state.nodes.live ) {
		state.nodes.live.textContent = text;
	}
}

/**
 * Render the current slide.
 *
 * @return {void}
 */
function renderSlide() {
	const item = state.items[ state.index ];
	if ( ! item ) {
		return;
	}
	const cfg = config();
	const { stage } = state.nodes;

	// `null` means the descriptor cannot be shown at all — an unframable URL or a
	// dead inline selector, both of which only the compatibility layer can produce
	// (§25). The placeholder carries `__media` so the stage's existing error
	// styling applies to it with no second rule.
	const built = buildMedia( item, state.autoplay );
	const failed = ! built;
	const media = built || document.createElement( 'div' );

	if ( failed ) {
		media.className = 'sp-shaped-gallery-lightbox__media';
	}

	stage.replaceChildren( media );
	// Zoom is per slide: carrying it across would leave the next image cropped
	// for no reason the visitor asked for.
	state.gestures.reset();

	// Loading and error state. A broken URL must say so rather than leave a blank
	// stage the visitor cannot tell from a slow one.
	if ( failed ) {
		stage.classList.remove( 'is-loading' );
		stage.classList.add( 'is-error' );
	} else if ( media instanceof HTMLImageElement ) {
		stage.classList.toggle( 'is-loading', ! media.complete );
		stage.classList.remove( 'is-error' );
		media.addEventListener( 'load', () => {
			stage.classList.remove( 'is-loading' );
			// The natural size is only known now, and the pan bounds depend on it.
			state.gestures.render();
		}, { once: true } );
		media.addEventListener( 'error', () => {
			stage.classList.remove( 'is-loading' );
			stage.classList.add( 'is-error' );
			announce( label( 'error' ) );
		}, { once: true } );
	} else {
		stage.classList.remove( 'is-loading', 'is-error' );
	}

	const position = format( label( 'counter' ), state.index + 1, state.items.length );
	if ( cfg.counter ) {
		state.nodes.counter.textContent = position;
	}

	updateNav();
	preloadNeighbours( state.items, state.index );

	// The failure is what the visitor needs to hear, and it has to be announced
	// LAST — the position would otherwise overwrite it in the live region.
	announce( failed ? label( 'error' ) : position );
}

/**
 * Show / hide the arrows for the current set.
 *
 * Paging always wraps, so neither arrow is ever a dead end — a one-slide set is
 * the only case with nothing to navigate to.
 *
 * @return {void}
 */
function updateNav() {
	const single = state.items.length < 2;

	if ( state.nodes.prev ) {
		state.nodes.prev.hidden = single;
	}
	if ( state.nodes.next ) {
		state.nodes.next.hidden = single;
	}
}

/**
 * Jump to an index.
 *
 * @param {number} index Target index.
 * @return {void}
 */
function go( index ) {
	if ( index < 0 || index >= state.items.length || index === state.index ) {
		return;
	}
	state.index = index;
	renderSlide();
}

/**
 * Step forward / back, wrapping at either end.
 *
 * @param {number} delta +1 / -1.
 * @return {void}
 */
function step( delta ) {
	const total = state.items.length;
	if ( total < 2 ) {
		return;
	}
	state.index = ( state.index + delta + total ) % total;
	renderSlide();
}

/* ---------------- Open / close ---------------- */

/**
 * Open the viewer for a gallery.
 *
 * @param {HTMLElement}       box  Gallery container.
 * @param {HTMLAnchorElement} link The clicked trigger.
 * @return {boolean} Whether the viewer opened.
 */
export function openLightbox( box, link ) {
	const { items, index } = slidesFor( box, link );

	return openItems( items, index, {
		opener: link,
		// The opening gallery's Image & Video AutoPlay setting governs this
		// session's video slides; the module's own AutoPlay is the slideshow, a
		// different thing.
		autoplay: '0' !== box.dataset.videoAutoplay,
	} );
}

/**
 * Open the viewer on a slide set that is already resolved.
 *
 * The viewer's actual primitive, and the ONLY seam anything outside this file
 * opens it through. `openLightbox()` above is the gallery's caller; the Easy
 * Lightbox compatibility layer (§25) is the other, and it exists so that era of
 * markup reuses this overlay — its focus trap, its keyboard, its gestures —
 * rather than shipping a second viewer beside it.
 *
 * @param {Object[]}    items              Slide descriptors.
 * @param {number}      index              Starting position.
 * @param {Object}      [options]          Open options.
 * @param {HTMLElement} [options.opener]   Element focus returns to on close.
 * @param {boolean}     [options.autoplay] Whether video slides start playing.
 * @param {boolean}     [options.legacy]   Opened by the compatibility layer (§25).
 * @return {boolean} Whether the viewer opened.
 */
export function openItems( items, index = 0, options = {} ) {
	const cfg = config();

	if ( ! cfg.enabled || ! items.length ) {
		return false;
	}

	const el = ensureOverlay();

	// Remember the trigger so focus can return to it on close. The native dialog
	// restores focus itself, but only to whatever had it when `showModal()` ran —
	// which is the trigger only because we open synchronously from its click.
	const active = el.ownerDocument.activeElement;
	state.opener = active instanceof HTMLElement ? active : options.opener || null;
	state.items = items;
	// Clamped rather than trusted: a caller that resolved its own set has no
	// `indexOf` guarantee behind it.
	state.index = Math.min( Math.max( 0, index ), items.length - 1 );
	state.autoplay = false !== options.autoplay;
	/*
	 * Which era of chrome to draw, decided per OPEN rather than per element (§25).
	 * One overlay serves the block and the Easy Lightbox compatibility layer, so a
	 * page with both kinds of content would otherwise have to pick one appearance
	 * for both: either the block's own lightbox silently takes on 1.x's controls,
	 * or a returning visitor's legacy links stop looking like the plugin they
	 * installed. `app/deprecated/litebox-chrome.scss` hangs off this class and
	 * nothing else does, so deleting that folder makes this line inert, then
	 * removable with the rest of the layer.
	 */
	el.classList.toggle( 'is-legacy', true === options.legacy );

	openModal( el );
	lockScroll();
	renderSlide();

	( state.nodes.close || focusables( el )[ 0 ] || el ).focus();

	return true;
}

/**
 * Close the viewer.
 *
 * @return {void}
 */
export function close() {
	if ( state.el ) {
		closeModal( state.el );
	}
	// The native path also reaches teardown via the dialog's `close` event; it is
	// idempotent, so calling it here covers the fallback path too.
	teardown();
}

/**
 * Everything that must happen however the overlay was dismissed.
 *
 * @return {void}
 */
function teardown() {
	if ( ! state.el ) {
		return;
	}
	state.el.classList.remove( 'is-zoomed' );
	// Stop playback rather than leaving a hidden video or embed running.
	state.nodes.stage?.replaceChildren();
	unlockScroll();

	if ( state.opener && 'function' === typeof state.opener.focus ) {
		state.opener.focus();
	}
	state.opener = null;
}

/* ---------------- Binding ---------------- */

/**
 * Wire one gallery, via ONE delegated click handler on its container.
 *
 * Delegation (rather than a listener per link) means items appended later by Ajax
 * pagination open the viewer with no rebinding: the slide set is rebuilt from the
 * CURRENT DOM at click time.
 *
 * `preventDefault()` runs only once a viewer has actually opened — that is what
 * keeps the fallback honest: if the module is off or something throws, the click
 * does what the markup says and navigates to the full-size file.
 *
 * @param {HTMLElement} box Container.
 * @return {void}
 */
export function bindLightbox( box ) {
	if ( 'lightbox' !== box.dataset.click || ! config().enabled || bound.has( box ) ) {
		return;
	}
	bound.add( box );

	box.addEventListener( 'click', ( event ) => {
		// Leave modified and secondary clicks alone, so open-in-new-tab still works.
		if ( event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey ) {
			return;
		}
		const link = event.target.closest( '.sp-shaped-gallery__link' );
		if ( ! link || ! box.contains( link ) ) {
			return;
		}
		if ( openLightbox( box, link ) ) {
			event.preventDefault();
		}
	} );
}

/**
 * Bind every lightbox-clicking gallery on the page.
 *
 * Self-initialising: this bundle is enqueued only
 * when the renderer decided a gallery needs it, so it has no reason to wait for
 * `shaped-layout.js` — and not importing it is what keeps the two bundles from
 * pulling each other in.
 *
 * @return {void}
 */
export function init() {
	document
		.querySelectorAll( '.sp-shaped-gallery[data-click="lightbox"]' )
		.forEach( ( box ) => bindLightbox( box ) );

	// Easy Lightbox compatibility (§25). A no-op unless the server said this site
	// came from that plugin, so a new install binds nothing extra — and the whole
	// of it lives under `app/deprecated/`, to be deleted with the layer.
	initLegacy( openItems );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

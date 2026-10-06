/**
 * The viewer's chrome: the overlay element, its counter, arrows and close button —
 * everything that is DOM rather than behaviour.
 *
 * ## Why a real `<dialog>`
 *
 * The overlay is a `<dialog>` opened with `showModal()`, not a `position: fixed`
 * div. That buys three things a hand-rolled overlay has to fight for, in a
 * WordPress theme it does not control:
 *
 * 1. **The top layer.** A modal dialog paints above every stacking context on the
 *    page, so a theme's sticky header, a cookie banner or a chat widget cannot sit
 *    on top of it. No `z-index` arms race.
 * 2. **A real focus trap**, plus `inert` on everything behind it — the background
 *    is hidden from assistive tech as well as from Tab, which a manual trap only
 *    approximates.
 * 3. **Escape**, as a cancellable `cancel` event.
 *
 * `showModal()` is unavailable in a few old browsers and in jsdom, so
 * {@see openModal} degrades to the `open` attribute and the caller runs its own
 * focus trap ({@see needsManualFocus}). That fallback is the path the unit tests
 * exercise, which is deliberate: it is the one that can rot unnoticed.
 *
 * The Item Counter is HIDDEN rather than removed when the module switches it off:
 * it is a `<span>`, so it is neither focusable nor announced while hidden. Buttons
 * are a different matter — a hidden one is still reachable by Tab — but the viewer
 * builds only controls it always offers, so none of them is conditional.
 */

/** 24px stroke glyphs, keyed by the control they belong to. */
const ICONS = {
	close: '<path d="M6 6l12 12M18 6L6 18"/>',
	prev: '<path d="M15 5l-7 7 7 7"/>',
	next: '<path d="M9 5l7 7-7 7"/>',
};

/**
 * Build an icon button.
 *
 * @param {string}   name    Icon key, also the button's modifier class.
 * @param {string}   text    Accessible name.
 * @param {Function} onClick Click handler.
 * @return {HTMLButtonElement} Button.
 */
function iconButton( name, text, onClick ) {
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.className = `sp-shaped-gallery-lightbox__tool sp-shaped-gallery-lightbox__tool--${ name }`;
	button.setAttribute( 'aria-label', text );
	button.title = text;
	setGlyph( button, name );
	button.addEventListener( 'click', onClick );
	return button;
}

/**
 * Draw a button's glyph, keeping the `<svg>` and its attributes.
 *
 * @param {HTMLElement} button Button.
 * @param {string}      name   Icon key.
 * @return {void}
 */
function setGlyph( button, name ) {
	let svg = button.querySelector( 'svg' );
	if ( ! svg ) {
		svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		svg.setAttribute( 'viewBox', '0 0 24 24' );
		svg.setAttribute( 'width', '20' );
		svg.setAttribute( 'height', '20' );
		svg.setAttribute( 'fill', 'none' );
		svg.setAttribute( 'stroke', 'currentColor' );
		svg.setAttribute( 'stroke-width', '1.6' );
		svg.setAttribute( 'stroke-linecap', 'round' );
		svg.setAttribute( 'stroke-linejoin', 'round' );
		svg.setAttribute( 'aria-hidden', 'true' );
		svg.setAttribute( 'focusable', 'false' );
		button.appendChild( svg );
	}
	svg.innerHTML = ICONS[ name ];
}

/**
 * Build the overlay for one configuration.
 *
 * @param {Object}   cfg      Viewer config.
 * @param {Function} label    `(key) => string` label lookup.
 * @param {Object}   handlers Callbacks the controls invoke.
 * @return {{el: HTMLDialogElement, nodes: Object}} Overlay and its parts.
 */
export function buildOverlay( cfg, label, handlers ) {
	const el = document.createElement( 'dialog' );
	el.className = 'sp-shaped-gallery-lightbox';
	el.setAttribute( 'aria-label', label( 'dialog' ) );

	el.innerHTML =
		'<div class="sp-shaped-gallery-lightbox__bar">' +
		'<span class="sp-shaped-gallery-lightbox__counter"></span>' +
		'<div class="sp-shaped-gallery-lightbox__tools"></div>' +
		'</div>' +
		'<div class="sp-shaped-gallery-lightbox__body">' +
		'<figure class="sp-shaped-gallery-lightbox__figure">' +
		'<div class="sp-shaped-gallery-lightbox__stage"></div>' +
		'</figure>' +
		'</div>' +
		'<div class="sp-shaped-gallery-lightbox__live" aria-live="polite" aria-atomic="true"></div>';

	const nodes = {
		bar: el.querySelector( '.sp-shaped-gallery-lightbox__bar' ),
		counter: el.querySelector( '.sp-shaped-gallery-lightbox__counter' ),
		tools: el.querySelector( '.sp-shaped-gallery-lightbox__tools' ),
		body: el.querySelector( '.sp-shaped-gallery-lightbox__body' ),
		figure: el.querySelector( '.sp-shaped-gallery-lightbox__figure' ),
		stage: el.querySelector( '.sp-shaped-gallery-lightbox__stage' ),
		live: el.querySelector( '.sp-shaped-gallery-lightbox__live' ),
	};

	buildArrows( nodes, label, handlers );
	nodes.close = iconButton( 'close', label( 'close' ), () => handlers.close() );
	nodes.tools.appendChild( nodes.close );

	nodes.counter.hidden = ! cfg.counter;

	return { el, nodes };
}

/**
 * Add the prev / next controls. Always built: paging is the viewer's core
 * behaviour. They are hidden — not omitted — for a single-slide set, so the
 * overlay does not reflow between galleries ({@see updateNav} in `lightbox.js`).
 *
 * @param {Object}   nodes    Overlay parts.
 * @param {Function} label    Label lookup.
 * @param {Object}   handlers Callbacks.
 * @return {void}
 */
function buildArrows( nodes, label, handlers ) {
	nodes.prev = iconButton( 'prev', label( 'previous' ), () => handlers.step( -1 ) );
	nodes.next = iconButton( 'next', label( 'next' ), () => handlers.step( 1 ) );
	nodes.prev.classList.add( 'sp-shaped-gallery-lightbox__nav' );
	nodes.next.classList.add( 'sp-shaped-gallery-lightbox__nav' );
	nodes.body.append( nodes.prev, nodes.next );
}

/**
 * Whether the browser gave us a real modal, or the caller must trap focus itself.
 *
 * @param {HTMLDialogElement} el Overlay.
 * @return {boolean} True when a manual focus trap is required.
 */
export function needsManualFocus( el ) {
	return 'function' !== typeof el.showModal;
}

/**
 * Show the overlay.
 *
 * @param {HTMLDialogElement} el Overlay.
 * @return {void}
 */
export function openModal( el ) {
	if ( 'function' === typeof el.showModal ) {
		// Guard: showModal() throws if the dialog is already open.
		if ( ! el.open ) {
			el.showModal();
		}
		return;
	}
	el.setAttribute( 'open', '' );
}

/**
 * Hide the overlay.
 *
 * @param {HTMLDialogElement} el Overlay.
 * @return {void}
 */
export function closeModal( el ) {
	if ( 'function' === typeof el.close ) {
		if ( el.open ) {
			el.close();
		}
		return;
	}
	el.removeAttribute( 'open' );
}

/**
 * The overlay's focusable controls, in DOM order. Only needed on the manual
 * path; the native dialog traps focus itself.
 *
 * @param {HTMLElement} el Overlay.
 * @return {HTMLElement[]} Focusable elements.
 */
export function focusables( el ) {
	return Array.from(
		el.querySelectorAll( 'button, a[href], iframe, video, [tabindex]:not([tabindex="-1"])' )
	).filter( ( node ) => ! node.disabled && ! node.hidden && ! node.closest( '[hidden]' ) );
}

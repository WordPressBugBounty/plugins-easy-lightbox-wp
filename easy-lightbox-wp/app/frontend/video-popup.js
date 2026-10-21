/**
 * Video Play Mode → Popup: the video popup.
 *
 * Its own player, not the lightbox. Video Play Mode is the one control over what a
 * video click does, so the popup answers to neither the gallery's click action nor
 * the Lightbox module: a Popup video opens the same way whether the images around
 * it open the lightbox, follow a URL or do nothing, and whether it was rendered
 * with the page or appended later by Load More. It lives in the gallery's own
 * frontend bundle beside Inline playback (`media.js`) for the same reason: a
 * gallery never has to load the viewer to play a video.
 *
 * The overlay is a `<dialog>` opened with `showModal()` — the top layer, `inert`
 * behind it and Escape come from the browser — built once per page and shared by
 * every gallery on it, since only one video ever plays in it at a time. Closing it
 * empties the stage, which is what stops playback.
 *
 * Opening and closing are announced on the gallery container as
 * `sp-shaped-gallery:video-popup` (`detail.open`), so a runtime with motion of its
 * own can hold still while a video plays over it.
 */

import { EMBED_PARAMS, isEmbedProvider } from './embeds';

/**
 * The event the popup announces itself with, on the gallery container.
 *
 * @type {string}
 */
export const VIDEO_POPUP_EVENT = 'sp-shaped-gallery:video-popup';

/**
 * English fallbacks for the popup's labels; the localized
 * `shaped_gallery_frontend.i18n.videoPopup` payload wins.
 *
 * @type {Object<string,string>}
 */
const LABELS = {
	dialog: 'Video player',
	close: 'Close video',
};

/**
 * The page's one popup, once built.
 *
 * @type {?{dialog: HTMLDialogElement, stage: HTMLElement, close: HTMLButtonElement}}
 */
let view = null;

/**
 * What the open popup has to give back when it closes.
 *
 * @type {?{opener: HTMLElement, box: HTMLElement, overflow: string, paddingRight: string}}
 */
let session = null;

/**
 * A label, translated when the payload carries it.
 *
 * @param {string} key Label key.
 * @return {string} Label.
 */
function label( key ) {
	return window.shaped_gallery_frontend?.i18n?.videoPopup?.[ key ] || LABELS[ key ];
}

/**
 * Build (once) and return the popup.
 *
 * @param {Document} doc Owning document.
 * @return {{dialog: HTMLDialogElement, stage: HTMLElement, close: HTMLButtonElement}} Popup parts.
 */
function ensureView( doc ) {
	if ( view && view.dialog.isConnected ) {
		return view;
	}

	const dialog = doc.createElement( 'dialog' );
	dialog.className = 'sp-shaped-gallery-video-popup';
	dialog.setAttribute( 'aria-label', label( 'dialog' ) );

	const close = doc.createElement( 'button' );
	close.type = 'button';
	close.className = 'sp-shaped-gallery-video-popup__close';
	close.setAttribute( 'aria-label', label( 'close' ) );
	// A constant glyph, never data — the one place markup is parsed here.
	close.innerHTML =
		'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';

	const stage = doc.createElement( 'div' );
	stage.className = 'sp-shaped-gallery-video-popup__stage';

	dialog.append( close, stage );
	doc.body.appendChild( dialog );

	close.addEventListener( 'click', closeVideoPopup );
	// The dialog box itself is the backdrop: the stage and the close button sit
	// inside it, so a click that lands on the dialog landed outside the video.
	dialog.addEventListener( 'click', ( event ) => {
		if ( event.target === dialog ) {
			closeVideoPopup();
		}
	} );
	// `cancel` is the native Escape; the keydown covers the `open`-attribute
	// fallback, where the browser handles no key at all.
	dialog.addEventListener( 'cancel', ( event ) => {
		event.preventDefault();
		closeVideoPopup();
	} );
	dialog.addEventListener( 'keydown', ( event ) => {
		if ( 'Escape' === event.key ) {
			event.preventDefault();
			closeVideoPopup();
		}
	} );

	view = { dialog, stage, close };
	return view;
}

/**
 * Stop the page behind the popup from scrolling, without the layout jumping by
 * the scrollbar's width.
 *
 * @param {Document} doc Owning document.
 * @return {{overflow: string, paddingRight: string}} What to restore.
 */
function lockScroll( doc ) {
	const { style } = doc.body;
	const saved = { overflow: style.overflow, paddingRight: style.paddingRight };
	const gap = doc.defaultView.innerWidth - doc.documentElement.clientWidth;

	style.overflow = 'hidden';
	if ( gap > 0 ) {
		const current = parseFloat( doc.defaultView.getComputedStyle( doc.body ).paddingRight ) || 0;
		style.paddingRight = `${ current + gap }px`;
	}
	return saved;
}

/**
 * Open a player in the popup.
 *
 * The caller builds the player — the same element Inline playback swaps into a
 * tile — so the two modes cannot frame a provider differently. An embed's iframe
 * takes the provider's own frame (16:9, or 9:16 for TikTok); a file plays at its
 * own ratio inside the viewport.
 *
 * @param {HTMLElement} box      Gallery container.
 * @param {HTMLElement} opener   The play button that was activated.
 * @param {HTMLElement} player   An unattached `<video>` or `<iframe>`.
 * @param {string}      provider Provider id.
 * @return {void}
 */
export function openVideoPopup( box, opener, player, provider ) {
	const doc = box.ownerDocument;
	const parts = ensureView( doc );

	if ( session ) {
		closeVideoPopup();
	}

	player.className = 'sp-shaped-gallery-video-popup__media';
	if ( isEmbedProvider( provider ) ) {
		player.setAttribute( 'style', EMBED_PARAMS[ provider ].frame );
	}
	parts.stage.replaceChildren( player );

	session = { opener, box, ...lockScroll( doc ) };

	if ( 'function' === typeof parts.dialog.showModal ) {
		// Guard: showModal() throws if the dialog is already open.
		if ( ! parts.dialog.open ) {
			parts.dialog.showModal();
		}
	} else {
		parts.dialog.setAttribute( 'open', '' );
	}
	parts.close.focus();

	box.dispatchEvent( new CustomEvent( VIDEO_POPUP_EVENT, { detail: { open: true } } ) );

	if ( 'VIDEO' === player.tagName && player.autoplay ) {
		const play = player.play();
		if ( play && 'function' === typeof play.catch ) {
			// Autoplay may be refused (policy / decode error) — the controls remain.
			play.catch( () => {} );
		}
	}
}

/**
 * Close the popup: stop the video, give the page its scrolling back and return
 * focus to the button that opened it.
 *
 * @return {void}
 */
export function closeVideoPopup() {
	if ( ! view || ! session ) {
		return;
	}
	const { opener, box, overflow, paddingRight } = session;
	session = null;

	// Emptying the stage is what stops a video or an embed that is still playing.
	view.stage.replaceChildren();

	if ( 'function' === typeof view.dialog.close ) {
		if ( view.dialog.open ) {
			view.dialog.close();
		}
	} else {
		view.dialog.removeAttribute( 'open' );
	}

	box.ownerDocument.body.style.overflow = overflow;
	box.ownerDocument.body.style.paddingRight = paddingRight;

	// `preventScroll`: the opener can sit in a slide the slider has moved away
	// from, and focusing it must not drag the page to it.
	if ( opener && opener.isConnected && 'function' === typeof opener.focus ) {
		opener.focus( { preventScroll: true } );
	}

	box.dispatchEvent( new CustomEvent( VIDEO_POPUP_EVENT, { detail: { open: false } } ) );
}

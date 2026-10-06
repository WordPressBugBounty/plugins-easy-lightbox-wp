/**
 * Image & Video runtime — the two behaviours from the Image & Video Settings
 * panel that CSS alone cannot express:
 *
 * - **Image Preloader:** reveal each tile's media once it has actually loaded, by
 *   marking the figure `.is-loaded` (the stylesheet owns the placeholder itself).
 * - **Video Play Mode → Inline:** swap a click-to-play poster for a real playing
 *   `<video>` in the tile.
 *
 * Everything is delegated on the gallery container and re-armed on
 * `sp-shaped-gallery:page-loaded`, so Ajax-appended tiles are covered without this
 * module knowing anything about pagination. Which behaviours apply is decided
 * SERVER-side (container modifier classes + `data-video`), so this file holds no
 * attribute defaults or feature gates of its own.
 */

import { isEmbedProvider, embedUrl } from './embeds';

/**
 * Media elements inside a figure that the preloader waits on.
 *
 * @type {string}
 */
const MEDIA_SELECTOR = 'img, video';

/**
 * Reveal a figure as soon as its media has loaded (or failed — a broken image
 * must not leave a placeholder shimmering forever).
 *
 * @param {HTMLElement} figure Gallery item.
 * @return {void}
 */
function watchFigure( figure ) {
	if ( figure.classList.contains( 'is-loaded' ) ) {
		return;
	}

	const media = Array.from( figure.querySelectorAll( MEDIA_SELECTOR ) );
	if ( ! media.length ) {
		figure.classList.add( 'is-loaded' );
		return;
	}

	// Already-decoded media (cached, or eager and complete before this ran).
	const ready = ( node ) =>
		'VIDEO' === node.tagName ? node.readyState >= 1 : node.complete;
	if ( media.every( ready ) ) {
		figure.classList.add( 'is-loaded' );
		return;
	}

	let pending = media.filter( ( node ) => ! ready( node ) ).length;
	const settle = () => {
		pending -= 1;
		if ( pending <= 0 ) {
			figure.classList.add( 'is-loaded' );
		}
	};

	media.forEach( ( node ) => {
		if ( ready( node ) ) {
			return;
		}
		const event = 'VIDEO' === node.tagName ? 'loadeddata' : 'load';
		node.addEventListener( event, settle, { once: true } );
		node.addEventListener( 'error', settle, { once: true } );
	} );
}

/**
 * Arm the preloader for every not-yet-revealed tile in a gallery.
 *
 * @param {HTMLElement} box Gallery container.
 * @return {void}
 */
function armPreloader( box ) {
	box.querySelectorAll( '.sp-shaped-gallery__item' ).forEach( watchFigure );
}

/**
 * Build the player element for a click-to-play tile.
 *
 * A provider embed's URL is an iframe player, so it gets an `<iframe>` (with the
 * provider's autoplay parameter — the click IS the intent to play); a media file
 * gets a `<video>` seeded with the poster already on screen, so playback starts
 * with no extra request. Either way the element keeps `.sp-shaped-gallery__img`, so
 * the per-item styling (filter, opacity, radius) continues to apply.
 *
 * @param {Document}          doc      Owning document.
 * @param {string}            src      File or embed URL (`data-video-src`).
 * @param {string}            provider Provider id (`data-video-provider`).
 * @param {?HTMLImageElement} poster   The poster image being replaced, if any.
 * @return {HTMLElement} Player element.
 */
function buildPlayer( doc, src, provider, poster ) {
	if ( isEmbedProvider( provider ) ) {
		const frame = doc.createElement( 'iframe' );
		frame.className = 'sp-shaped-gallery__img';
		frame.src = embedUrl( src, provider, true );
		frame.title = 'Video player';
		frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
		frame.allowFullscreen = true;
		frame.setAttribute( 'frameborder', '0' );
		return frame;
	}

	const video = doc.createElement( 'video' );
	video.className = 'sp-shaped-gallery__img';
	video.src = src;
	video.controls = true;
	video.autoplay = true;
	video.playsInline = true;
	if ( poster && poster.currentSrc ) {
		video.poster = poster.currentSrc;
	}
	return video;
}

/**
 * Replace a click-to-play tile's poster with a live player.
 *
 * @param {HTMLElement} trigger The `.sp-shaped-gallery__play` button.
 * @return {void}
 */
function playInline( trigger ) {
	const figure = trigger.closest( '.sp-shaped-gallery__item' );
	const src = figure ? figure.dataset.videoSrc : '';
	if ( ! figure || ! src ) {
		return;
	}

	const player = buildPlayer(
		figure.ownerDocument,
		src,
		figure.dataset.videoProvider || '',
		trigger.querySelector( 'img' )
	);

	trigger.replaceWith( player );
	// The tile is now the player; a second activation would have nothing to swap.
	delete figure.dataset.videoSrc;

	if ( 'VIDEO' === player.tagName ) {
		const play = player.play();
		if ( play && 'function' === typeof play.catch ) {
			// Autoplay may be refused (policy / decode error) — the controls remain.
			play.catch( () => {} );
		}
	}
}

/**
 * Wire the inline-video click handler for a gallery.
 *
 * @param {HTMLElement} box Gallery container.
 * @return {void}
 */
function bindInlineVideo( box ) {
	box.addEventListener( 'click', ( event ) => {
		const trigger = event.target.closest( '.sp-shaped-gallery__play' );
		if ( trigger && box.contains( trigger ) ) {
			event.preventDefault();
			playInline( trigger );
		}
	} );
}

/**
 * Initialise the Image & Video behaviours for one gallery.
 *
 * Safe to call for every layout — each behaviour self-gates on what the renderer
 * emitted, so a gallery using none of them binds nothing.
 *
 * @param {HTMLElement} box Gallery container (`.sp-shaped-gallery`).
 * @return {void}
 */
export function initMedia( box ) {
	const preloader = box.classList.contains( 'sp-shaped-gallery--preloader' );
	const inlineVideo = 'inline' === box.dataset.video;

	if ( preloader ) {
		// The placeholder only hides media once JS is running (see style.scss), so
		// without this class a no-JS page still shows every image.
		box.classList.add( 'is-js' );
		armPreloader( box );
	}
	if ( inlineVideo ) {
		bindInlineVideo( box );
	}

	// Ajax-appended tiles arrive later; only the preloader needs per-element work
	// (inline video is delegated on the container).
	if ( preloader ) {
		box.addEventListener( 'sp-shaped-gallery:page-loaded', () => armPreloader( box ) );
	}
}

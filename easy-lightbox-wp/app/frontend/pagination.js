/**
 * Ajax Pagination runtime (Load More).
 *
 * Progressive enhancement over the SSR first window: the renderer emits only the
 * first `showPerView` items plus a `.sp-shaped-gallery__pagination` bar (a SIBLING of
 * the grid) carrying the render context (`data-ap-ctx` / `data-ap-gallery`), the
 * total count and the per-page size. This module fetches each window from the
 * public `shaped-gallery/v1/gallery-page` REST route — which re-renders the slice
 * SERVER-SIDE through the same LayoutRenderer path — and appends the returned
 * `<figure>` markup, so no figure template is duplicated in JS and all escaping
 * stays server-side.
 *
 * Design notes:
 * - Offset-based: each request asks for the count already in the DOM, so the
 *   append math is device-independent. The server owns the window SIZE
 *   (device-resolved showPerView, capped).
 * - One request at a time (re-entrancy guard) + AbortController cancels a stale
 *   request.
 * - Appended tiles need no lightbox rebinding (the viewer delegates clicks on the
 *   box); measured layouts re-lay via the injected `reflow`, re-running as late
 *   images load.
 * - Emits `sp-shaped-gallery:page-loaded` / `sp-shaped-gallery:pagination-done` on the
 *   box so add-ons can react to loaded content.
 */
import { deviceKey } from '@shaped-gallery/lib/responsive';

/** Localized config (REST endpoint + nonce + live-region strings). */
const CFG = ( 'undefined' !== typeof window && window.shaped_gallery_frontend ) || {};

/**
 * Parse a returned HTML fragment into its item figures and duotone `<svg>` defs.
 *
 * @param {string} html Fragment markup.
 * @return {{figures: HTMLElement[], svgs: HTMLElement[]}} Split nodes.
 */
function parseFragment( html ) {
	const tmp = document.createElement( 'div' );
	tmp.innerHTML = html || '';
	const figures = [];
	const svgs = [];
	Array.from( tmp.children ).forEach( ( node ) => {
		if ( node.classList && node.classList.contains( 'sp-shaped-gallery__item' ) ) {
			figures.push( node );
		} else {
			// Duotone <filter> defs — keep them so filter:url(#id) resolves.
			svgs.push( node );
		}
	} );
	return { figures, svgs };
}

/**
 * Insert duotone `<svg>` defs before the grid, skipping any whose filter id is
 * already in the document (page swaps would otherwise duplicate them).
 *
 * @param {HTMLElement}   box  Gallery container.
 * @param {HTMLElement[]} svgs SVG def nodes.
 */
function insertSvgs( box, svgs ) {
	svgs.forEach( ( svg ) => {
		const filter = svg.querySelector( 'filter[id]' );
		if ( filter && box.ownerDocument.getElementById( filter.id ) ) {
			return;
		}
		box.parentNode.insertBefore( svg, box );
	} );
}

/**
 * Re-lay measured layouts now and again as late images load.
 *
 * @param {HTMLElement}   box     Gallery container.
 * @param {Function}      reflow  Measured-layout reflow(box), or undefined.
 * @param {HTMLElement[]} figures Newly-inserted figures (for img-load hooks).
 */
function relayout( box, reflow, figures ) {
	if ( 'function' !== typeof reflow ) {
		return;
	}
	reflow( box );
	figures.forEach( ( fig ) => {
		fig.querySelectorAll( 'img' ).forEach( ( img ) => {
			if ( ! img.complete ) {
				img.addEventListener( 'load', () => reflow( box ), { once: true } );
			}
		} );
	} );
}

/**
 * Build the window-request URL for an offset + device.
 *
 * @param {string} ctx       Render-context key.
 * @param {number} galleryId Gallery CPT id (0 when absent).
 * @param {number} offset    Item offset.
 * @param {string} device    desktop|tablet|mobile.
 * @param {number} [seed]    Random-order permutation seed; 0 when order is Default.
 * @return {string} Request URL.
 */
function requestUrl( ctx, galleryId, offset, device, seed = 0 ) {
	const params = new URLSearchParams( { offset: String( offset ), device } );
	if ( ctx ) {
		params.set( 'ctx', ctx );
	}
	if ( galleryId ) {
		params.set( 'galleryId', String( galleryId ) );
	}
	// Random order: echo back the deck the SSR page was dealt from, or this window
	// would be sliced out of a different permutation and repeat items the visitor
	// has already seen (see Render\ItemOrder). Absent for Default order.
	if ( seed ) {
		params.set( 'seed', String( seed ) );
	}
	return `${ CFG.restUrl }?${ params.toString() }`;
}

/**
 * Fetch one window, aborting whatever was in flight.
 *
 * @param {Object} state Runtime state holding the live AbortController.
 * @param {string} url   Request URL.
 * @return {Promise<Object>} Parsed response payload.
 */
async function fetchWindow( state, url ) {
	if ( state.controller ) {
		state.controller.abort();
	}
	state.controller = 'AbortController' in window ? new AbortController() : null;

	const res = await fetch( url, {
		headers: CFG.nonce ? { 'X-WP-Nonce': CFG.nonce } : {},
		signal: state.controller ? state.controller.signal : undefined,
	} );
	if ( ! res.ok ) {
		throw new Error( `HTTP ${ res.status }` );
	}
	return res.json();
}

/**
 * Wire the pagination runtime for one gallery.
 *
 * @param {HTMLElement} box           Gallery container (`.sp-shaped-gallery`).
 * @param {HTMLElement} bar           Pagination bar (`.sp-shaped-gallery__pagination`).
 * @param {Object}      deps          Dependencies.
 * @param {Function}    [deps.reflow] Measured-layout reflow(box) (justified/masonry).
 * @return {void}
 */
export function initPagination( box, bar, { reflow } = {} ) {
	// Without the localized endpoint the controls can't work — leave the SSR
	// window as a complete, valid gallery rather than a broken control.
	if ( ! CFG.restUrl ) {
		return;
	}

	const shared = {
		box,
		bar,
		reflow,
		total: parseInt( box.dataset.apTotal, 10 ) || 0,
		ctx: box.dataset.apCtx || '',
		galleryId: parseInt( box.dataset.apGallery, 10 ) || 0,
		// Present only under Random order; 0 means "Default, nothing to keep in step".
		seed: parseInt( box.dataset.apSeed, 10 ) || 0,
		status: bar.querySelector( '.sp-shaped-gallery__pg-status' ),
		i18n: CFG.i18n || {},
	};

	initLoadMore( shared );
}

/**
 * Announce a message via a bar's polite live region.
 *
 * @param {HTMLElement} status Live-region element (or null).
 * @param {string}      msg    Message.
 */
function announce( status, msg ) {
	if ( status && msg ) {
		status.textContent = msg;
	}
}

/**
 * Load More: fetch the next window and append it to the grid.
 *
 * @param {Object} shared Shared context (box, bar, reflow, counts, ctx, i18n).
 * @return {void}
 */
function initLoadMore( shared ) {
	const { box, bar, reflow, ctx, galleryId, seed, status, i18n } = shared;
	const button = bar.querySelector( '.sp-shaped-gallery__load-more' );
	const endMsg = bar.querySelector( '.sp-shaped-gallery__end' );

	const state = {
		loading: false,
		done: false,
		loaded: box.querySelectorAll( '.sp-shaped-gallery__item' ).length,
		total: shared.total,
		retries: 0,
		controller: null,
		// Bumped by every request. A response (or a `finally`) whose generation is
		// stale must not touch the DOM or the loading flag.
		generation: 0,
	};

	const setLoading = ( on ) => {
		if ( button ) {
			button.classList.toggle( 'is-loading', on );
			button.disabled = on;
		} else {
			bar.classList.toggle( 'is-loading', on );
		}
	};

	const finish = () => {
		state.done = true;
		if ( button ) {
			button.hidden = true;
		}
		if ( endMsg ) {
			endMsg.hidden = false;
		}
		box.dispatchEvent(
			new CustomEvent( 'sp-shaped-gallery:pagination-done', {
				detail: { loaded: state.loaded, total: state.total },
			} )
		);
	};

	const loadNext = async () => {
		if ( state.loading || state.done ) {
			return;
		}
		const generation = ++state.generation;
		state.loading = true;
		setLoading( true );
		announce( status, i18n.loading || '' );

		try {
			const data = await fetchWindow(
				state,
				requestUrl( ctx, galleryId, state.loaded, deviceKey(), seed )
			);
			if ( generation !== state.generation ) {
				return; // Superseded by a newer request.
			}
			const { figures, svgs } = parseFragment( data.html || '' );
			insertSvgs( box, svgs );
			figures.forEach( ( fig ) => box.appendChild( fig ) );
			relayout( box, reflow, figures );

			state.loaded += figures.length;
			state.total = data.total || state.total;
			state.retries = 0;
			announce( status, i18n.loaded || '' );
			box.dispatchEvent(
				new CustomEvent( 'sp-shaped-gallery:page-loaded', {
					detail: { added: figures.length, loaded: state.loaded, total: state.total },
				} )
			);
			if ( ! data.hasMore || state.loaded >= state.total || 0 === figures.length ) {
				finish();
			}
		} catch ( err ) {
			if ( ( err && 'AbortError' === err.name ) || generation !== state.generation ) {
				return; // Superseded by a newer request.
			}
			state.retries += 1;
			announce( status, i18n.error || '' );
		} finally {
			if ( generation === state.generation ) {
				state.loading = false;
				setLoading( false );
				state.controller = null;
			}
		}
	};

	// `loadNext` self-guards while a request is in flight or the set is exhausted,
	// so binding it once — before the initial state is decided — is sufficient.
	if ( button ) {
		button.addEventListener( 'click', loadNext );
	}

	if ( state.loaded >= state.total ) {
		// Nothing more to load (defensive — the renderer only emits a bar when the
		// total exceeds the first window).
		finish();
	}
}

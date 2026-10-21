/**
 * Ready Patterns — the data layer.
 *
 * One hook owns every server conversation the library has: the manifest, the
 * refresh, the favourites and the import. Lifting it out of the modal is what
 * §8 asks for (server state does not live in a component's props), and it is
 * what lets the two entry points — the editor header button and the gallery
 * block's toolbar — mount the same UI without duplicating the plumbing.
 */
import apiFetch from '@wordpress/api-fetch';
import { parse } from '@wordpress/blocks';
import { dispatch } from '@wordpress/data';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ENDPOINTS } from './constants';
import { curatedOrder } from './list';

/**
 * Flatten the manifest's `{ layoutSlug: items[] }` map into one array.
 *
 * The group key is copied onto each row as `layout` so the grid can filter by
 * layout without carrying the grouping structure around. The server already
 * writes the same value into the row (and treats the group key as
 * authoritative), so this is a re-statement, not a second source of truth.
 *
 * Concatenating the groups loses how they interleave, so the result is put
 * back in the serving site's drag order by `curatedOrder()`.
 *
 * @param {Object} groups Manifest `patterns` map.
 * @return {Array<Object>} Flat pattern list.
 */
function flatten( groups ) {
	if ( ! groups || 'object' !== typeof groups ) {
		return [];
	}

	return curatedOrder(
		Object.keys( groups ).reduce( ( all, slug ) => {
			const rows = groups[ slug ];
			if ( ! Array.isArray( rows ) ) {
				return all;
			}
			rows.forEach( ( row ) => all.push( { ...row, layout: row.layout || slug } ) );
			return all;
		}, [] )
	);
}

/**
 * Strip the attributes that must never survive an import.
 *
 * The provider already does this (`SP_Shaped_Pattern_Markup` on the serving site),
 * so on a
 * current install this pass finds nothing. It runs anyway because the two
 * halves ship and update independently: a customer site can be pointed at an
 * older provider, or at a stale cached manifest, and the failure mode is
 * invisible — a duplicated `uniqueId` silently makes two galleries from one
 * pattern share a CSS scope, and a stale `galleryId` points the renderer at a
 * post that is not theirs. Dropping a key that is already absent costs nothing.
 *
 * @param {Array<Object>} blocks Parsed blocks.
 * @return {Array<Object>} Blocks with local-only attributes removed.
 */
function scrubBlocks( blocks ) {
	if ( ! Array.isArray( blocks ) ) {
		return [];
	}

	return blocks.map( ( block ) => {
		const next = { ...block, attributes: { ...block.attributes } };

		if ( 'shaped-gallery/gallery' === block.name ) {
			delete next.attributes.uniqueId;
			delete next.attributes.galleryId;
		}

		if ( Array.isArray( block.innerBlocks ) && block.innerBlocks.length ) {
			next.innerBlocks = scrubBlocks( block.innerBlocks );
		}

		return next;
	} );
}

/**
 * @typedef {Object} PatternLibraryState
 * @property {Array<Object>} patterns     Flat pattern list.
 * @property {Array<Object>} layouts      Layout Type facets.
 * @property {Array<Object>} categories   Category Type facets.
 * @property {Array<string>} favorites    Favourited ids, as strings.
 * @property {boolean}       isLoading    First load in flight.
 * @property {boolean}       isRefreshing Manual refresh in flight.
 * @property {number}        insertingId  Pattern id currently importing, 0 when idle.
 * @property {string}        error        Human-readable error, '' when fine.
 */

/**
 * Load and operate the pattern library.
 *
 * @return {PatternLibraryState & Object} State plus `refresh`, `insert`,
 *                                        `toggleFavorite` and `dismissError`.
 */
export default function usePatternLibrary() {
	const [ state, setState ] = useState( {
		patterns: [],
		layouts: [],
		categories: [],
		favorites: [],
		isLoading: true,
		isRefreshing: false,
		insertingId: 0,
		error: '',
	} );

	// The hook outlives no component, but an import can resolve after the modal
	// closes — writing state then is the classic React warning and, worse, would
	// resurrect a spinner on the next open.
	const mounted = useRef( true );
	useEffect( () => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, [] );

	const patch = useCallback( ( next ) => {
		if ( mounted.current ) {
			setState( ( prev ) => ( { ...prev, ...next } ) );
		}
	}, [] );

	/**
	 * Read one manifest into state.
	 *
	 * @param {Object} manifest Server response.
	 * @return {void}
	 */
	const absorb = useCallback(
		( manifest ) => {
			const meta = manifest?.meta_data || {};
			patch( {
				patterns: flatten( manifest?.patterns ),
				layouts: Array.isArray( meta.layouts ) ? meta.layouts : [],
				categories: Array.isArray( meta.categories ) ? meta.categories : [],
				error: '',
			} );
		},
		[ patch ]
	);

	/**
	 * Turn any failure into one displayable sentence.
	 *
	 * @param {Object} error Caught value.
	 * @return {string} Message.
	 */
	const messageFor = ( error ) =>
		error?.message || __( 'The pattern library could not be loaded.', 'easy-lightbox-wp' );

	const load = useCallback(
		async ( refreshing = false ) => {
			patch( refreshing ? { isRefreshing: true } : { isLoading: true } );

			try {
				const manifest = await apiFetch(
					refreshing
						? { path: ENDPOINTS.REFRESH, method: 'POST' }
						: { path: ENDPOINTS.PATTERNS }
				);
				absorb( manifest );
			} catch ( error ) {
				patch( { error: messageFor( error ) } );
			} finally {
				patch( { isLoading: false, isRefreshing: false } );
			}
		},
		[ absorb, patch ]
	);

	// First load: the manifest and the favourites together. Favourites failing is
	// not an error the user needs — the heart simply starts empty.
	useEffect( () => {
		load( false );

		apiFetch( { path: ENDPOINTS.FAVORITES } )
			.then( ( response ) => {
				patch( {
					favorites: ( response?.favorites || [] ).map( String ),
				} );
			} )
			.catch( () => {} );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	const refresh = useCallback( () => load( true ), [ load ] );

	const toggleFavorite = useCallback(
		async ( id ) => {
			const key = String( id );
			const isOn = state.favorites.includes( key );

			// Optimistic: the heart is a preference, and a round trip before it
			// fills in reads as a broken button.
			patch( {
				favorites: isOn
					? state.favorites.filter( ( entry ) => entry !== key )
					: [ ...state.favorites, key ],
			} );

			try {
				const response = await apiFetch( {
					path: ENDPOINTS.FAVORITES,
					method: 'POST',
					data: { id, action: isOn ? 'remove' : 'add' },
				} );
				patch( { favorites: ( response?.favorites || [] ).map( String ) } );
			} catch ( error ) {
				// Put it back rather than leaving the UI claiming a write that failed.
				patch( { favorites: state.favorites } );
			}
		},
		[ patch, state.favorites ]
	);

	/**
	 * Import one pattern into the editor.
	 *
	 * @param {number}   id        Pattern id.
	 * @param {Function} onSuccess Called once the blocks are in the canvas.
	 * @return {Promise<void>} Resolves when the attempt finishes.
	 */
	const insert = useCallback(
		async ( id, onSuccess ) => {
			patch( { insertingId: id, error: '' } );

			try {
				const response = await apiFetch( {
					path: ENDPOINTS.IMPORT,
					method: 'POST',
					data: { id },
				} );

				const markup = response?.rawData;
				if ( ! markup ) {
					throw new Error( __( 'That pattern is empty.', 'easy-lightbox-wp' ) );
				}

				const blocks = scrubBlocks( parse( markup ) );
				if ( ! blocks.length ) {
					throw new Error(
						__( 'That pattern contained no blocks.', 'easy-lightbox-wp' )
					);
				}

				const clientId = blocks[ blocks.length - 1 ].clientId;
				dispatch( 'core/block-editor' ).insertBlocks( blocks );
				dispatch( 'core/block-editor' ).selectBlock( clientId );

				patch( { insertingId: 0 } );
				if ( onSuccess ) {
					onSuccess();
				}

				// The block-editor only draws the selected-block outline on
				// `:focus` (see `content.scss`), and the modal itself returns DOM
				// focus to whatever opened it once it unmounts — stealing focus
				// back from the canvas right after `selectBlock` sets it. Re-focus
				// the block's own wrapper (found by the same `data-block`
				// attribute the block editor's own tab-nav code queries by) once
				// the modal's unmount has settled. The canvas is an iframe on
				// modern WP, so check that document too.
				setTimeout( () => {
					const selector = `[data-block="${ clientId }"]`;
					const canvas = document.querySelector(
						'iframe[name="editor-canvas"]'
					);
					const node =
						canvas?.contentDocument?.querySelector( selector ) ||
						document.querySelector( selector );
					if ( node ) {
						node.focus();
					}
				}, 0 );
			} catch ( error ) {
				patch( { insertingId: 0, error: messageFor( error ) } );
			}
		},
		[ patch ]
	);

	const dismissError = useCallback( () => patch( { error: '' } ), [ patch ] );

	return { ...state, refresh, insert, toggleFavorite, dismissError };
}

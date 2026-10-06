/**
 * Ready Patterns — the visible list, and moving through it.
 *
 * Filtering used to live inside `PatternGrid`, which was fine while the grid was
 * the only thing that needed it. The preview header's prev/next pair changed
 * that: stepping to "the next pattern" must mean the next CARD, not the next row
 * of the unfiltered manifest, or Next would walk into patterns the active facets
 * exclude. So the pass moved up to `Library` and the grid now renders what it is
 * handed — one ordered list, two consumers (§18).
 *
 * Everything here is pure and WP-free on purpose: `tests/js/unit` imports it
 * directly.
 */
import { SORT } from './constants';

/**
 * Sort a list without mutating the caller's array.
 *
 * @param {Array<Object>} items Patterns.
 * @param {string}        sort  Sort key.
 * @return {Array<Object>} Sorted copy.
 */
function sortPatterns( items, sort ) {
	if ( SORT.LATEST === sort ) {
		return [ ...items ].sort( ( a, b ) => b.ID - a.ID );
	}
	if ( SORT.POPULAR === sort ) {
		return [ ...items ].sort( ( a, b ) => ( b.hit || 0 ) - ( a.hit || 0 ) );
	}
	// Curated: the order the serving site dragged them into, which the manifest
	// already carries. Re-sorting would throw that away.
	return items;
}

/**
 * Apply every facet, the search box and the favourites toggle, then sort.
 *
 * In-memory by design: the whole hardened manifest is already in the browser, so
 * this is one pass over an array rather than a round trip — which is also why the
 * result count can be live without asking the server what it would be.
 *
 * @param {Array<Object>} patterns              Full hardened manifest.
 * @param {Object}        query                 Current facet state.
 * @param {string}        [query.search]        Search needle.
 * @param {string}        [query.tier]          `all`|`free`|`pro`.
 * @param {string}        [query.layout]        Layout slug, or `all`.
 * @param {string}        [query.category]      Category id, or `all`.
 * @param {boolean}       [query.favoritesOnly] Favourites-only toggle.
 * @param {Array<string>} [query.favorites]     Favourited ids as strings.
 * @param {string}        [query.sort]          Sort key.
 * @return {Array<Object>} The rows the grid shows, in the order it shows them.
 */
export function visiblePatterns( patterns, query = {} ) {
	const {
		search = '',
		tier = 'all',
		layout = 'all',
		category = 'all',
		favoritesOnly = false,
		favorites = [],
		sort = SORT.DEFAULT,
	} = query;

	const needle = search.trim().toLowerCase();

	const filtered = ( patterns || [] ).filter( ( item ) => {
		if ( needle && ! ( item.name || '' ).toLowerCase().includes( needle ) ) {
			return false;
		}
		if ( 'pro' === tier && ! item.pro ) {
			return false;
		}
		if ( 'free' === tier && item.pro ) {
			return false;
		}
		if ( 'all' !== layout && item.layout !== layout ) {
			return false;
		}
		if (
			'all' !== category &&
			! ( Array.isArray( item.category ) && item.category.map( String ).includes( String( category ) ) )
		) {
			return false;
		}
		if ( favoritesOnly && ! favorites.includes( String( item.ID ) ) ) {
			return false;
		}
		return true;
	} );

	return sortPatterns( filtered, sort );
}

/**
 * Step an index through a list, wrapping at both ends.
 *
 * Wrapping rather than disabling: a disabled Next at the last pattern takes the
 * focus with it (the browser drops focus off a control that becomes disabled),
 * which breaks the drawer's keyboard loop for the one user who needs it most.
 * Wrapping keeps both controls alive and dead-ends nowhere.
 *
 * @param {number} index Current index.
 * @param {number} delta Step, usually -1 or 1.
 * @param {number} total List length.
 * @return {number} The new index, or -1 when there is nothing to step through.
 */
export function stepIndex( index, delta, total ) {
	if ( ! total || 0 > index ) {
		return -1;
	}
	return ( ( ( index + delta ) % total ) + total ) % total;
}

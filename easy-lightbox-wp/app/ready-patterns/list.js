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
 * Put a flattened manifest back in the serving site's drag order.
 *
 * The manifest arrives grouped by layout, and flattening concatenates the
 * groups — so without this every pattern of the first layout shows before any
 * of the next, whatever order the team dragged them into. Each row's `order`
 * is its position across the whole catalogue. A row without one (an older
 * provider, or a junk value hardened to 0) keeps its place relative to the
 * other unpositioned rows and falls in behind the positioned ones; the sort is
 * stable, so a manifest with no positions at all comes back untouched.
 *
 * @param {Array<Object>} rows Flattened patterns.
 * @return {Array<Object>} Sorted copy.
 */
export function curatedOrder( rows ) {
	const rank = ( row ) => ( 0 < row.order ? row.order : Infinity );

	return [ ...( rows || [] ) ].sort( ( a, b ) => {
		const ra = rank( a );
		const rb = rank( b );
		return ra === rb ? 0 : ra - rb;
	} );
}

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
 * Step an index through a list, stopping at both ends.
 *
 * Stopping rather than wrapping, as the reference preview (WP Carousel Free's)
 * does: the drawer's footer reads "Patterns n of m", and a Next that jumps from
 * m back to 1 makes that count lie about where the list ends.
 *
 * This used to wrap because a `disabled` Next at the last pattern takes the focus
 * with it — the browser drops focus off a control that becomes disabled, breaking
 * the keyboard loop for the one user who needs it most. The drawer now marks a
 * dead end with `aria-disabled` instead, which keeps the control focusable, so
 * that reason no longer forces a wrap.
 *
 * @param {number} index Current index.
 * @param {number} delta Step, usually -1 or 1.
 * @param {number} total List length.
 * @return {number} The new index, or -1 when the step would leave the list or
 *                  there is nothing to step through.
 */
export function stepIndex( index, delta, total ) {
	if ( ! total || 0 > index ) {
		return -1;
	}
	const next = index + delta;
	return 0 <= next && next < total ? next : -1;
}

/**
 * Item ordering — the JS twin of `ItemOrder` (src/Render/ItemOrder.php).
 *
 * The editor canvas has to show what the "Order" control does, and the renderer's
 * Random order is a pure function of a seed (a self-contained xorshift32 driving a
 * Fisher-Yates shuffle). This is the same generator, step for step, so a given seed
 * deals the same deck in the canvas as it does on the page — which is also what
 * lets the unit test pin the permutations against the ones PHP produced.
 *
 * The stored `items[]` order is never touched: Random is a view over it, exactly as
 * it is on the front end, so switching back to Default restores the author's order.
 */

/** The only non-default order today (mirrors the renderer's `'random' === $order`). */
export const RANDOM_ORDER = 'random';

/** Replacement for a zero state — xorshift cannot leave 0 (mirrors normalize_seed()). */
const ZERO_STATE = 0x9e3779b9;

/**
 * A usable 32-bit generator state. Mirrors ItemOrder::normalize_seed().
 *
 * @param {number} seed Raw seed.
 * @return {number} Unsigned 32-bit non-zero state.
 */
function normalizeSeed( seed ) {
	const state = Math.abs( Math.trunc( Number( seed ) || 0 ) ) % 4294967296;
	return 0 === state ? ZERO_STATE : state;
}

/**
 * Advance the xorshift32 state. Mirrors ItemOrder::next(); `>>> 0` is the 32-bit
 * mask PHP applies after each step (JS bitwise operators work on signed 32-bit).
 *
 * @param {number} state Current state (non-zero, unsigned).
 * @return {number} Next state (unsigned).
 */
function next( state ) {
	/* eslint-disable no-bitwise -- xorshift32 is bit arithmetic by definition; it must match PHP step for step. */
	state = ( state ^ ( state << 13 ) ) >>> 0;
	state = ( state ^ ( state >>> 17 ) ) >>> 0;
	state = ( state ^ ( state << 5 ) ) >>> 0;
	/* eslint-enable no-bitwise */
	return state;
}

/**
 * A fresh permutation seed in the renderer's own range (1 … 0x7FFFFFFF).
 *
 * @return {number} Seed.
 */
export function newOrderSeed() {
	return 1 + Math.floor( Math.random() * 0x7ffffffe );
}

/**
 * Apply the gallery's `order` attribute to a list of items. Mirrors
 * ItemOrder::apply(): anything but `random` (or fewer than two items) returns the
 * list untouched, otherwise a seeded Fisher-Yates copy.
 *
 * @param {Object[]} items Items in stored order.
 * @param {string}   order Order attribute (`default`|`random`).
 * @param {number}   seed  Permutation seed.
 * @return {Object[]} Items in display order (the same array when unchanged).
 */
export function applyOrder( items, order, seed ) {
	if ( RANDOM_ORDER !== order || ! Array.isArray( items ) || items.length < 2 ) {
		return items;
	}

	const out = items.slice();
	let state = normalizeSeed( seed );

	for ( let i = out.length - 1; i > 0; i-- ) {
		state = next( state );
		const j = state % ( i + 1 );
		[ out[ i ], out[ j ] ] = [ out[ j ], out[ i ] ];
	}

	return out;
}

/**
 * Fold an edit made against a DISPLAY-ordered list back into the stored order.
 *
 * The canvas edits the shuffled list (alt text, duotone, Replace, removal), but
 * `items[]` must keep the author's order — writing the display order back would make
 * Random permanent. So each stored item is replaced by its edited counterpart
 * (matched by `keyOf`), items the edit dropped are dropped, and anything new is
 * appended.
 *
 * One exception keeps a Replace / Crop honest: the swapped tile has a NEW key, so it
 * matches nothing by key. Its stored item is missing from the edit, and the item at
 * the same DISPLAY position is one the store has never seen — that pairing is the
 * replacement, and it takes the stored item's slot instead of jumping to the end.
 *
 * @param {Object[]} stored Items in stored order.
 * @param {Object[]} shown  The display-ordered list the canvas was showing.
 * @param {Object[]} edited Items as edited, in display order.
 * @param {Function} keyOf  Item → identity key (image-blocks' `itemKey`).
 * @return {Object[]} Items in stored order carrying the edits.
 */
export function mergeEditedItems( stored, shown, edited, keyOf ) {
	const editedByKey = new Map( edited.map( ( item ) => [ keyOf( item ), item ] ) );
	const storedKeys = new Set( stored.map( keyOf ) );
	const shownIndex = new Map( shown.map( ( item, index ) => [ keyOf( item ), index ] ) );
	const used = new Set();

	const merged = [];
	stored.forEach( ( item ) => {
		const key = keyOf( item );
		let counterpart = editedByKey.get( key );
		if ( ! counterpart ) {
			// Dropped by key — a removal, or a Replace whose tile now has a new key.
			const candidate = edited[ shownIndex.get( key ) ];
			if ( candidate && ! storedKeys.has( keyOf( candidate ) ) ) {
				counterpart = candidate;
			}
		}
		if ( counterpart && ! used.has( keyOf( counterpart ) ) ) {
			used.add( keyOf( counterpart ) );
			merged.push( counterpart );
		}
	} );

	edited.forEach( ( item ) => {
		if ( ! used.has( keyOf( item ) ) ) {
			used.add( keyOf( item ) );
			merged.push( item );
		}
	} );

	return merged;
}

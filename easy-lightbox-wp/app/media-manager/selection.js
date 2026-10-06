/**
 * Pure helpers for media-manager selection state.
 *
 * Selection is an ordered `MediaItem[]` (order === click order). Side-effect-free
 * so it is cheap to unit-test and safe to reuse from any component.
 */

/**
 * Whether an item id is in the selection.
 *
 * @param {Array}         items Current selection.
 * @param {number|string} id    Item id.
 * @return {boolean} True when selected.
 */
export const isSelected = ( items, id ) => items.some( ( item ) => item.id === id );

/**
 * Toggle an item in the selection, preserving order (appended on add).
 *
 * @param {Array}  items Current selection.
 * @param {Object} item  MediaItem to toggle.
 * @return {Array} Next selection (new array).
 */
export const toggleSelection = ( items, item ) =>
	isSelected( items, item.id )
		? items.filter( ( current ) => current.id !== item.id )
		: [ ...items, item ];

/**
 * Merge new items into the selection, skipping ids already present.
 *
 * @param {Array} items    Current selection.
 * @param {Array} incoming Items to add.
 * @return {Array} Next selection (new array).
 */
export const mergeSelection = ( items, incoming ) => {
	const next = items.slice();
	( incoming || [] ).forEach( ( item ) => {
		if ( ! isSelected( next, item.id ) ) {
			next.push( item );
		}
	} );
	return next;
};

/**
 * Apply a field patch to one item in the selection (matched by id).
 *
 * @param {Array}         items Current selection.
 * @param {number|string} id    Target item id.
 * @param {Object}        patch Partial MediaItem fields to merge.
 * @return {Array} Next selection (new array; unchanged if id absent).
 */
export const patchItem = ( items, id, patch ) =>
	items.map( ( item ) => ( item.id === id ? { ...item, ...patch } : item ) );

/**
 * Ids of the contiguous span between two ids in an ordered id list (inclusive,
 * direction-agnostic). Empty when either id is absent from the list.
 *
 * @param {Array}         orderedIds Visible ids in display order.
 * @param {number|string} fromId     One endpoint (e.g. the anchor).
 * @param {number|string} toId       The other endpoint (e.g. the clicked tile).
 * @return {Array} Ids from the lower endpoint to the higher, inclusive.
 */
export const rangeBetween = ( orderedIds, fromId, toId ) => {
	const from = orderedIds.indexOf( fromId );
	const to = orderedIds.indexOf( toId );
	if ( from === -1 || to === -1 ) {
		return [];
	}
	const [ lo, hi ] = from <= to ? [ from, to ] : [ to, from ];
	return orderedIds.slice( lo, hi + 1 );
};

/**
 * Resolve the next selected-id set for a modifier-aware click, mirroring the
 * WordPress media grid's bulk-select behaviour:
 *
 *   - Shift-click: add the contiguous span from the anchor to the clicked tile
 *     (within the visible list), leaving the anchor put so the next shift-click
 *     re-ranges from the same origin.
 *   - Plain / Ctrl / Cmd click: toggle the clicked tile and make it the anchor.
 *     (WordPress toggles on a plain click too, so a bare click and a Ctrl-click
 *     are equivalent — both add or remove the single tile.)
 *
 * Order of `selectedIds` is preserved; newly added ids append in visible order.
 *
 * @param {Object}           params
 * @param {Array}            params.selectedIds Currently selected ids (ordered).
 * @param {Array}            params.visibleIds  Ids shown in the grid (display order).
 * @param {number|string}    params.id          The clicked tile's id.
 * @param {?(number|string)} params.anchorId    Current range anchor (or null).
 * @param {boolean}          [params.range]     Shift held → range-add.
 * @return {{ selectedIds: Array, anchorId: (number|string) }} Next state.
 */
export const resolveIdSelection = ( { selectedIds, visibleIds, id, anchorId, range } ) => {
	// Shift-click: union the anchor→target span into the selection; anchor holds.
	if (
		range &&
		anchorId !== null &&
		anchorId !== undefined &&
		visibleIds.includes( anchorId ) &&
		visibleIds.includes( id )
	) {
		const span = rangeBetween( visibleIds, anchorId, id );
		const additions = span.filter( ( sid ) => ! selectedIds.includes( sid ) );
		return { selectedIds: [ ...selectedIds, ...additions ], anchorId };
	}

	// Plain / Ctrl / Cmd click: toggle just this tile and reseat the anchor on it.
	const nextIds = selectedIds.includes( id )
		? selectedIds.filter( ( sid ) => sid !== id )
		: [ ...selectedIds, id ];
	return { selectedIds: nextIds, anchorId: id };
};

/**
 * Item-array flavour of {@link resolveIdSelection} for callers whose selection is
 * a `MediaItem[]` (order === gallery order). Resolves on ids, then rebuilds the
 * item array in the resulting order, reusing known objects so any edits survive.
 *
 * @param {Object}           params
 * @param {Array}            params.selected Current selection (MediaItem[], ordered).
 * @param {Array}            params.visible  Visible grid items (MediaItem[], ordered).
 * @param {Object}           params.item     The clicked item.
 * @param {?(number|string)} params.anchorId Current range anchor (or null).
 * @param {boolean}          [params.range]  Shift held → range-add.
 * @return {{ selected: Array, anchorId: (number|string) }} Next state.
 */
export const resolveSelection = ( { selected, visible, item, anchorId, range } ) => {
	const { selectedIds, anchorId: nextAnchor } = resolveIdSelection( {
		selectedIds: selected.map( ( entry ) => entry.id ),
		visibleIds: visible.map( ( entry ) => entry.id ),
		id: item.id,
		anchorId,
		range,
	} );
	// Known objects: prefer already-selected (carries edits), then visible, then
	// the clicked item as a last resort.
	const byId = new Map();
	[ ...visible, item, ...selected ].forEach( ( entry ) => byId.set( entry.id, entry ) );
	return {
		selected: selectedIds.map( ( id ) => byId.get( id ) ).filter( Boolean ),
		anchorId: nextAnchor,
	};
};

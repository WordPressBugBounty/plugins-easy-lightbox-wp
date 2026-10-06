/**
 * Bridge between the block's `items` attribute (MediaItem[] — the single
 * persistence + SSR source of truth) and the editor-only `core/image` inner
 * blocks that give each image the NATIVE WordPress image toolbar.
 *
 * These helpers are pure so they can be unit-tested (see §20) and reused by the
 * controlled-inner-blocks sync in EditableGalleryPreview. Nothing here touches
 * the store; the component owns the React/state wiring.
 *
 * Round-trip contract:
 *   items[]  --itemsToImageBlocks-->  core/image blocks (editor only)
 *   blocks[] --blocksToItems------->  items[] (mirrored back, MediaItem fields
 *                                     preserved from the previous items[])
 */
import { createBlock } from '@wordpress/blocks';

/**
 * The renderer's tile class. It is NOT stamped on the proxy image block any more:
 * the editable preview wraps each core/image in its own `.sp-shaped-gallery__item`
 * figure (see ./item-content-filter), because the tile has to hold the Content
 * Settings block as well as the image and a block Gutenberg owns cannot be given
 * extra children. The wrapper is therefore the grid child that the geometry CSS and
 * `useMeasuredLayout` act on, and stamping the class on the inner figure too would
 * make the measured layouts count every tile twice.
 *
 * Still exported, and still stripped in {@see styleClassFromBlock}, because blocks
 * projected by an earlier version carry it in `className` and it must never be
 * mistaken for a Shape/Style choice on the way back to `items`.
 */
export const ITEM_CLASS = 'sp-shaped-gallery__item';

/**
 * Layouts whose editor preview uses editable core/image inner blocks. Any layout
 * absent from this list keeps the static preview.
 */
export const INNER_BLOCK_LAYOUTS = [ 'justified', 'grid', 'masonry' ];

/**
 * Stable key matching a MediaItem to its proxy block across both directions.
 * Prefers the numeric attachment id (the only id core/image itself carries),
 * falling back to the same URL the block is projected with (`thumb || url ||
 * full` — see itemToImageAttributes) rather than the MediaItem's raw `url`.
 * Provider video ids (YouTube's 11-char id) are
 * non-numeric, so they must fall to the URL branch on BOTH sides or the two
 * directions key differently and blocksToItems can never find the original
 * item — silently flattening it into a plain image.
 *
 * @param {Object} item MediaItem.
 * @return {string} Match key.
 */
export function itemKey( item ) {
	return typeof item.id === 'number'
		? `id:${ item.id }`
		: `url:${ item.thumb || item.url || item.full || '' }`;
}

/**
 * @param {Object} block core/image block object.
 * @return {string} Match key (mirrors itemKey).
 */
export function blockKey( block ) {
	return attributesKey( block.attributes || {} );
}

/**
 * The same key from a core/image block's ATTRIBUTES alone, which is all the tile
 * wrapper is handed (see ./item-content-filter).
 *
 * @param {Object} attrs core/image attributes.
 * @return {string} Match key (mirrors itemKey).
 */
export function attributesKey( attrs = {} ) {
	return attrs.id !== undefined && attrs.id !== null
		? `id:${ attrs.id }`
		: `url:${ attrs.url || '' }`;
}

/**
 * The MediaItem fields the ATTACHMENT owns. Everything outside this list is
 * authored on the tile (alt, caption, styleClass, duotone, the per-item Custom
 * URL) and survives a media swap untouched.
 *
 * @type {string[]}
 */
const MEDIA_FIELDS = [
	'id',
	'type',
	'url',
	'thumb',
	'full',
	'poster',
	'width',
	'height',
	'title',
	'description',
	'provider',
];

/**
 * Whether a block still stands for the media of the MediaItem it was projected
 * from — i.e. nothing swapped the image out from under us.
 *
 * Matched on the ATTACHMENT ID alone whenever both sides have one, and never on
 * the URL. Both native controls that change a tile's image mint a NEW attachment:
 * Replace picks another one, and Crop saves through `POST wp/v2/media/{id}/edit`,
 * which always inserts a fresh `-edited` attachment. The URL, by contrast, moves
 * on its own — the block holds whatever size core picked while the item holds the
 * medium-sized display source (see {@see itemToImageAttributes} and
 * normalizeAttachment) — so reading a URL change as a media change would re-adopt
 * a resolved tile on every sync, wiping its dimensions and re-requesting its
 * attachment forever.
 *
 * A provider embed has no numeric id, so it falls back to the shared URL key,
 * which both directions build from the same field (see {@see itemKey}).
 *
 * @param {Object} attrs core/image attributes.
 * @param {Object} item  The MediaItem the block was projected from.
 * @return {boolean} Whether the block's media is still the item's media.
 */
export function mediaMatches( attrs = {}, item = {} ) {
	if ( typeof attrs.id === 'number' && typeof item.id === 'number' ) {
		return attrs.id === item.id;
	}
	return attributesKey( attrs ) === itemKey( item );
}

/**
 * Rebuild a MediaItem around the media a block now points at, after Replace or
 * Crop swapped it.
 *
 * Only `id` and `url` are known here — the block carries nothing else about the
 * new file — so the fields only the attachment can speak for are CLEARED rather
 * than carried over: the previous image's `width`/`height` would lay the new one
 * out at the wrong ratio (they become `data-w`/`data-h`, and the measured layouts
 * fall back to 4:3 when they are absent), and its title/description would caption
 * a picture that is no longer there. {@see unresolvedMediaIds} finds the item in
 * that state and the preview tops it up from the attachment.
 *
 * @param {Object} item  The MediaItem being replaced.
 * @param {Object} attrs core/image attributes carrying the new media.
 * @return {Object} MediaItem for the new media, tile-authored fields intact.
 */
export function adoptBlockMedia( item, attrs = {} ) {
	const url = attrs.url || '';
	return {
		...item,
		id: attrs.id !== undefined && attrs.id !== null ? attrs.id : url,
		// The block can only ever hold an image; a video tile reaches this only by
		// having its poster replaced with a picture, which is exactly what happened.
		type: 'image',
		url,
		thumb: url,
		full: url,
		poster: '',
		width: 0,
		height: 0,
		title: '',
		description: '',
		provider: 'media_library',
	};
}

/**
 * Merge a resolved attachment's fields into the MediaItem standing for it,
 * leaving everything authored on the tile alone.
 *
 * Returns the SAME object when it would change nothing. The caller hangs off
 * `items` and writes the merge back into `items`, so identity is what stops that
 * from feeding itself — an attachment that genuinely reports no dimensions has to
 * settle rather than merge again on every pass.
 *
 * @param {Object}  item  MediaItem to top up.
 * @param {?Object} media MediaItem built from the attachment, or null.
 * @return {Object} The topped-up item, or `item` itself when there is nothing to do.
 */
export function applyMedia( item, media ) {
	if ( ! media ) {
		return item;
	}
	const changed = MEDIA_FIELDS.filter(
		( field ) => media[ field ] !== undefined && media[ field ] !== item[ field ]
	);
	if ( ! changed.length ) {
		return item;
	}
	const next = { ...item };
	changed.forEach( ( field ) => {
		next[ field ] = media[ field ];
	} );
	return next;
}

/**
 * Attachment ids whose MediaItem is still missing everything only the attachment
 * knows — the state {@see adoptBlockMedia} leaves a freshly replaced or cropped
 * tile in. Zero dimensions is the marker because they are the fields the geometry
 * actually needs and the ones a block can never supply.
 *
 * Provider embeds are skipped: their id is not an attachment id, so there is
 * nothing local to look up.
 *
 * @param {Array} items MediaItem[].
 * @return {number[]} Distinct attachment ids to resolve.
 */
export function unresolvedMediaIds( items ) {
	const ids = [];
	( items || [] ).forEach( ( item ) => {
		if ( typeof item.id === 'number' && ! item.width && ! item.height && ! ids.includes( item.id ) ) {
			ids.push( item.id );
		}
	} );
	return ids;
}

/**
 * Block-style class(es) chosen via the native toolbar Shape/Style control
 * (`is-style-rounded`, …), with our own item class stripped and the remaining
 * tokens sorted so comparisons are order-insensitive.
 *
 * @param {Object} attrs core/image attributes.
 * @return {string} Space-joined style classes ('' when none).
 */
function styleClassFromBlock( attrs ) {
	return ( attrs.className || '' )
		.split( /\s+/ )
		.filter( ( c ) => c && c !== ITEM_CLASS )
		.sort()
		.join( ' ' );
}

/**
 * The duotone the native control writes under `style.color.duotone` — a custom
 * color array or a `var:preset|duotone|…` reference; '' when none.
 *
 * @param {Object} attrs core/image attributes.
 * @return {Array|string} Duotone value, or ''.
 */
function duotoneFromBlock( attrs ) {
	const duotone = attrs.style && attrs.style.color ? attrs.style.color.duotone : undefined;
	return duotone === undefined ? '' : duotone;
}

/**
 * Stable string form of a duotone value (color array or preset string) for
 * signature comparison.
 *
 * @param {Array|string} value Duotone value.
 * @return {string} Comparable key.
 */
function duotoneKey( value ) {
	return Array.isArray( value ) ? value.join( ',' ) : value || '';
}

/**
 * Map a MediaItem to core/image block attributes. Fields core/image owns are
 * projected here, INCLUDING the per-image presentation the native toolbar edits
 * (Shape/Style class + duotone) so a stored gallery restores those in the editor
 * and they round-trip. Everything else on the MediaItem (type, poster, width,
 * categories, provider, …) is preserved on the mirror-back, not here.
 *
 * @param {Object} item MediaItem.
 * @return {Object} core/image attributes.
 */
export function itemToImageAttributes( item ) {
	// Shape/Style classes only — the tile class lives on the wrapper (see ITEM_CLASS).
	const classNames = item.styleClass
		? String( item.styleClass ).split( /\s+/ ).filter( Boolean )
		: [];

	const attrs = {
		// Numeric attachment id lets core resolve duotone / replace / styles.
		id: typeof item.id === 'number' ? item.id : undefined,
		url: item.thumb || item.url || item.full || '',
		alt: item.alt || '',
		caption: item.caption || '',
		className: classNames.join( ' ' ),
		sizeSlug: 'large',
		// Gallery click behaviour is owned by the block's clickAction attribute;
		// keep core/image from wrapping the <img> in its own link.
		linkDestination: 'none',
	};

	// Restore a stored duotone so the native control reflects it and SSR matches.
	if ( item.duotone !== undefined && item.duotone !== '' ) {
		attrs.style = { color: { duotone: item.duotone } };
	}

	return attrs;
}

/**
 * A `core/image` caption as the plain string items[] stores.
 *
 * The attribute is typed `rich-text`, so the value the editor holds is a
 * RichTextData instance, not the string `itemToImageAttributes` handed
 * `createBlock` — core converts it the moment the block is parsed or the caption
 * is edited. Every site here that compared it with `typeof === 'string'`
 * therefore read a loaded caption as absent, which cost three different things:
 * a caption edit never reached items[], the two signatures never matched (so the
 * inner blocks were rebuilt on any items[] change), and `sameImageAttributes`
 * saw string vs object and minted a new clientId for every tile, losing the
 * selection with it.
 *
 * `undefined` is the author clearing it — the Remove caption toolbar button sets
 * exactly that, and the projection always writes a string, so the key is missing
 * only when core took it away.
 *
 * @param {string|Object|undefined} value The `caption` attribute.
 * @return {string} Caption HTML, or '' when there is none.
 */
export function captionString( value ) {
	if ( typeof value === 'string' ) {
		return value;
	}
	if ( ! value ) {
		return '';
	}
	// RichTextData: toHTMLString() is the documented accessor, and toString() is
	// an alias for it. Guard both so a bare rich-text value object (no HTML
	// serializer of its own) degrades to its plain text rather than to
	// "[object Object]".
	if ( 'function' === typeof value.toHTMLString ) {
		return value.toHTMLString();
	}
	return typeof value.text === 'string' ? value.text : '';
}

/**
 * The subset of image attributes that, when unchanged, means a block can be
 * reused as-is (preserving its clientId and therefore selection).
 *
 * @param {Object} a core/image attributes.
 * @param {Object} b core/image attributes.
 * @return {boolean} Whether the projected attributes are equal.
 */
function sameImageAttributes( a, b ) {
	return (
		a.id === b.id &&
		a.url === b.url &&
		( a.alt || '' ) === ( b.alt || '' ) &&
		captionString( a.caption ) === captionString( b.caption ) &&
		( a.className || '' ) === ( b.className || '' ) &&
		duotoneKey( duotoneFromBlock( a ) ) === duotoneKey( duotoneFromBlock( b ) )
	);
}

/**
 * Build the controlled `core/image` block list from items[]. Existing blocks are
 * reused (same object → same clientId → selection survives) when their projected
 * attributes are unchanged; only genuinely new/changed items mint a fresh block.
 *
 * @param {Array} items      MediaItem[].
 * @param {Array} prevBlocks Blocks currently held by the editor (for reuse).
 * @return {Array} core/image block objects.
 */
export function itemsToImageBlocks( items, prevBlocks ) {
	const byKey = new Map( ( prevBlocks || [] ).map( ( b ) => [ blockKey( b ), b ] ) );
	return ( items || [] ).map( ( item ) => {
		const attrs = itemToImageAttributes( item );
		const prev = byKey.get( itemKey( item ) );
		if ( prev && sameImageAttributes( prev.attributes, attrs ) ) {
			return prev;
		}
		return createBlock( 'core/image', attrs );
	} );
}

/**
 * Pair each block with the MediaItem it mirrors back into, and say whether its
 * media was swapped. The ONE pairing implementation — `blocksToItems` and
 * `swappedMediaIds` are two readings of the same walk, and they have to agree
 * about which item a block stands for, or the second would resolve attachments
 * for tiles the first never adopted.
 *
 * @param {Array} blocks    core/image block objects.
 * @param {Array} prevItems The items[] the blocks were derived from.
 * @return {Array<{attrs: Object, base: Object, swapped: boolean}>} Pairings, in block order.
 */
function pairBlocks( blocks, prevItems ) {
	const list = prevItems || [];
	const byKey = new Map( list.map( ( it ) => [ itemKey( it ), it ] ) );
	return ( blocks || [] ).map( ( block, index ) => {
		const attrs = block.attributes || {};
		// A key miss (e.g. a future MediaItem shape itemKey/blockKey don't yet
		// cover) falls back to the same-index previous item rather than a
		// synthesized bare image, so a mismatch degrades to "kept as-is" instead
		// of silently dropping provider/type/dimensions.
		const prev = byKey.get( blockKey( block ) ) || list[ index ];
		const base = prev || {
			id: attrs.id !== undefined && attrs.id !== null ? attrs.id : attrs.url || '',
			type: 'image',
			url: attrs.url || '',
			thumb: attrs.url || '',
			full: attrs.url || '',
			width: 0,
			height: 0,
			title: '',
			description: '',
			link: '',
			provider: 'media_library',
		};
		return { attrs, base, swapped: ! mediaMatches( attrs, base ) };
	} );
}

/**
 * Mirror the editor's block list back into items[]. Order, membership and
 * alt/caption edits flow through; every other MediaItem field is carried over
 * from the matching previous item so videos, dimensions, categories and provider
 * survive the round-trip untouched.
 *
 * The one exception is a tile whose IMAGE changed — Replace and Crop, the two
 * native controls that swap the media itself. Carrying the previous item over
 * wholesale there discarded the new attachment silently: the tile snapped back to
 * the old picture on the next projection (the block's key no longer matched the
 * item's, so the sync effect rebuilt it) while the new image's alt and caption,
 * which DO mirror, had already overwritten the old ones. So the item adopts the
 * block's media instead — see {@see mediaMatches} and {@see adoptBlockMedia}.
 *
 * @param {Array} blocks    core/image block objects.
 * @param {Array} prevItems The items[] the blocks were derived from.
 * @return {Array} MediaItem[].
 */
export function blocksToItems( blocks, prevItems ) {
	return pairBlocks( blocks, prevItems ).map( ( { attrs, base, swapped } ) => ( {
		...( swapped ? adoptBlockMedia( base, attrs ) : base ),
		alt: typeof attrs.alt === 'string' ? attrs.alt : base.alt || '',
		caption: captionString( attrs.caption ),
		// Presentation edited through the native toolbar; owned by the block.
		styleClass: styleClassFromBlock( attrs ),
		duotone: duotoneFromBlock( attrs ),
	} ) );
}

/**
 * The attachment ids a sync SWAPPED IN — the tiles Replace or Crop just gave a
 * different image, and the only ones {@see unresolvedMediaIds} may be acted on
 * for.
 *
 * Narrow on purpose. Zero dimensions alone would also match a stored item that
 * arrived without them (a video WordPress could not measure, say), and topping
 * those up would rewrite `items` — marking the post unsaved — the moment the
 * author opened a gallery they had not touched.
 *
 * @param {Array} blocks    core/image block objects.
 * @param {Array} prevItems The items[] the blocks were derived from.
 * @return {number[]} Distinct attachment ids newly pointed at.
 */
export function swappedMediaIds( blocks, prevItems ) {
	const ids = [];
	pairBlocks( blocks, prevItems ).forEach( ( { attrs, swapped } ) => {
		if ( swapped && typeof attrs.id === 'number' && ! ids.includes( attrs.id ) ) {
			ids.push( attrs.id );
		}
	} );
	return ids;
}

/**
 * Signature of items[] covering structure (id + order) and every mirrored field
 * (alt, caption, style class, duotone). Compared against blocksSignature to tell
 * an EXTERNAL items[] change (media modal add/remove/reorder) apart from our own
 * mirror-back so the inner blocks only rebuild when they genuinely diverged.
 *
 * @param {Array} items MediaItem[].
 * @return {string} Signature.
 */
export function itemsSignature( items ) {
	return ( items || [] )
		.map(
			( i ) =>
				`${ itemKey( i ) }~${ i.alt || '' }~${ i.caption || '' }~${ i.styleClass || '' }~${ duotoneKey(
					i.duotone
				) }`
		)
		.join( '|' );
}

/**
 * Signature of the block list in the same shape as itemsSignature.
 *
 * @param {Array} blocks core/image block objects.
 * @return {string} Signature.
 */
export function blocksSignature( blocks ) {
	return ( blocks || [] )
		.map( ( b ) => {
			const a = b.attributes || {};
			const cap = captionString( a.caption );
			return `${ blockKey( b ) }~${ a.alt || '' }~${ cap }~${ styleClassFromBlock( a ) }~${ duotoneKey(
				duotoneFromBlock( a )
			) }`;
		} )
		.join( '|' );
}

/**
 * Pair each projected block with the MediaItem it stands for, by KEY.
 *
 * Returns `{ tiles, byKey }` — `tiles` keyed by clientId (what a rendered tile looks
 * itself up by) and `byKey` keyed by the attachment-id / URL key (the fallback for
 * when `useBlockSync` minted its own clientIds, so the local block objects' ids are
 * not the rendered ones).
 *
 * Pairing by key rather than by index is the whole point. The two arrays are updated
 * by different mechanisms: a drag-reorder puts the new order into the block editor's
 * store — and therefore into `blocks` and the DOM — while `items` only catches up on
 * the following `setAttributes` round trip. Zipping them by position meant that in
 * between, every tile rendered ANOTHER tile's title and description, so a reorder
 * flashed the wrong text on every tile it moved. A key lookup cannot mis-pair: a
 * block whose item has not arrived yet simply resolves to nothing and the tile
 * renders without content text, which is a missing frame rather than a wrong one.
 *
 * First occurrence wins for `byKey`: the same attachment twice in one gallery shares
 * a key, so the editor previews the first copy's text on both tiles. Cosmetic,
 * canvas-only — the front end never matches by key.
 *
 * @param {Array} blocks core/image block objects (editor order).
 * @param {Array} items  MediaItem[] (attribute order).
 * @return {{tiles: Object, byKey: Object}} Lookup maps of `{ item, index }` entries.
 */
export function tileEntries( blocks, items ) {
	const byKey = {};
	( items || [] ).forEach( ( item, index ) => {
		const key = itemKey( item );
		if ( ! byKey[ key ] ) {
			byKey[ key ] = { item, index };
		}
	} );

	const tiles = {};
	( blocks || [] ).forEach( ( block ) => {
		const entry = byKey[ blockKey( block ) ];
		if ( block?.clientId && entry ) {
			tiles[ block.clientId ] = entry;
		}
	} );

	return { tiles, byKey };
}

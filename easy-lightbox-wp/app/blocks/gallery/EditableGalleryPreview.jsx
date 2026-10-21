/**
 * Editable gallery preview — renders each image as a REAL `core/image` inner
 * block so every image gets the native WordPress image toolbar (block icon,
 * drag handle, horizontal movers, duotone, shape/style, three-dot) and native
 * selection + drag-to-reorder, for free.
 *
 * Gallery-level toolbar controls (Change Layout / Edit Gallery / Width) hide
 * automatically when an image is selected: Gutenberg only renders a block's
 * toolbar while that block is selected, so selecting an inner image hides the
 * parent gallery's controls with no extra code.
 *
 * Persistence is UNCHANGED: `save()` is still null and the PHP renderer reads the
 * `items` attribute. The inner blocks are an editor-only, controlled projection —
 * we never serialize them. `items` stays the single source of truth; this
 * component keeps the two representations in sync in both directions.
 *
 * Sync mechanics (see @wordpress/block-editor use-block-sync): the value handed
 * to `useInnerBlocksProps` must be the EXACT array the editor returns via
 * onChange/onInput — the sync layer tracks it as our own "outgoing" change and
 * skips a store reset, so selection and undo grouping survive. We only build a
 * NEW array when `items` diverges from what the blocks hold, i.e. an external
 * edit from the media / Edit Gallery modals — which correctly triggers a reset.
 */
import { useRef, useState, useEffect, useMemo } from '@wordpress/element';
import { useInnerBlocksProps, BlockContextProvider } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { resolveResponsive } from '@shaped-gallery/lib/layout-math';
import { resolveResponsiveNumber } from '@shaped-gallery/lib/responsive';
import {
	geometryStyle,
	effectiveRowHeight,
	imageVideoStyle,
	imageVideoClasses,
	contentStyle,
} from '@shaped-gallery/lib/style';
import { useDeviceType } from '@shaped-gallery/hooks';
import { applyOrder, mergeEditedItems, newOrderSeed, RANDOM_ORDER } from '@shaped-gallery/lib/item-order';
import { firstWindowSize } from '@shaped-gallery/lib/ajax-window';
import { fetchMediaItems } from '@shaped-gallery/media-manager/normalize';
import { useMeasuredLayout } from './useMeasuredLayout';
import { useImageSources } from './useImageSources';
import PaginationPreview from './PaginationPreview';
import { GalleryTileContext } from './gallery-tile-context';
import { TILE_BLOCK_CONTEXT, TILE_LAYOUT } from './tile-controls';
import {
	itemsToImageBlocks,
	blocksToItems,
	itemsSignature,
	blocksSignature,
	tileEntries,
	swappedMediaIds,
	unresolvedMediaIds,
	applyMedia,
	itemKey,
} from './image-blocks';

/** Only images are insertable; the appender is hidden (media is added via the modals). */
const ALLOWED_BLOCKS = [ 'core/image' ];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Editable preview.
 */
export default function EditableGalleryPreview( { attributes, setAttributes } ) {
	const {
		layout,
		items = [],
		rowHeightMode,
		maxRowHeight,
		columns,
		horizontalGap,
		verticalGap,
		order,
	} = attributes;
	const containerRef = useRef( null );
	const device = useDeviceType();

	/*
	 * The Order control. `items` stays the author's order (the single source of truth
	 * the modals, the drag handles and `save` all read); Random is a VIEW over it, dealt
	 * by the same seeded shuffle the renderer uses so the canvas can show the effect. The
	 * seed is drawn when Random is chosen, not on every render, or the tiles would
	 * reshuffle under the author's cursor on each keystroke.
	 */
	const seed = useMemo( () => newOrderSeed(), [ order ] ); // eslint-disable-line react-hooks/exhaustive-deps
	const shownItems = useMemo( () => applyOrder( items, order, seed ), [ items, order, seed ] );

	/*
	 * Ajax Pagination: the canvas draws the first window only — the tiles a visitor
	 * first sees, sized by the desktop Show Per View exactly as the renderer's
	 * `$window` is (`firstWindowSize()`). Only those become inner blocks, so a drag,
	 * a delete or a duplicate on the canvas reaches the first page and nothing past
	 * it; `syncFromEditor` re-appends the rest untouched. Reordering across pages
	 * stays with the Edit Gallery modal, which always lists every item.
	 */
	const windowSize = firstWindowSize( attributes );
	const pageItems = useMemo( () => shownItems.slice( 0, windowSize ), [ shownItems, windowSize ] );

	// Resolved exactly as the frontend runtime resolves them, so a 0 gap stays 0
	// rather than falling through to the default (§18).
	const gh = resolveResponsiveNumber( horizontalGap, device, 20 );
	const gv = resolveResponsiveNumber( verticalGap, device, 20 );
	const cols = resolveResponsive( columns, device ) || 4;

	// The controlled value handed to the editor. Seeded from items[] once.
	const [ blocks, setBlocks ] = useState( () => itemsToImageBlocks( pageItems, [] ) );
	// Latest blocks, read inside effects/callbacks without re-subscribing.
	const blocksRef = useRef( blocks );
	blocksRef.current = blocks;

	// External items[] change (media modal add/remove, Edit Gallery reorder) or a new
	// Show Per View → rebuild the blocks so the inner blocks catch up. Our own
	// mirror-back leaves the signatures equal, so this is a no-op for changes we
	// originated.
	useEffect( () => {
		if ( itemsSignature( pageItems ) !== blocksSignature( blocksRef.current ) ) {
			setBlocks( itemsToImageBlocks( pageItems, blocksRef.current ) );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ pageItems ] );

	// State for the media top-up below; declared up here because `syncFromEditor`
	// is what fills `swapped`.
	const itemsRef = useRef( items );
	itemsRef.current = items;
	const swapped = useRef( new Set() );
	const mediaCache = useRef( new Map() );
	const inflight = useRef( new Set() );
	const mounted = useRef( true );

	// Editor → attribute. Always adopt the editor's exact array as our value
	// (keeps the sync layer's "outgoing" fast-path); mirror to items[] only when
	// the projection actually changed, to avoid spurious undo history entries.
	const syncFromEditor = ( nextBlocks ) => {
		setBlocks( nextBlocks );
		// Noted BEFORE the mirror-back, which is the only moment the old media and
		// the new are both in hand (see the top-up effect below).
		swappedMediaIds( nextBlocks, pageItems ).forEach( ( id ) => swapped.current.add( id ) );
		// The blocks hold the first window only; the items past it were never on the
		// canvas, so they follow the edited page unchanged rather than being dropped.
		const nextShown = [ ...blocksToItems( nextBlocks, pageItems ), ...shownItems.slice( windowSize ) ];
		// Under Random the editor hands back the SHUFFLED list; writing that to `items`
		// would make the shuffle permanent, so the edit is folded into the stored order.
		const nextItems =
			RANDOM_ORDER === order ? mergeEditedItems( items, shownItems, nextShown, itemKey ) : nextShown;
		if ( itemsSignature( nextItems ) !== itemsSignature( items ) ) {
			setAttributes( { items: nextItems } );
		}
	};

	// Guards the one write that can land after this preview is gone: a media
	// lookup that resolves once the author has switched layout or left the block.
	useEffect( () => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, [] );

	/*
	 * Top up a tile the native Replace / Crop controls swapped the image on.
	 *
	 * `blocksToItems` can only take the `id` + `url` the block carries, so an
	 * adopted item arrives without the fields the attachment owns — dimensions
	 * above all, which are what the justified and masonry geometry lay the tile out
	 * from. This resolves those once per id and merges them in; until it lands the
	 * tile draws at the documented 4:3 fallback rather than at the ratio of the
	 * picture that is no longer there.
	 *
	 * The cache is what makes this safe to hang off `items`: an id is asked for
	 * exactly once, and an id that cannot be resolved (deleted attachment, a user
	 * without the capability, no `wp.media` on the page) is remembered as such, so
	 * a tile that can never be completed costs one request and then nothing.
	 *
	 * A request in flight is deliberately NOT cancelled by the run that supersedes
	 * it: it writes what it fetched into the cache either way. Cancelling instead
	 * lost a finished lookup — the tile the author had just replaced stayed at 4:3
	 * for as long as they kept editing, because each `items` change discarded the
	 * answer and started over.
	 *
	 * It also only ever looks at ids `syncFromEditor` recorded as swapped, never at
	 * "any item without dimensions": a stored gallery must open without this
	 * rewriting a thing, or merely viewing it would mark the post unsaved.
	 */
	useEffect( () => {
		const ids = unresolvedMediaIds( items ).filter( ( id ) => swapped.current.has( id ) );
		if ( ! ids.length ) {
			return;
		}

		const merge = () => {
			const current = itemsRef.current;
			const next = current.map( ( item ) => applyMedia( item, mediaCache.current.get( item.id ) ) );
			// `applyMedia` hands back the very same object when it would change
			// nothing, so this both skips a no-op write and closes the loop: an
			// attachment that genuinely has no dimensions settles after one pass
			// instead of re-merging on every `items` change it caused itself.
			if ( next.every( ( item, i ) => item === current[ i ] ) ) {
				return;
			}
			setAttributes( { items: next } );
		};

		// Whatever is already answered lands now; the rest is asked for once.
		merge();

		const missing = ids.filter(
			( id ) => ! mediaCache.current.has( id ) && ! inflight.current.has( id )
		);
		if ( ! missing.length ) {
			return;
		}

		missing.forEach( ( id ) => inflight.current.add( id ) );
		fetchMediaItems( missing ).then( ( resolved ) => {
			missing.forEach( ( id ) => {
				inflight.current.delete( id );
				// A `null` entry is the "asked and answered, nothing there" marker
				// that stops this id ever being requested again.
				mediaCache.current.set( id, resolved[ id ] || null );
			} );
			if ( mounted.current ) {
				merge();
			}
		} );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ items ] );

	// The canvas draws each attachment at the gallery's Image Resolution, like the
	// renderer — not the ~300px `medium` rendition the stored item carries.
	const sources = useImageSources( items, attributes.imageVideo?.resolution ?? 'large' );

	useMeasuredLayout( containerRef, {
		layout,
		items: pageItems,
		rowHeightMode,
		maxRowHeight,
		gh,
		gv,
		cols,
		// Watched only: the measured layouts subtract the tile's own margin from the
		// box they write, so an edit here has to re-measure.
		margin: attributes.margin,
		// Watched only, same bargain: masonry packs its columns from a MEASURED
		// Classic content height, so a Content Settings edit invalidates the geometry
		// the canvas is holding and nothing else asks for it back.
		content: attributes.content,
		device,
	} );

	const style = {
		...geometryStyle( {
			cols,
			gh,
			gv,
			row: effectiveRowHeight( rowHeightMode, maxRowHeight ),
			unit: horizontalGap?.unit || 'px',
			advanced: attributes.advanced,
			device,
		} ),
		// Per-item image / video styling (border, radius, shadow, margin) for the
		// active device.
		...imageVideoStyle( attributes, device ),
		// Image title / description styling for the active device. The content block
		// itself is rendered INSIDE each core/image figure by ./item-content-filter,
		// which is the only seam that can reach inside a block Gutenberg owns.
		...contentStyle( attributes, device ),
	};

	const innerBlocksProps = useInnerBlocksProps(
		{
			ref: containerRef,
			className: `sp-shaped-gallery sp-shaped-gallery--${ layout } is-editable ${ imageVideoClasses(
				attributes
			) }`.trim(),
			style,
			'data-layout': layout,
		},
		{
			value: blocks,
			onInput: syncFromEditor,
			onChange: syncFromEditor,
			allowedBlocks: ALLOWED_BLOCKS,
			templateLock: false,
			renderAppender: false,
			// Horizontal movers (move image left/right), per the spec.
			orientation: 'horizontal',
			// Keep the renderer's grid CSS authoritative — no block-layout classes.
			__unstableDisableLayoutClassNames: true,
			// Merged over the editor's default layout; its only job is to take the
			// align toolbar off a tile the gallery positions itself (./tile-controls).
			layout: TILE_LAYOUT,
		}
	);

	/*
	 * What each tile needs, handed down as CONTEXT rather than read from the store by
	 * the tile itself. Two reasons, and both were live bugs before this:
	 *
	 *  - `BlockListBlockProvider` is memoized on its own props, so a change to THIS
	 *    block's attributes re-renders no inner block; a context update crosses that
	 *    boundary (see ./gallery-tile-context).
	 *  - each block is rendered inside an `AsyncModeProvider` whose value is
	 *    `! isSelected`, and in async mode `useSelect` defers store updates for
	 *    unselected subtrees. That is why the first attempt updated the SELECTED
	 *    tile's caption and no other — and why nothing here may depend on a store
	 *    subscription, in the tile OR in this component.
	 *
	 * Keyed by clientId, with the attachment-id / URL key as the fallback the tile
	 * actually needs: `useBlockSync` may mint its own clientIds for the inner blocks,
	 * so the local `blocks` array's ids are not guaranteed to be the rendered ones.
	 * That key is the same one the items ⇄ blocks round trip matches on.
	 *
	 * The pairing itself is `tileEntries()` — by KEY, never by array position. See its
	 * doc for why: a drag-reorder reaches `blocks` (and the DOM) a render before it
	 * reaches `items`, so zipping the two by index showed the wrong title on every
	 * tile the drag moved.
	 */
	const tileContext = useMemo( () => {
		const { tiles, byKey } = tileEntries( blocks, pageItems );
		return { content: attributes.content || {}, tiles, byKey, sources };
	}, [ blocks, pageItems, attributes.content, sources ] );

	// Defensive: the parent shows a Placeholder while items[] is empty, so this
	// component normally only mounts with images present.
	if ( ! items.length ) {
		return <p className="sp-shaped-gallery-preview__empty">{ __( 'No images yet.', 'easy-lightbox-wp' ) }</p>;
	}

	// The pagination bar is a sibling of the grid (matching the frontend) and
	// follows it. It is a static preview — the grid shows the first window (above),
	// and the bar previews the control only.
	return (
		<>
			<GalleryTileContext.Provider value={ tileContext }>
				{ /* Block context for the tiles: `allowResize: false` is what drops
				     core/image's Width / Height / Aspect ratio / Scale and its resize
				     handles, the gallery owning tile geometry (./tile-controls). It
				     merges into the inherited context, so postId and the rest survive. */ }
				<BlockContextProvider value={ TILE_BLOCK_CONTEXT }>
					<div { ...innerBlocksProps } />
				</BlockContextProvider>
			</GalleryTileContext.Provider>
			<PaginationPreview attributes={ attributes } device={ device } />
		</>
	);
}

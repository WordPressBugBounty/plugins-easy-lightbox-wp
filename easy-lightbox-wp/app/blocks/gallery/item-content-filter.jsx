/**
 * The gallery TILE in the editable preview: a `.sp-shaped-gallery__item` figure
 * wrapping the native `core/image` block, with the Content Settings block
 * (`<ItemContent>`) beside it.
 *
 * Why a wrapper. The grid-family layouts render each image as a real core/image
 * inner block so it keeps the native image toolbar (see EditableGalleryPreview), so
 * that block's `<figure>` belongs to Gutenberg — and a block's own element cannot be
 * given extra children from outside. `editor.BlockEdit` composes as a SIBLING of it
 * (verified: the caption landed as a grid child, not inside the tile), and the
 * block's DOM node has no public accessor. So the tile becomes an element this block
 * owns, and the image block sits inside it.
 *
 * What that buys, and what it costs:
 *  - the wrapper is the grid child, so every geometry rule and `useMeasuredLayout`
 *    act on it exactly as they act on the renderer's `<figure>` — which is why
 *    `itemToImageAttributes` no longer stamps the tile class on the image block
 *    (two elements carrying it would make the measured layouts count each tile
 *    twice);
 *  - the content block is a child of a positioned tile, so the shared
 *    `.sp-shaped-gallery__content` rules place it over the image exactly as on the
 *    front end;
 *  - the canvas has one element the front end does not (the inner core figure), so
 *    `editor.scss` makes that figure fill the tile.
 *
 * Everything the tile needs arrives through `GalleryTileContext` rather than a store
 * subscription — see that module for why a `useSelect` here silently fails to
 * update. Its presence is also the gate: only images rendered inside the gallery
 * preview see a provider, so no other core/image in the editor is touched.
 *
 * The one tile that does NOT hold a core/image is a poster-less video, which has no
 * image for that block to show — see the note on `firstFrame` below.
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useContext, useMemo } from '@wordpress/element';
import { firstFrameSrc, showsFirstFrame } from '@shaped-gallery/lib/video-poster';
import { editorImageSrc } from '@shaped-gallery/lib/image-source';
import ItemContent from './ItemContent';
import { GalleryTileContext } from './gallery-tile-context';
import { attributesKey, ITEM_CLASS } from './image-blocks';

/**
 * One gallery tile: the image block wrapped in the renderer's item figure.
 *
 * Split into its own component so the HOC can bail on the block NAME before any
 * hook runs — a conditional `useContext` would break the hook order for every other
 * block in the editor.
 *
 * @param {Object}   props                core/image BlockListBlock props.
 * @param {Function} props.BlockListBlock The wrapped block component.
 * @return {JSX.Element} The tile, or the block untouched when it is not ours.
 */
function GalleryTile( { BlockListBlock, ...props } ) {
	const gallery = useContext( GalleryTileContext );
	// clientId first; the attachment-id / URL key is the fallback for the case where
	// the sync layer minted its own ids (see the provider for the whole story).
	const tile = gallery
		? gallery.tiles[ props.clientId ] || gallery.byKey[ attributesKey( props.attributes ) ]
		: null;

	const item = tile?.item;
	const src = item ? editorImageSrc( item, gallery.sources ) : '';
	const { attributes } = props;
	/*
	 * The block's `url` attribute is the stored thumbnail (~300px). The canvas draws a
	 * better rendition by handing the block a COPY of its attributes with the resolved
	 * URL — never by writing it back: the attribute is part of the items ⇄ blocks
	 * round trip (`itemKey` / `sameImageAttributes`), and rewriting it would re-key the
	 * tile and mint a new block, dropping the selection. `setAttributes` still patches
	 * the stored block, so an alt or duotone edit is untouched.
	 *
	 * Called before the bail below so the hook order is the same for every tile.
	 */
	const shown = useMemo(
		() => ( src && src !== attributes.url ? { ...attributes, url: src } : attributes ),
		[ attributes, src ]
	);

	if ( ! gallery || ! tile ) {
		return <BlockListBlock { ...props } />;
	}

	const { index } = tile;
	const isVideo = 'video' === item.type;

	/*
	 * A poster-less video has no image for `core/image` to show — its only thumbnail
	 * is a frame of the file itself, which is why LayoutRenderer::render_item() gives
	 * it a `<video>` and not an `<img>`. Projected as a core/image it put the media
	 * file in an `<img src>`, so the browser downloaded the whole video (a 4K clip, in
	 * the report that found this) only to fail to decode it and paint core's "This
	 * image has an empty alt attribute" fallback text in the tile.
	 *
	 * So this ONE tile draws the media itself and leaves the image block unmounted.
	 * The block stays in the controlled list, so ordering, the items ⇄ blocks round
	 * trip, and every other tile are untouched; what it costs is canvas selection and
	 * drag for a poster-less video tile. That is a fair trade — the native image
	 * toolbar (shape, duotone, replace, alt) has nothing to act on for a video — and
	 * reordering is still available in the Edit Gallery modal. Give the video a
	 * featured image and the tile goes back to being a fully editable core/image.
	 */
	const firstFrame = showsFirstFrame( item );

	return (
		<figure
			className={ `${ ITEM_CLASS }${ isVideo ? ` ${ ITEM_CLASS }--video` : '' }` }
			// The intrinsic ratio the renderer publishes as data-* for the same reason:
			// the measured layouts read their geometry from the items, but a CSS-Grid
			// layout's aspect rules and any add-on read it off the tile.
			data-w={ item.width || 4 }
			data-h={ item.height || 3 }
			data-index={ index }
		>
			{ /* The renderer's media frame. The image block goes INSIDE it, so the
			     canvas splits media height from content height exactly as the front
			     end does — without it a Classic title/description in the editor was
			     squeezed out of a tile whose height the layout had already spent on
			     the image (see LayoutRenderer::render_item()). */ }
			<div className="sp-shaped-gallery__frame">
				{ firstFrame ? (
					<video
						className="sp-shaped-gallery__img"
						src={ firstFrameSrc( item.full || item.url || '' ) }
						muted
						preload="metadata"
						playsInline
					/>
				) : (
					<BlockListBlock { ...props } attributes={ shown } />
				) }
				{ /* The renderer's play badge, so a video tile reads as a video on the
				     canvas too. Inside the frame, like LayoutRenderer::render_item()
				     puts it, so it centres on the media and not on media + caption. */ }
				{ isVideo && <span className="sp-shaped-gallery__playicon" aria-hidden="true" /> }
			</div>
			<ItemContent item={ item } content={ gallery.content } />
		</figure>
	);
}

/**
 * Wrap every gallery image block in the renderer's tile figure.
 */
const withGalleryTile = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		if ( 'core/image' !== props.name ) {
			return <BlockListBlock { ...props } />;
		}
		return <GalleryTile BlockListBlock={ BlockListBlock } { ...props } />;
	},
	'withShapedGalleryTile'
);

addFilter( 'editor.BlockListBlock', 'shaped-gallery/item-tile', withGalleryTile );

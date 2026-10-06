/**
 * One item's content block (image title + description) for the editor canvas —
 * the exact `<figcaption>` LayoutRenderer::content_markup() emits, so the shared
 * `.sp-shaped-gallery__content` rules in style.scss draw the preview and the front
 * end from one place.
 *
 * Which text each element shows, whether anything shows at all, the class list and
 * the title's tag all come from ./item-content.js, the pure mirror of the PHP. The
 * styling comes from the container's `--sp-shaped-gallery-ct-*` custom properties
 * (app/lib/style/content-vars.js), so nothing about appearance is decided here.
 *
 * Read-only by design: the title and description are per-ITEM metadata edited in
 * the media picker's Attachment Details and the Edit Gallery modal, not in the
 * canvas. `pointer-events: none` (editor.scss) keeps the block, which sits over
 * the image, from swallowing the click that selects it.
 */
import {
	contentClasses,
	descriptionFor,
	hasItemContent,
	titleFor,
	titleTag,
} from './item-content';

/**
 * @param {Object} props
 * @param {Object} props.item    MediaItem for this tile.
 * @param {Object} props.content The grouped `content` attribute.
 * @return {?JSX.Element} The figcaption, or null when the front end would emit none.
 */
export default function ItemContent( { item, content } ) {
	if ( ! hasItemContent( item, content ) ) {
		return null;
	}

	const title = titleFor( item, content );
	const description = descriptionFor( item, content );
	const Tag = titleTag( content );

	return (
		<figcaption className={ contentClasses( content ) }>
			{ '' !== title && <Tag className="sp-shaped-gallery__title">{ title }</Tag> }
			{ '' !== description && (
				<div className="sp-shaped-gallery__desc">{ description }</div>
			) }
		</figcaption>
	);
}

/**
 * A single 120×120 media tile in the browsing grid: thumbnail, filename overlay,
 * and a selection check badge.
 *
 * Interaction mirrors the native WordPress media grid and keeps selecting and
 * deselecting on separate controls, so viewing an image's details never drops it
 * from the gallery:
 *   - Clicking the tile body opens its details (activates) and, if it isn't
 *     already selected, adds it. It NEVER removes a selected tile.
 *   - The check badge (shown only when selected) is the sole deselect control: it
 *     swaps to a minus glyph on hover and removes the tile on click, without
 *     re-activating it — so an unselected tile keeps no active border.
 *
 * Selection colors follow the reference: the active tile (the one in the details
 * panel) gets the brand color; other selected tiles get a neutral grey.
 */
import { __, sprintf } from '@wordpress/i18n';
import { Icon, lineSolid } from '@wordpress/icons';
import { checkTickIcon } from '@shaped-gallery/icons';
import MediaThumb from './MediaThumb';

/**
 * @param {Object}   props
 * @param {Object}   props.item       MediaItem.
 * @param {boolean}  props.selected   In the current selection.
 * @param {boolean}  props.active     The item shown in the details panel.
 * @param {Function} props.onSelect   Select the item — receives ( item, { range } );
 *                                    `range` is true when Shift was held.
 * @param {Function} props.onActivate Show this item's details — receives the item.
 * @return {JSX.Element} Card.
 */
export default function MediaCard( { item, selected, active, onSelect, onActivate } ) {
	const label = item.title || item.alt || __( 'Untitled', 'easy-lightbox-wp' );

	// A tile-body click always opens the details panel. It ADDS the tile to the
	// selection when it isn't already in it (Shift → range-add), but never removes
	// it — deselecting is exclusively the checkmark's job, so clicking a selected
	// tile to read its details can't accidentally drop it from the gallery.
	const activate = ( event ) => {
		onActivate( item );
		if ( ! selected || event.shiftKey ) {
			onSelect( item, { range: event.shiftKey } );
		}
	};

	const onKeyDown = ( event ) => {
		if ( ' ' === event.key || 'Enter' === event.key ) {
			event.preventDefault();
			activate( event );
		}
	};

	// The checkmark badge is the sole deselect control: toggle the (selected) tile
	// out without re-activating it, and stop the click bubbling to the tile so it
	// doesn't re-add/re-activate. Losing selection drops its active border.
	const deselect = ( event ) => {
		event.stopPropagation();
		onSelect( item, {} );
	};

	// The tile body's action reads as "select" until it's in the gallery, then as
	// "view details" (the checkmark handles removal).
	const bodyLabel = selected
		? /* translators: %s: media title. */
		  sprintf( __( 'View details for %s', 'easy-lightbox-wp' ), label )
		: /* translators: %s: title of the item being selected. */
		  sprintf( __( 'Select %s', 'easy-lightbox-wp' ), label );

	return (
		<div
			className={ `sp-shaped-gallery-mediacard${ selected ? ' is-selected' : '' }${ active ? ' is-active' : '' }` }
			role="button"
			aria-pressed={ active }
			aria-label={ bodyLabel }
			tabIndex={ 0 }
			onClick={ activate }
			onKeyDown={ onKeyDown }
		>
			<div className="sp-shaped-gallery-mediacard__image">
				<MediaThumb item={ item } />
				{ 'video' === item.type && <span className="sp-shaped-gallery-mediacard__video" aria-hidden="true" /> }
			</div>
			<span className="sp-shaped-gallery-mediacard__name" title={ label }>
				{ label }
			</span>
			{ selected && (
				<button
					type="button"
					className="sp-shaped-gallery-mediacard__check"
					aria-label={ sprintf(
						/* translators: %s: media title. */
						__( 'Deselect %s', 'easy-lightbox-wp' ),
						label
					) }
					onClick={ deselect }
				>
					<span className="sp-shaped-gallery-mediacard__check-on" aria-hidden="true">
						<Icon icon={ checkTickIcon } size={ 24 } />
					</span>
					<span className="sp-shaped-gallery-mediacard__check-off" aria-hidden="true">
						<Icon icon={ lineSolid } size={ 18 } />
					</span>
				</button>
			) }
		</div>
	);
}

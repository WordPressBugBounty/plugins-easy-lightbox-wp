/**
 * Grid of selected media tiles with native drag-to-reorder and remove.
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon, closeSmall, dragHandle } from '@wordpress/icons';
import MediaThumb from './MediaThumb';

/**
 * @param {Object}   props
 * @param {Array}    props.items    MediaItem[].
 * @param {Function} props.onChange Updated MediaItem[].
 * @return {JSX.Element} Grid.
 */
export default function MediaGrid( { items, onChange } ) {
	const [ dragIndex, setDragIndex ] = useState( null );

	const move = ( from, to ) => {
		if ( from === to || ! Number.isInteger( from ) || ! Number.isInteger( to ) ) {
			return;
		}
		const next = items.slice();
		const [ moved ] = next.splice( from, 1 );
		next.splice( to, 0, moved );
		onChange( next );
	};

	const remove = ( index ) => {
		const next = items.slice();
		next.splice( index, 1 );
		onChange( next );
	};

	if ( ! items.length ) {
		return <p className="sp-shaped-gallery-mediagrid__empty">{ __( 'No media added yet.', 'easy-lightbox-wp' ) }</p>;
	}

	return (
		<ul className="sp-shaped-gallery-mediagrid">
			{ items.map( ( item, index ) => (
				<li
					key={ `${ item.id }-${ index }` }
					className="sp-shaped-gallery-mediagrid__tile"
					draggable
					onDragStart={ () => setDragIndex( index ) }
					onDragOver={ ( e ) => e.preventDefault() }
					onDrop={ () => {
						move( dragIndex, index );
						setDragIndex( null );
					} }
				>
					<MediaThumb item={ item } />
					{ item.type === 'video' && <span className="sp-shaped-gallery-mediagrid__video" aria-hidden="true" /> }
					<span className="sp-shaped-gallery-mediagrid__handle" aria-hidden="true">
						<Icon icon={ dragHandle } size={ 16 } />
					</span>
					<button
						type="button"
						className="sp-shaped-gallery-mediagrid__remove"
						aria-label={ __( 'Remove', 'easy-lightbox-wp' ) }
						onClick={ () => remove( index ) }
					>
						<Icon icon={ closeSmall } size={ 18 } />
					</button>
				</li>
			) ) }
		</ul>
	);
}

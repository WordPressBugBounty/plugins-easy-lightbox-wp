/**
 * SortableItem — a dnd-kit `useSortable` wrapper. Renders its children inside a
 * draggable node whose drag handle covers the whole item, applying the live
 * transform/transition from the sortable context. Use inside a dnd-kit
 * `SortableContext`.
 *
 * @param {Object}          props
 * @param {(string|number)} props.id       Stable item id registered with the sortable context.
 * @param {Node}            props.children Item contents.
 * @return {JSX.Element} Sortable wrapper.
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem( { id, children } ) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable( { id } );

	const style = {
		transform: CSS.Transform.toString( transform ),
		transition,
	};

	return (
		<div
			ref={ setNodeRef }
			style={ style }
			className="sp-shaped-gallery-sortable-item"
			{ ...attributes }
			{ ...listeners }
		>
			{ children }
		</div>
	);
}

export default SortableItem;

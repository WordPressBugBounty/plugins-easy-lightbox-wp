/**
 * Responsive grid of media tiles for the Edit Gallery modal.
 *
 * Reflow is CSS (auto-fill columns), so no measuring/JS geometry here. Tiles are
 * reordered by mouse drag (native HTML5 DnD) when onReorder is provided — the
 * only reorder gesture the grid offers. Renders an empty state when there is
 * nothing to show.
 */
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import EditMediaCard from "./EditMediaCard";

/**
 * @param {Object}    props
 * @param {Object[]}  props.items          MediaItem[].
 * @param {string[]}  props.selectedIds    Selected item ids.
 * @param {?string}   props.activeId       Active details item id.
 * @param {string}    props.emptyMessage   Text shown when there are no tiles.
 * @param {Function}  props.onToggleSelect Toggle selection (id).
 * @param {Function}  props.onActivate     Activate a tile for the details panel (id).
 * @param {?Function} props.onReorder      Persist a reorder — receives ( fromIndex, toIndex ).
 *                                         Omit to disable reordering (e.g. a filtered view).
 * @param {Function}  props.onRemove       Remove a tile from the gallery (id).
 * @return {JSX.Element} Grid.
 */
export default function EditMediaGrid({
	items,
	selectedIds,
	activeId,
	emptyMessage = __("No media to display.", "easy-lightbox-wp"),
	onToggleSelect,
	onActivate,
	onReorder,
	onRemove,
}) {
	const [dragIndex, setDragIndex] = useState(null);
	const canReorder = typeof onReorder === "function";

	if (!items.length) {
		return <p className="sp-shaped-gallery-eg-grid__empty">{emptyMessage}</p>;
	}

	return (
		<ul className="sp-shaped-gallery-eg-grid">
			{items.map((item, index) => (
				<li
					key={item.id}
					data-item-id={item.id}
					className={`sp-shaped-gallery-eg-grid__cell${dragIndex === index ? " is-dragging" : ""}`}
					draggable={canReorder}
					onDragStart={canReorder ? () => setDragIndex(index) : undefined}
					onDragOver={canReorder ? (event) => event.preventDefault() : undefined}
					onDrop={
						canReorder
							? () => {
									onReorder(dragIndex, index);
									setDragIndex(null);
							  }
							: undefined
					}
					onDragEnd={canReorder ? () => setDragIndex(null) : undefined}
				>
					<EditMediaCard
						item={item}
						selected={selectedIds.includes(item.id)}
						active={item.id === activeId}
						onToggleSelect={onToggleSelect}
						onActivate={onActivate}
						onRemove={onRemove}
					/>
				</li>
			))}
		</ul>
	);
}

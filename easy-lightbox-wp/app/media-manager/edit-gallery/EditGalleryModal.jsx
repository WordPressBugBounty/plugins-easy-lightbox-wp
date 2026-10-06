/**
 * EditGalleryModal — the redesigned "Edit Gallery" experience.
 *
 * A three-panel modal:
 *   - left   : gallery actions (GallerySidebar)
 *   - center : title, a contextual action bar, and the media grid
 *   - right  : attachment details (AttachmentPanel)
 * with a full-width footer holding the primary "Update Gallery" action.
 *
 * Data is per-gallery and lives in the block: `items` (MediaItem[]) is read from
 * props and persisted back via `onChange` (setAttributes). Wired: the grid (real
 * items, drag reorder, reverse order, bulk remove) and the attachment panel (real
 * meta, editable gallery-scoped fields, Edit Image / Delete).
 */
import { Modal } from "@wordpress/components";
import { Icon, close } from "@wordpress/icons";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import GallerySidebar from "./GallerySidebar";
import BulkActionBar from "./BulkActionBar";
import ReorderHintBar from "./ReorderHintBar";
import EditMediaGrid from "./EditMediaGrid";
import AttachmentPanel from "./AttachmentPanel";
import { resolveIdSelection } from "../selection";
import "./edit-gallery.scss";

const noop = () => {};

/**
 * @param {Object}   props
 * @param {Function} props.onClose           Close the modal.
 * @param {Object[]} [props.items]           The gallery's MediaItem[] (empty if omitted).
 * @param {Function} [props.onChange]        Persist an updated MediaItem[].
 * @param {Function} [props.onInsert]        Primary "Update Gallery" action.
 * @param {Function} [props.onCancelGallery] Cancel/back action.
 * @param {Function} [props.onAddToGallery]  "Add to Gallery" action (open the picker).
 * @return {JSX.Element} Modal.
 */
export default function EditGalleryModal({
	onClose,
	// Real gallery MediaItem[]. Defaults to empty (never mock) so a missing prop
	// shows the honest empty state instead of silently faking images.
	items = [],
	onChange = noop,
	onInsert = noop,
	onCancelGallery,
	onAddToGallery = noop,
}) {
	// --- Isolated UI state ---
	// Bulk-selection for grid actions (remove) — empty on open.
	const [selectedIds, setSelectedIds] = useState([]);
	// Range-select anchor: the tile a Shift-click ranges from.
	const [anchorId, setAnchorId] = useState(null);
	// Preselect the first image on open so the details panel shows content
	// immediately (not an empty "select an image" state).
	const [activeItemId, setActiveItemId] = useState(() => items[0]?.id ?? null);

	const activeItem = items.find((item) => item.id === activeItemId) || null;
	const cancelGallery = onCancelGallery || onClose;

	// --- Selection (UI) ---
	// Modifier-aware bulk selection, matching the WP media grid: a plain/Ctrl/Cmd
	// click toggles one tile; Shift-click adds the contiguous range from the anchor.
	const toggleSelect = (id, { range } = {}) => {
		const { selectedIds: next, anchorId: nextAnchor } = resolveIdSelection({
			selectedIds,
			visibleIds: items.map((item) => item.id),
			id,
			anchorId,
			range,
		});
		setSelectedIds(next);
		setAnchorId(nextAnchor);
	};

	// --- Attachment-panel write-back (the two inherently-mutating actions) ---
	// Grid remove/reorder is a bulk action below; Edit Image and Delete act on the
	// real WP attachment, so they must reflect in the gallery: edit-image merges
	// regenerated geometry back onto the item; a permanent delete drops the item
	// (a dangling id would render a broken image).
	const updateItem = (patch, id) => {
		if (!id) {
			return;
		}
		onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
	};
	const deleteItem = (id) => {
		onChange(items.filter((item) => item.id !== id));
		setActiveItemId((prev) => (prev === id ? null : prev));
		setSelectedIds((prev) => prev.filter((sid) => sid !== id));
		setAnchorId((prev) => (prev === id ? null : prev));
	};

	// --- Grid actions: drag-reorder + bulk remove, persisted to the block ---
	const moveItem = (from, to) => {
		if (from === to || !Number.isInteger(from) || !Number.isInteger(to)) {
			return;
		}
		const next = items.slice();
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		onChange(next);
	};
	// Flip the whole gallery order — a quick alternative to dragging tiles one by
	// one. Persisted straight to the block.
	const reverseItems = () => onChange(items.slice().reverse());
	const removeSelected = () => {
		onChange(items.filter((item) => !selectedIds.includes(item.id)));
		setActiveItemId((prev) => (prev !== null && selectedIds.includes(prev) ? null : prev));
		setSelectedIds([]);
		setAnchorId(null);
	};
	const clearSelection = () => {
		setSelectedIds([]);
		setAnchorId(null);
	};

	return (
		<Modal
			title={__("Edit Gallery", "easy-lightbox-wp")}
			onRequestClose={onClose}
			className="sp-shaped-gallery-edit-gallery"
			overlayClassName="sp-shaped-gallery-edit-gallery__overlay"
			__experimentalHideHeader
		>
			<div className="sp-shaped-gallery-edit-gallery__layout">
				<GallerySidebar onCancelGallery={cancelGallery} onAddToGallery={onAddToGallery} />

				<div className="sp-shaped-gallery-eg-content">
					<header className="sp-shaped-gallery-eg-content__header">
						<h1 className="sp-shaped-gallery-eg-content__title">{__("Edit Gallery", "easy-lightbox-wp")}</h1>
					</header>

					<div className="sp-shaped-gallery-eg-workspace">
						{selectedIds.length > 0 && (
							<BulkActionBar
								count={selectedIds.length}
								onRemove={removeSelected}
								onClear={clearSelection}
							/>
						)}

						{/* Nothing selected: reorder-by-drag instructions. */}
						{selectedIds.length === 0 && items.length > 1 && (
							<ReorderHintBar onReverse={reverseItems} />
						)}

						<EditMediaGrid
							items={items}
							selectedIds={selectedIds}
							activeId={activeItemId}
							emptyMessage={__("No media to display.", "easy-lightbox-wp")}
							onToggleSelect={toggleSelect}
							onActivate={setActiveItemId}
							onReorder={moveItem}
							onRemove={deleteItem}
						/>
					</div>
				</div>

				<div className="sp-shaped-gallery-eg-rightcol">
					<header className="sp-shaped-gallery-eg-rightcol__header">
						<button
							type="button"
							className="sp-shaped-gallery-eg-close"
							aria-label={__("Close dialog", "easy-lightbox-wp")}
							onClick={onClose}
						>
							<Icon icon={close} size={22} />
						</button>
					</header>

					<AttachmentPanel
						key={activeItemId || "none"}
						item={activeItem}
						onUpdate={updateItem}
						onDelete={deleteItem}
					/>
				</div>
			</div>

			<footer className="sp-shaped-gallery-edit-gallery__footer">
				<button type="button" className="sp-shaped-gallery-eg-btn sp-shaped-gallery-eg-btn--primary" onClick={onInsert}>
					{__("Update Gallery", "easy-lightbox-wp")}
				</button>
			</footer>
		</Modal>
	);
}

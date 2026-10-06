/**
 * Contextual bulk-action bar above the media grid.
 *
 * Shown while one or more tiles are checked (in the default "All" view). Reports
 * the selection count and offers the bulk actions — clear the selection, or
 * remove the selected images from this gallery. Reuses the `.sp-shaped-gallery-eg-actionbar`
 * chrome so it lines up with the reorder hint bar.
 */
import { __, _n, sprintf } from "@wordpress/i18n";

/**
 * @param {Object}   props
 * @param {number}   props.count    Number of selected tiles.
 * @param {Function} props.onRemove Remove the selected images from the gallery.
 * @param {Function} props.onClear  Clear the current selection.
 * @return {JSX.Element} Bulk action bar.
 */
export default function BulkActionBar({ count, onRemove, onClear }) {
	return (
		<div className="sp-shaped-gallery-eg-actionbar" role="region" aria-label={__("Bulk actions", "easy-lightbox-wp")}>
			<p className="sp-shaped-gallery-eg-actionbar__text">
				{sprintf(
					/* translators: %d: number of selected images. */
					_n("%d image selected", "%d images selected", count, "easy-lightbox-wp"),
					count
				)}
			</p>

			<div className="sp-shaped-gallery-eg-actionbar__buttons">
				<button type="button" className="sp-shaped-gallery-eg-btn sp-shaped-gallery-eg-btn--ghost sp-shaped-gallery-eg-btn--sm" onClick={onClear}>
					{__("Clear", "easy-lightbox-wp")}
				</button>
				<button type="button" className="sp-shaped-gallery-eg-btn sp-shaped-gallery-eg-btn--primary sp-shaped-gallery-eg-btn--sm" onClick={onRemove}>
					{__("Remove from gallery", "easy-lightbox-wp")}
				</button>
			</div>
		</div>
	);
}

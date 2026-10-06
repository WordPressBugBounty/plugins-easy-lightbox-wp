/**
 * Instruction bar above the media grid in the default (reorder) view.
 *
 * Tells the user that tiles can be dragged to reorder, and offers a one-tap
 * "Reverse Order" action. Replaced by BulkActionBar while tiles are selected, so
 * the header area always carries the right context for the current mode.
 */
import { __ } from "@wordpress/i18n";

/**
 * @param {Object}   props
 * @param {Function} props.onReverse Reverse the gallery's item order.
 * @return {JSX.Element} Hint bar.
 */
export default function ReorderHintBar({ onReverse }) {
	return (
		<div className="sp-shaped-gallery-eg-hintbar" role="note">
			<span className="sp-shaped-gallery-eg-hintbar__text">
				{__("Drag and drop to reorder media files.", "easy-lightbox-wp")}
			</span>
			{onReverse && (
				<button type="button" className="sp-shaped-gallery-eg-btn sp-shaped-gallery-eg-btn--ghost sp-shaped-gallery-eg-btn--sm" onClick={onReverse}>
					{__("Reverse Order", "easy-lightbox-wp")}
				</button>
			)}
		</div>
	);
}

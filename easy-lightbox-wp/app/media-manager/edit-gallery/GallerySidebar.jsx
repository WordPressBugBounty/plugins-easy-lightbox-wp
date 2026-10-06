/**
 * Left sidebar of the Edit Gallery modal.
 *
 * Two stacked sections:
 *   1. Actions — "Cancel Gallery" (back).
 *   2. Context — "Edit Gallery" (the current screen) and "Add to Gallery".
 *
 * Pure presentation: every action is a prop callback the parent owns, so this
 * component holds no gallery state of its own.
 */
import { Icon, chevronLeft } from "@wordpress/icons";
import { __ } from "@wordpress/i18n";

/**
 * @param {Object}   props
 * @param {Function} props.onCancelGallery Back / cancel the gallery.
 * @param {Function} props.onAddToGallery  "Add to Gallery" action.
 * @return {JSX.Element} Sidebar.
 */
export default function GallerySidebar({ onCancelGallery, onAddToGallery }) {
	return (
		<aside className="sp-shaped-gallery-eg-sidebar" aria-label={__("Gallery actions", "easy-lightbox-wp")}>
			{/* ---- Actions ---- */}
			<div className="sp-shaped-gallery-eg-sidebar__section">
				<h2 className="sp-shaped-gallery-eg-sidebar__title">{__("Actions", "easy-lightbox-wp")}</h2>

				<button type="button" className="sp-shaped-gallery-eg-sidebar__back" onClick={onCancelGallery}>
					<Icon icon={chevronLeft} size={20} />
					<span>{__("Cancel Gallery", "easy-lightbox-wp")}</span>
				</button>
			</div>

			<div className="sp-shaped-gallery-eg-sidebar__divider" role="presentation" />

			<div className="sp-shaped-gallery-eg-sidebar__section sp-shaped-gallery-eg-sidebar__section--links">
				<p className="sp-shaped-gallery-eg-sidebar__current">{__("Edit Gallery", "easy-lightbox-wp")}</p>
				<button type="button" className="sp-shaped-gallery-eg-sidebar__link" onClick={onAddToGallery}>
					{__("Add to Gallery", "easy-lightbox-wp")}
				</button>
			</div>
		</aside>
	);
}

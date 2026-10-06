/**
 * Right sidebar — Attachment Details (redesigned Edit Gallery skin).
 *
 * Mirrors the native Media Library details panel: preview, read-only meta, the
 * Edit Image / Delete / Copy URL actions, and the editable Alt Text / Title /
 * Caption / Description / File URL / Custom URL fields.
 *
 * Custom URL is HIDDEN outright (not disabled) when the Image Custom Url module is
 * off, same as AttachmentDetails' copy of this field — see that file's doc-block.
 *
 * The live meta (date, filesize, filename, dimensions) and the destructive
 * actions come from the shared `useAttachmentDetails` hook — the same wp.media
 * logic the MediaModal panel uses, never duplicated. Field edits are
 * gallery-scoped: each keystroke patches the in-gallery MediaItem via `onUpdate`
 * (persisted to the block) and never touches the underlying WP attachment —
 * matching the MediaModal panel. With no active item the panel renders its
 * empty, disabled state.
 */
import { __ } from "@wordpress/i18n";
import useAttachmentDetails from "../useAttachmentDetails";
import MediaThumb from "../MediaThumb";

/**
 * Label + control row used by every field. Label sits in a fixed left column
 * (right-aligned) with the control filling the rest, per the design.
 *
 * @param {Object}      props
 * @param {string}      props.id       Control id (ties the label to the input).
 * @param {string}      props.label    Field label.
 * @param {JSX.Element} props.children The control.
 * @return {JSX.Element} Field row.
 */
const Field = ({ id, label, children }) => (
	<div className="sp-shaped-gallery-eg-field">
		<label className="sp-shaped-gallery-eg-field__label" htmlFor={id}>
			{label}
		</label>
		<div className="sp-shaped-gallery-eg-field__control">{children}</div>
	</div>
);

/**
 * @param {Object}   props
 * @param {?Object}  props.item     Active MediaItem, or null.
 * @param {Function} props.onUpdate Receives ( patch, id ) to patch that MediaItem —
 *                                  used for field edits and the image-editor merge-back.
 * @param {Function} props.onDelete Receives ( id ) after a permanent delete succeeds.
 * @return {JSX.Element} Panel.
 */
export default function AttachmentPanel({ item, onUpdate, onDelete }) {
	const {
		displayTitle,
		uploadDate,
		fileSize,
		fileUrl,
		originalFileName,
		displayDimensions,
		isLocalMedia,
		isLocalImage,
		imageCustomUrlEnabled,
		copied,
		copyUrl,
		editImage,
		deleteImage,
	} = useAttachmentDetails(item, { onUpdate, onDelete });

	const disabled = !item;
	// Persist each field edit straight onto the in-gallery MediaItem (gallery-scoped).
	const setField = (field) => (event) => onUpdate({ [field]: event.target.value }, item.id);


	return (
		<div className="sp-shaped-gallery-eg-details">
			<h2 className="sp-shaped-gallery-eg-details__title">{__("Attachment Details", "easy-lightbox-wp")}</h2>

			{item ? (
				<>
					{/* Real <img>/<video> via the shared MediaThumb — a background-image
					    URL breaks for poster-less videos and URLs with special chars. */}
					<div className="sp-shaped-gallery-eg-details__preview">
						<MediaThumb item={item} />
					</div>

					<div className="sp-shaped-gallery-eg-details__meta">
						{displayTitle && <p className="sp-shaped-gallery-eg-details__filename">{displayTitle}</p>}
						{uploadDate && <p className="sp-shaped-gallery-eg-details__metaline">{uploadDate}</p>}
						{fileSize && <p className="sp-shaped-gallery-eg-details__metaline">{fileSize}</p>}
						{displayDimensions && <p className="sp-shaped-gallery-eg-details__metaline">{displayDimensions}</p>}
						{fileUrl && (
							<p className="sp-shaped-gallery-eg-details__metaline">
								{__("Original image:", "easy-lightbox-wp")}{" "}
								<a
									className="sp-shaped-gallery-eg-link"
									href={fileUrl}
									target="_blank"
									rel="noreferrer noopener"
								>
									{originalFileName}
								</a>
							</p>
						)}
						{isLocalMedia && (
							<div className="sp-shaped-gallery-eg-details__links">
								{isLocalImage && (
									<button type="button" className="sp-shaped-gallery-eg-link" onClick={editImage}>
										{__("Edit Image", "easy-lightbox-wp")}
									</button>
								)}
								<button type="button" className="sp-shaped-gallery-eg-link sp-shaped-gallery-eg-link--danger" onClick={deleteImage}>
									{__("Delete permanently", "easy-lightbox-wp")}
								</button>
							</div>
						)}
					</div>

					<hr className="sp-shaped-gallery-eg-details__rule" />
				</>
			) : (
				<p className="sp-shaped-gallery-eg-details__none">
					{__("Select an image to view its details.", "easy-lightbox-wp")}
				</p>
			)}

			<Field id="sp-shaped-gallery-eg-alt" label={__("Alt Text", "easy-lightbox-wp")}>
				<textarea
					id="sp-shaped-gallery-eg-alt"
					className="sp-shaped-gallery-eg-input sp-shaped-gallery-eg-input--area"
					rows={2}
					disabled={disabled}
					value={item?.alt || ""}
					onChange={setField("alt")}
				/>
				<p className="sp-shaped-gallery-eg-field__help">
					<a className="sp-shaped-gallery-eg-link" href="#" onClick={(event) => event.preventDefault()}>
						{__("Learn how to describe the purpose of the image.", "easy-lightbox-wp")}
					</a>{" "}
					{__("Leave empty if the image is purely decorative.", "easy-lightbox-wp")}
				</p>
			</Field>

			<Field id="sp-shaped-gallery-eg-title" label={__("Title", "easy-lightbox-wp")}>
				<input
					id="sp-shaped-gallery-eg-title"
					type="text"
					className="sp-shaped-gallery-eg-input"
					disabled={disabled}
					value={item?.title || ""}
					onChange={setField("title")}
				/>
			</Field>

			<Field id="sp-shaped-gallery-eg-caption" label={__("Caption", "easy-lightbox-wp")}>
				<textarea
					id="sp-shaped-gallery-eg-caption"
					className="sp-shaped-gallery-eg-input sp-shaped-gallery-eg-input--area"
					rows={3}
					disabled={disabled}
					value={item?.caption || ""}
					onChange={setField("caption")}
				/>
			</Field>

			<Field id="sp-shaped-gallery-eg-description" label={__("Description", "easy-lightbox-wp")}>
				<textarea
					id="sp-shaped-gallery-eg-description"
					className="sp-shaped-gallery-eg-input sp-shaped-gallery-eg-input--area"
					rows={3}
					disabled={disabled}
					value={item?.description || ""}
					onChange={setField("description")}
				/>
			</Field>

			<Field id="sp-shaped-gallery-eg-fileurl" label={__("File URL:", "easy-lightbox-wp")}>
				<input
					id="sp-shaped-gallery-eg-fileurl"
					type="text"
					className="sp-shaped-gallery-eg-input sp-shaped-gallery-eg-input--readonly"
					readOnly
					value={fileUrl}
				/>
				<button type="button" className="sp-shaped-gallery-eg-copybtn" disabled={disabled || !fileUrl} onClick={copyUrl}>
					{copied
						? __("Copied!", "easy-lightbox-wp")
						: __("Copy URL to clipboard", "easy-lightbox-wp")}
				</button>
			</Field>

			{imageCustomUrlEnabled && (
				<Field id="sp-shaped-gallery-eg-customurl" label={__("Custom URL", "easy-lightbox-wp")}>
					<input
						id="sp-shaped-gallery-eg-customurl"
						type="text"
						className="sp-shaped-gallery-eg-input"
						disabled={disabled}
						value={item?.link || ""}
						onChange={setField("link")}
					/>
				</Field>
			)}
		</div>
	);
}

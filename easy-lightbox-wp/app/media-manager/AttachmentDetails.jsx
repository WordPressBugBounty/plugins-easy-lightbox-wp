/**
 * Right-hand "Attachment Details" panel. Shows a preview + lightweight meta and
 * lets the user edit Alt/Title/Caption/Description/Custom URL for the active item.
 * Custom URL is HIDDEN outright — not disabled — when the Image Custom Url module
 * is off (`imageCustomUrlEnabled` from the shared localize payload); a value already
 * stored on the item is untouched and reappears the moment the module is back on.
 *
 * Layout mirrors the Figma media modal: a small landscape preview, a compact
 * meta block, a divider, then label-left / control-right field rows (the same
 * shape WP core's own attachment details uses).
 *
 * The wp.media logic (live meta fetch, Edit Image, Delete permanently) lives in
 * the shared `useAttachmentDetails` hook — this component is a skin over it. Two
 * scopes of change apply here:
 * - Metadata edits (Alt/Title/Caption/Description/Custom URL) are gallery-only:
 *   they patch the in-gallery MediaItem via `onUpdate` and never touch the
 *   underlying WP attachment. Fields are editable only for items in the selection.
 * - Destructive core actions ("Edit Image", "Delete permanently") act on the real
 *   WP attachment via the hook; on a successful delete `onDelete` tells MediaModal
 *   to drop the item so no broken placeholder lingers.
 */
import { __ } from '@wordpress/i18n';
import { ExternalLink } from '@wordpress/components';
import useAttachmentDetails from './useAttachmentDetails';
import MediaThumb from './MediaThumb';

/**
 * A single label-left / control-right detail row.
 *
 * @param {Object}      props
 * @param {string}      props.id       Control id (ties the label to the control).
 * @param {string}      props.label    Field label.
 * @param {JSX.Element} props.children The control (input/textarea + extras).
 * @return {JSX.Element} Field row.
 */
function Field( { id, label, children } ) {
	return (
		<div className="sp-shaped-gallery-details__field">
			<label className="sp-shaped-gallery-details__label" htmlFor={ id }>
				{ label }
			</label>
			<div className="sp-shaped-gallery-details__control">{ children }</div>
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.item     Active MediaItem (or null).
 * @param {boolean}  props.selected Whether the item is in the gallery selection. When
 *                                  false the panel shows a placeholder instead of details.
 * @param {Function} props.onUpdate Receives ( patch, id? ) and patches that MediaItem.
 * @param {Function} props.onDelete Receives ( id ) after a permanent delete succeeds.
 * @return {JSX.Element|null} Panel, or null when there is no active item.
 */
export default function AttachmentDetails( { item, selected, onUpdate, onDelete } ) {
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
	} = useAttachmentDetails( item, { onUpdate, onDelete } );

	const title = <h3 className="sp-shaped-gallery-details__title">{ __( 'Attachment Details', 'easy-lightbox-wp' ) }</h3>;

	// Details are shown only for an item that is actually in the gallery — mirrors
	// the native Media Library, where deselecting empties the sidebar. With no
	// active item, or an active-but-deselected one, show a short message instead of
	// stale details (so unchecking an image clears the panel).
	if ( ! item || ! selected ) {
		return (
			<aside className="sp-shaped-gallery-media-modal__details is-empty">
				{ title }
				<p className="sp-shaped-gallery-details__placeholder">
					{ __( 'No item selected. Select an item to see its details.', 'easy-lightbox-wp' ) }
				</p>
			</aside>
		);
	}

	const set = ( key ) => ( event ) => onUpdate( { [ key ]: event.target.value } );
	const idFor = ( key ) => `sp-shaped-gallery-detail-${ key }`;

	return (
		<aside className="sp-shaped-gallery-media-modal__details">
			{ title }

			<div className="sp-shaped-gallery-details__preview">
				<MediaThumb item={ item } />
			</div>

			<div className="sp-shaped-gallery-details__meta">
				{ displayTitle && <p className="sp-shaped-gallery-details__filename">{ displayTitle }</p> }
				{ uploadDate && <p className="sp-shaped-gallery-details__date">{ uploadDate }</p> }
				{ fileSize && <p className="sp-shaped-gallery-details__filesize">{ fileSize }</p> }
				{ displayDimensions && <p className="sp-shaped-gallery-details__dim">{ displayDimensions }</p> }
				{ fileUrl && (
					<p className="sp-shaped-gallery-details__original">
						{ __( 'Original image:', 'easy-lightbox-wp' ) }{ ' ' }
						<ExternalLink href={ fileUrl }>{ originalFileName }</ExternalLink>
					</p>
				) }
				{ isLocalMedia && (
					<div className="sp-shaped-gallery-details__actions">
						{ isLocalImage && (
							<button
								type="button"
								className="sp-shaped-gallery-details__edit-image-btn"
								onClick={ editImage }
							>
								{ __( 'Edit Image', 'easy-lightbox-wp' ) }
							</button>
						) }
						<button
							type="button"
							className="sp-shaped-gallery-details__delete-btn"
							onClick={ deleteImage }
						>
							{ __( 'Delete permanently', 'easy-lightbox-wp' ) }
						</button>
					</div>
				) }
			</div>

			<div className="sp-shaped-gallery-details__divider" role="presentation" />

			<div className="sp-shaped-gallery-details__fields">
				<Field id={ idFor( 'alt' ) } label={ __( 'Alt Text', 'easy-lightbox-wp' ) }>
					<textarea
						id={ idFor( 'alt' ) }
						className="sp-shaped-gallery-details__input sp-shaped-gallery-details__textarea"
						value={ item.alt || '' }
						onChange={ set( 'alt' ) }
					/>
				</Field>

				<Field id={ idFor( 'title' ) } label={ __( 'Title', 'easy-lightbox-wp' ) }>
					<input
						id={ idFor( 'title' ) }
						type="text"
						className="sp-shaped-gallery-details__input"
						value={ item.title || '' }
						onChange={ set( 'title' ) }
					/>
				</Field>

				<Field id={ idFor( 'caption' ) } label={ __( 'Caption', 'easy-lightbox-wp' ) }>
					<textarea
						id={ idFor( 'caption' ) }
						className="sp-shaped-gallery-details__input sp-shaped-gallery-details__textarea"
						value={ item.caption || '' }
						onChange={ set( 'caption' ) }
					/>
				</Field>

				<Field id={ idFor( 'description' ) } label={ __( 'Description', 'easy-lightbox-wp' ) }>
					<textarea
						id={ idFor( 'description' ) }
						className="sp-shaped-gallery-details__input sp-shaped-gallery-details__textarea"
						value={ item.description || '' }
						onChange={ set( 'description' ) }
					/>
				</Field>

				<Field id={ idFor( 'file-url' ) } label={ __( 'File URL', 'easy-lightbox-wp' ) }>
					<input
						id={ idFor( 'file-url' ) }
						type="text"
						className="sp-shaped-gallery-details__input sp-shaped-gallery-details__input--readonly"
						value={ fileUrl }
						readOnly
					/>
					<button
						type="button"
						className="sp-shaped-gallery-details__copy"
						onClick={ copyUrl }
						disabled={ ! fileUrl }
					>
						{ copied
							? __( 'Copied!', 'easy-lightbox-wp' )
							: __( 'Copy URL to clipboard', 'easy-lightbox-wp' ) }
					</button>
				</Field>

				{ imageCustomUrlEnabled && (
					<Field id={ idFor( 'custom-url' ) } label={ __( 'Custom URL', 'easy-lightbox-wp' ) }>
						<input
							id={ idFor( 'custom-url' ) }
							type="text"
							className="sp-shaped-gallery-details__input"
							value={ item.link || '' }
							onChange={ set( 'link' ) }
						/>
					</Field>
				) }
			</div>
		</aside>
	);
}

/**
 * "Upload files" tab content. The dropzone binds `wp.Uploader` (core's own
 * plupload wrapper) directly onto this component's own DOM via
 * `useWpUploader` — reusing core's upload transport + mime validation without
 * opening a second native media modal. Clicking "Select Files" opens the OS
 * file picker immediately; finished uploads flow back into the grid selection.
 */
import { __, sprintf } from '@wordpress/i18n';
import { Icon, upload } from '@wordpress/icons';
import useWpUploader from './useWpUploader';

/**
 * @param {Object}   props
 * @param {Function} props.onUploaded Called with a normalized MediaItem per finished upload.
 * @return {JSX.Element} Upload pane.
 */
export default function UploadPane( { onUploaded } ) {
	const { dropzoneRef, fileInputRef, uploading, error, openFileDialog, onFilesChosen } = useWpUploader( {
		onUploaded,
	} );

	return (
		<div className="sp-shaped-gallery-media-modal__upload">
			<div className="sp-shaped-gallery-upload__dropzone" ref={ dropzoneRef }>
				<span className="sp-shaped-gallery-upload__icon" aria-hidden="true">
					<Icon icon={ upload } size={ 40 } />
				</span>
				<span className="sp-shaped-gallery-upload__title">{ __( 'Drop files to upload', 'easy-lightbox-wp' ) }</span>
				<span className="sp-shaped-gallery-upload__hint">{ __( 'or', 'easy-lightbox-wp' ) }</span>
				<button type="button" className="sp-shaped-gallery-btn sp-shaped-gallery-btn--secondary" onClick={ openFileDialog }>
					{ __( 'Select Files', 'easy-lightbox-wp' ) }
				</button>
				<input
					ref={ fileInputRef }
					type="file"
					multiple
					accept="image/*,video/*"
					className="sp-shaped-gallery-upload__input"
					tabIndex={ -1 }
					aria-hidden="true"
					onChange={ onFilesChosen }
				/>
			</div>

			{ !! uploading.length && (
				<ul className="sp-shaped-gallery-upload__queue">
					{ uploading.map( ( attachment ) => (
						<li key={ attachment.cid } className="sp-shaped-gallery-upload__queue-item">
							{ sprintf(
								/* translators: 1: file name, 2: upload percent. */
								__( 'Uploading %1$s… %2$d%%', 'easy-lightbox-wp' ),
								attachment.get( 'filename' ),
								attachment.get( 'percent' ) || 0
							) }
						</li>
					) ) }
				</ul>
			) }

			{ !! error && <p className="sp-shaped-gallery-upload__error">{ error }</p> }
		</div>
	);
}

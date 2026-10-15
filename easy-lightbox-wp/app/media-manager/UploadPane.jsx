/**
 * "Upload files" tab content. The dropzone binds `wp.Uploader` (core's own
 * plupload wrapper) directly onto this component's own DOM via
 * `useWpUploader` — reusing core's upload transport + mime validation without
 * opening a second native media modal. Clicking "Select Files" opens the OS
 * file picker immediately; finished uploads flow back into the grid selection.
 *
 * While a batch runs, one core `ProgressBar` tracks the byte-weighted progress
 * of the whole batch beside a done/total counter, with a compact row per file
 * (local preview, size, status) underneath. The pane stays focused
 * on uploading — it never opens Attachment Details; once every file in the
 * batch has succeeded, `onComplete` hands the items to the modal.
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { ProgressBar, Spinner } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { Icon, upload, check, closeSmall, image, video } from '@wordpress/icons';
import useWpUploader from './useWpUploader';
import { BATCH_STATUS, ENTRY_STATUS, entryPercent } from './upload-batch';

/**
 * Header copy per batch state: title + supporting line.
 *
 * @param {Object} summary Batch summary from `summarizeBatch()`.
 * @return {{title: string, detail: string}} Localized copy.
 */
const headerCopy = ( summary ) => {
	if ( BATCH_STATUS.COMPLETE === summary.status ) {
		return {
			title: __( 'Upload complete', 'easy-lightbox-wp' ),
			detail: sprintf(
				/* translators: %d: number of uploaded files. */
				_n(
					'%d file added to your selection',
					'%d files added to your selection',
					summary.done,
					'easy-lightbox-wp'
				),
				summary.done
			),
		};
	}
	if ( BATCH_STATUS.FAILED === summary.status ) {
		return {
			title: sprintf(
				/* translators: 1: number of failed files, 2: number of files in the upload. */
				_n(
					'%1$d of %2$d file failed to upload',
					'%1$d of %2$d files failed to upload',
					summary.total,
					'easy-lightbox-wp'
				),
				summary.failed,
				summary.total
			),
			detail: summary.done
				? __( 'Files that uploaded are kept in your selection.', 'easy-lightbox-wp' )
				: __( 'Check the files below and try again.', 'easy-lightbox-wp' ),
		};
	}
	return {
		title: sprintf(
			/* translators: %d: number of files in the upload. */
			_n( 'Uploading %d file', 'Uploading %d files', summary.total, 'easy-lightbox-wp' ),
			summary.total
		),
		detail: sprintf(
			/* translators: %d: upload percent. */
			__( '%d%% complete', 'easy-lightbox-wp' ),
			summary.percent
		),
	};
};

/**
 * Human-readable file size.
 *
 * @param {number} bytes Size in bytes.
 * @return {string} Localized size, or '' when unknown.
 */
const formatSize = ( bytes ) => {
	if ( ! bytes ) {
		return '';
	}
	const units = [
		/* translators: %s: file size in bytes. */
		( value ) => sprintf( __( '%s B', 'easy-lightbox-wp' ), value ),
		/* translators: %s: file size in kilobytes. */
		( value ) => sprintf( __( '%s KB', 'easy-lightbox-wp' ), value ),
		/* translators: %s: file size in megabytes. */
		( value ) => sprintf( __( '%s MB', 'easy-lightbox-wp' ), value ),
		/* translators: %s: file size in gigabytes. */
		( value ) => sprintf( __( '%s GB', 'easy-lightbox-wp' ), value ),
	];
	const step = Math.min( units.length - 1, Math.floor( Math.log( bytes ) / Math.log( 1024 ) ) );
	const value = bytes / Math.pow( 1024, step );
	return units[ step ]( value.toLocaleString( undefined, { maximumFractionDigits: step > 1 ? 1 : 0 } ) );
};

/**
 * Status line for one file row.
 *
 * @param {Object} entry Batch entry.
 * @return {string} Localized status.
 */
const entryStatus = ( entry ) => {
	if ( ENTRY_STATUS.DONE === entry.status ) {
		return __( 'Uploaded', 'easy-lightbox-wp' );
	}
	if ( ENTRY_STATUS.FAILED === entry.status ) {
		return entry.message || __( 'Upload failed', 'easy-lightbox-wp' );
	}
	// Every byte is sent but core is still generating sub-sizes server-side.
	if ( entryPercent( entry ) >= 100 ) {
		return __( 'Processing…', 'easy-lightbox-wp' );
	}
	return __( 'Uploading…', 'easy-lightbox-wp' );
};

/**
 * Trailing indicator for one file row.
 *
 * @param {Object} props       Props.
 * @param {Object} props.entry Batch entry.
 * @return {JSX.Element} Indicator.
 */
function EntryIndicator( { entry } ) {
	if ( ENTRY_STATUS.DONE === entry.status ) {
		return (
			<span className="sp-shaped-gallery-upload__badge is-done" aria-hidden="true">
				<Icon icon={ check } size={ 16 } />
			</span>
		);
	}
	if ( ENTRY_STATUS.FAILED === entry.status ) {
		return (
			<span className="sp-shaped-gallery-upload__badge is-failed" aria-hidden="true">
				<Icon icon={ closeSmall } size={ 16 } />
			</span>
		);
	}
	const percent = entryPercent( entry );
	if ( percent >= 100 ) {
		return <Spinner className="sp-shaped-gallery-upload__spinner" />;
	}
	return (
		<span className="sp-shaped-gallery-upload__file-percent">
			{ sprintf(
				/* translators: %d: upload percent. */
				__( '%d%%', 'easy-lightbox-wp' ),
				percent
			) }
		</span>
	);
}

/**
 * Row thumbnail: the local preview when the browser can draw it, otherwise a
 * media-kind glyph (videos, HEIC, filter rejections).
 *
 * @param {Object} props       Props.
 * @param {Object} props.entry Batch entry.
 * @return {JSX.Element} Thumbnail.
 */
function EntryThumb( { entry } ) {
	const [ broken, setBroken ] = useState( false );
	return (
		<span className="sp-shaped-gallery-upload__thumb" aria-hidden="true">
			{ entry.preview && ! broken ? (
				<img src={ entry.preview } alt="" onError={ () => setBroken( true ) } />
			) : (
				<Icon icon={ 'video' === entry.kind ? video : image } size={ 20 } />
			) }
		</span>
	);
}

/**
 * @param {Object}   props
 * @param {Function} props.onUploaded   Called with a normalized MediaItem per finished upload.
 * @param {Function} [props.onComplete] Called with the batch's MediaItem[] once every file in it succeeded.
 * @return {JSX.Element} Upload pane.
 */
export default function UploadPane( { onUploaded, onComplete } ) {
	const { dropzoneRef, fileInputRef, batch, summary, openFileDialog, onFilesChosen, onDropCapture } = useWpUploader(
		{
			onUploaded,
			onComplete,
		}
	);
	const copy = headerCopy( summary );
	const isFailed = BATCH_STATUS.FAILED === summary.status;
	const isComplete = BATCH_STATUS.COMPLETE === summary.status;
	let statusIcon = upload;
	if ( isComplete ) {
		statusIcon = check;
	} else if ( isFailed ) {
		statusIcon = closeSmall;
	}

	return (
		<div className={ `sp-shaped-gallery-media-modal__upload${ batch.length ? ' has-progress' : '' }` }>
			<div className="sp-shaped-gallery-upload__dropzone" ref={ dropzoneRef } onDropCapture={ onDropCapture }>
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

			{ !! batch.length && (
				<section
					className={ `sp-shaped-gallery-upload__progress is-${ summary.status }` }
					aria-label={ __( 'Upload progress', 'easy-lightbox-wp' ) }
				>
					<div className="sp-shaped-gallery-upload__progress-head">
						<span className="sp-shaped-gallery-upload__status-icon" aria-hidden="true">
							<Icon icon={ statusIcon } size={ 20 } />
						</span>
						<div className="sp-shaped-gallery-upload__progress-text">
							<span className="sp-shaped-gallery-upload__progress-label" role="status" aria-live="polite">
								{ copy.title }
							</span>
							<span className="sp-shaped-gallery-upload__progress-detail">{ copy.detail }</span>
						</div>
						<span
							className="sp-shaped-gallery-upload__counter"
							aria-label={ sprintf(
								/* translators: 1: number of uploaded files, 2: number of files in the upload. */
								__( '%1$d of %2$d files uploaded', 'easy-lightbox-wp' ),
								summary.done,
								summary.total
							) }
						>
							<span className="sp-shaped-gallery-upload__counter-done">{ summary.done }</span>
							<span className="sp-shaped-gallery-upload__counter-total">
								{ sprintf(
									/* translators: %d: number of files in the upload. */
									__( '/%d', 'easy-lightbox-wp' ),
									summary.total
								) }
							</span>
						</span>
					</div>

					{ ! isFailed && (
						<ProgressBar
							className="sp-shaped-gallery-upload__bar"
							value={ summary.percent }
							aria-label={ __( 'Upload progress', 'easy-lightbox-wp' ) }
						/>
					) }

					<ul className="sp-shaped-gallery-upload__queue">
						{ batch.map( ( entry ) => {
							// A failed row gives its line to the error message alone.
							const size = ENTRY_STATUS.FAILED === entry.status ? '' : formatSize( entry.size );
							return (
								<li key={ entry.id } className={ `sp-shaped-gallery-upload__queue-item is-${ entry.status }` }>
									<EntryThumb entry={ entry } />
									<span className="sp-shaped-gallery-upload__file">
										<span className="sp-shaped-gallery-upload__file-name" title={ entry.name }>
											{ entry.name }
										</span>
										<span className="sp-shaped-gallery-upload__file-meta">
											{ size && <span className="sp-shaped-gallery-upload__file-size">{ size }</span> }
											<span className="sp-shaped-gallery-upload__file-status">{ entryStatus( entry ) }</span>
										</span>
									</span>
									<EntryIndicator entry={ entry } />
								</li>
							);
						} ) }
					</ul>
				</section>
			) }
		</div>
	);
}

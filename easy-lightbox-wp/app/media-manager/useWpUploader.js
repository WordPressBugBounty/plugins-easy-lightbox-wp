/**
 * Hook that binds WordPress's native `wp.Uploader` (the plupload wrapper core
 * itself uses for the Media modal's inline "Upload files" tab) directly to our
 * own dropzone living inside our own modal.
 *
 * This intentionally avoids `wp.media()` — that factory builds a whole second
 * Frame (its own title bar, tabs, and "Add to gallery" footer button), so
 * routing the upload tab through it stacks a native WordPress media modal on
 * top of ours. `wp.Uploader` is the lower-level piece Frames use internally;
 * binding it to our own DOM keeps a single modal while still reusing core's
 * upload transport, mime validation, and error handling.
 *
 * It also deliberately skips `wp.Uploader`'s own `browser` option (a button it
 * wires a native file-input shim onto, refreshed on every `mouseenter`). That
 * refresh can land mid-selection — the OS dialog closes, the cursor re-enters
 * the button, `mouseenter` fires, and the shim gets rebuilt just as the prior
 * `change` is being processed — dropping the first file selection and forcing
 * the picker open again on the next click. Driving a plain native
 * `<input type="file">` ourselves (see `openFileDialog`/`onFilesChosen`) makes
 * file selection a plain, single-shot browser interaction; the chosen files
 * still feed straight into the same plupload queue via `addFile()`, so upload
 * transport/validation/progress are untouched.
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { normalizeAttachment } from './normalize';
import { invalidateProvider } from './useMediaLibrary';
import {
	BATCH_STATUS,
	EMPTY_BATCH,
	addEntry,
	markEntryDone,
	markEntryFailed,
	setEntryProgress,
	summarizeBatch,
	uploadedItems,
} from './upload-batch';

/**
 * How long the finished (100%) state stays on screen before `onComplete`
 * fires, so the user sees the batch land before the view changes. Also the
 * window in which a follow-up selection's files can still join the batch and
 * cancel the hand-off (see `added`).
 *
 * @type {number}
 */
const COMPLETE_DELAY = 600;

/**
 * Describe a queued plupload file for its progress row: its media kind and,
 * for images, a local object-URL preview so the row shows the picture before
 * the server has made a thumbnail.
 *
 * @param {Object} [file] Plupload file.
 * @return {{kind: string, preview: string}} Row media.
 */
const describeFile = ( file ) => {
	const native = file?.getNative?.();
	const type = native?.type || file?.type || '';
	const kind = type.split( '/' )[ 0 ];
	const preview =
		'image' === kind && native && typeof window !== 'undefined' && window.URL?.createObjectURL
			? window.URL.createObjectURL( native )
			: '';
	return { kind: 'image' === kind || 'video' === kind ? kind : '', preview };
};

/**
 * Release the object URLs a batch holds.
 *
 * @param {Array} entries Batch entries.
 */
const revokePreviews = ( entries ) =>
	entries.forEach( ( entry ) => entry.preview && window.URL?.revokeObjectURL?.( entry.preview ) );

/**
 * @param {Object}   options
 * @param {Function} options.onUploaded   Called with a normalized MediaItem once a file finishes uploading.
 * @param {Function} [options.onComplete] Called with every MediaItem of the batch once ALL of its files
 *                                        uploaded successfully. Never called for a batch with a failure.
 * @return {Object} Refs/handlers to wire up the dropzone + file input, plus the batch entries and summary.
 */
export default function useWpUploader( { onUploaded, onComplete } ) {
	const dropzoneRef = useRef( null );
	const fileInputRef = useRef( null );
	const uploaderRef = useRef( null );
	const onUploadedRef = useRef( onUploaded );
	const onCompleteRef = useRef( onComplete );
	// Plupload callbacks fire outside React; the ref is the batch's source of
	// truth so each event reads the latest entries synchronously, and the
	// state mirror drives rendering.
	const batchRef = useRef( EMPTY_BATCH );
	const completeTimerRef = useRef( 0 );
	const [ batch, setBatch ] = useState( EMPTY_BATCH );

	useEffect( () => {
		onUploadedRef.current = onUploaded;
		onCompleteRef.current = onComplete;
	}, [ onUploaded, onComplete ] );

	useEffect( () => {
		/**
		 * Publish the next batch to the ref and to render state.
		 *
		 * @param {Array} next Next batch entries.
		 */
		const commit = ( next ) => {
			batchRef.current = next;
			setBatch( next );
		};

		/**
		 * Drop a pending completion hand-off — more files joined the batch.
		 */
		const cancelComplete = () => {
			window.clearTimeout( completeTimerRef.current );
			completeTimerRef.current = 0;
		};

		/**
		 * Once the last in-flight file settles, hand the batch off — but only
		 * when every file succeeded. A batch with any failure stays put so the
		 * user can read the error; its successful files were already merged
		 * into the selection by `onUploaded`.
		 */
		const settle = () => {
			if ( BATCH_STATUS.COMPLETE !== summarizeBatch( batchRef.current ).status ) {
				return;
			}
			cancelComplete();
			completeTimerRef.current = window.setTimeout( () => {
				completeTimerRef.current = 0;
				const current = batchRef.current;
				// Re-check: an error or a late file may have landed meanwhile.
				if ( BATCH_STATUS.COMPLETE === summarizeBatch( current ).status ) {
					onCompleteRef.current?.( uploadedItems( current ) );
				}
			}, COMPLETE_DELAY );
		};

		const WpUploader = typeof window !== 'undefined' ? window.wp?.Uploader : null;
		if ( ! WpUploader ) {
			return cancelComplete;
		}

		const uploader = new WpUploader( {
			dropzone: dropzoneRef.current,
			added( attachment ) {
				cancelComplete();
				const file = attachment.get( 'file' );
				commit(
					addEntry( batchRef.current, {
						id: file?.id || attachment.cid,
						cid: attachment.cid,
						name: attachment.get( 'filename' ),
						size: attachment.get( 'size' ),
						...describeFile( file ),
					} )
				);
			},
			progress( attachment ) {
				// The model carries plupload's running byte count; `percent` is
				// derived from it per file and byte-weighted for the batch.
				commit( setEntryProgress( batchRef.current, attachment.cid, attachment.get( 'loaded' ) ) );
			},
			success( attachment ) {
				const item = normalizeAttachment( attachment.toJSON() );
				// A completed upload changes the library — drop the cached
				// media_library browse pages so the next open refetches page 1
				// with the new item on top (date DESC).
				invalidateProvider( 'media_library' );
				commit( markEntryDone( batchRef.current, attachment.cid, item ) );
				onUploadedRef.current?.( item );
				settle();
			},
			error( message, data, file ) {
				// Fail only the file core reports (siblings keep uploading).
				// Filter rejections (e.g. file too large) fire before an
				// attachment model exists, so key on plupload's own file id —
				// still recorded so the batch knows it is not a clean success.
				commit(
					markEntryFailed( batchRef.current, {
						id: file?.id || file?.attachment?.cid || `error-${ batchRef.current.length }`,
						name: file?.name || '',
						message,
					} )
				);
				settle();
			},
		} );
		uploaderRef.current = uploader;

		return () => {
			cancelComplete();
			revokePreviews( batchRef.current );
			uploader.uploader?.destroy();
			uploaderRef.current = null;
		};
	}, [] );

	/**
	 * Open a new batch when the user starts a selection — unless files are
	 * still in flight, in which case the new files join the running batch and
	 * the hand-off waits for all of them. Called before plupload sees the
	 * files, so filter rejections raised while it adds them land in the batch
	 * they belong to.
	 */
	const beginSelection = () => {
		if ( summarizeBatch( batchRef.current ).inFlight ) {
			return;
		}
		window.clearTimeout( completeTimerRef.current );
		completeTimerRef.current = 0;
		revokePreviews( batchRef.current );
		batchRef.current = EMPTY_BATCH;
		setBatch( EMPTY_BATCH );
	};

	/**
	 * Open the OS file picker via the hidden native input — a plain browser
	 * gesture, so exactly one dialog opens per click.
	 */
	const openFileDialog = () => fileInputRef.current?.click();

	/**
	 * Feed the chosen files into the existing plupload queue, then reset the
	 * input so selecting the same file again still fires `change`.
	 *
	 * @param {Event} event Native `change` event from the hidden file input.
	 */
	const onFilesChosen = ( event ) => {
		const input = event.target;
		if ( input.files?.length && uploaderRef.current?.uploader ) {
			beginSelection();
			uploaderRef.current.uploader.addFile( input );
		}
		input.value = '';
	};

	/**
	 * Capture-phase drop handler for the dropzone. React's capture listener
	 * sits on the root container, so it runs before plupload's own `drop`
	 * listener on the dropzone queues the files.
	 *
	 * @param {DragEvent} event Drop event.
	 */
	const onDropCapture = ( event ) => {
		if ( event.dataTransfer?.files?.length ) {
			beginSelection();
		}
	};

	return {
		dropzoneRef,
		fileInputRef,
		batch,
		summary: summarizeBatch( batch ),
		openFileDialog,
		onFilesChosen,
		onDropCapture,
	};
}

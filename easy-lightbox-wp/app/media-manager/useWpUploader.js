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

/**
 * @param {Object}   options
 * @param {Function} options.onUploaded Called with a normalized MediaItem once a file finishes uploading.
 * @return {Object} Refs/handlers to wire up the dropzone + file input, plus in-flight upload state.
 */
export default function useWpUploader( { onUploaded } ) {
	const dropzoneRef = useRef( null );
	const fileInputRef = useRef( null );
	const uploaderRef = useRef( null );
	const onUploadedRef = useRef( onUploaded );
	const [ uploading, setUploading ] = useState( [] );
	const [ error, setError ] = useState( '' );

	useEffect( () => {
		onUploadedRef.current = onUploaded;
	}, [ onUploaded ] );

	useEffect( () => {
		const WpUploader = typeof window !== 'undefined' ? window.wp?.Uploader : null;
		if ( ! WpUploader ) {
			return;
		}

		const uploader = new WpUploader( {
			dropzone: dropzoneRef.current,
			added( attachment ) {
				setError( '' );
				setUploading( ( prev ) => [ ...prev, attachment ] );
			},
			progress() {
				// Attachment models mutate in place; force a re-render so the
				// queue list picks up the new `percent`.
				setUploading( ( prev ) => [ ...prev ] );
			},
			success( attachment ) {
				setUploading( ( prev ) => prev.filter( ( a ) => a.cid !== attachment.cid ) );
				// A completed upload changes the library — drop the cached
				// media_library browse pages so the next open refetches page 1
				// with the new item on top (date DESC).
				invalidateProvider( 'media_library' );
				onUploadedRef.current?.( normalizeAttachment( attachment.toJSON() ) );
			},
			error( message, data, file ) {
				// Drop only the file that failed (core hands us its model), not
				// every still-pending upload — plupload marks the whole queue
				// `uploading` up front, so a blanket flag filter would wipe
				// siblings still in flight. Filter rejections (e.g. file too
				// large) fire before an attachment model exists, so guard it.
				const cid = file?.attachment?.cid;
				if ( cid ) {
					setUploading( ( prev ) => prev.filter( ( a ) => a.cid !== cid ) );
				}
				setError( message );
			},
		} );
		uploaderRef.current = uploader;

		return () => {
			uploader.uploader?.destroy();
			uploaderRef.current = null;
		};
	}, [] );

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
			uploaderRef.current.uploader.addFile( input );
		}
		input.value = '';
	};

	return { dropzoneRef, fileInputRef, uploading, error, openFileDialog, onFilesChosen };
}

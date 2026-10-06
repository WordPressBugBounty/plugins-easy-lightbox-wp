/**
 * useAttachmentDetails — shared attachment-details logic for both details panels
 * (the MediaModal `AttachmentDetails` and the redesigned Edit Gallery
 * `AttachmentPanel`). Keeping it in one hook means the wp.media (Backbone) code —
 * live metadata fetch, the image editor frame, and permanent delete — lives once;
 * the two panels are pure skins over the values + handlers returned here.
 *
 * Scope split mirrors the native Media Library:
 * - Read-only meta (date, filesize, filename, dimensions) is fetched live from the
 *   real attachment; the stored MediaItem does not carry these fields.
 * - Destructive core actions act on the real WP attachment: "Edit Image" opens
 *   core's image-editor frame and merges regenerated geometry back via `onUpdate`;
 *   "Delete permanently" destroys the attachment and calls `onDelete` on success so
 *   the caller can drop it from the gallery (no dangling reference / broken image).
 */
import { useState, useRef, useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { normalizeAttachment } from './normalize';

/**
 * Lazily load core's `media-grid` script, which defines the Edit Image frame
 * (`wp.media.view.MediaFrame.EditAttachments`). The plugin no longer enqueues it
 * up front — it is the heaviest media handle and is used only for Edit Image — so
 * it is injected the first time Edit Image runs. Its one dependency (`media-editor`)
 * is already loaded (via `wp_enqueue_media()` / the block's editor deps), so the
 * bare script can be appended. Repeat/concurrent calls share one in-flight promise;
 * a failed load clears it so a later click can retry.
 *
 * @type {?Promise<boolean>}
 */
let mediaGridPromise = null;

/**
 * @return {Promise<boolean>} Resolves true once EditAttachments is available.
 */
function ensureMediaGrid() {
	if ( window.wp?.media?.view?.MediaFrame?.EditAttachments ) {
		return Promise.resolve( true );
	}
	if ( mediaGridPromise ) {
		return mediaGridPromise;
	}
	const localize = window.shaped_gallery_admin || window.shaped_gallery_data || {};
	const src = localize.mediaGridSrc;
	if ( ! src ) {
		return Promise.resolve( false );
	}
	mediaGridPromise = new Promise( ( resolve ) => {
		const script = window.document.createElement( 'script' );
		script.src = src;
		script.onload = () => resolve( !! window.wp?.media?.view?.MediaFrame?.EditAttachments );
		script.onerror = () => {
			mediaGridPromise = null; // Allow a retry on the next click.
			resolve( false );
		};
		window.document.body.appendChild( script );
	} );
	return mediaGridPromise;
}

/**
 * Last path segment of a URL (the file name).
 *
 * @param {string} url URL.
 * @return {string} File name.
 */
export function fileNameFromUrl( url ) {
	if ( ! url ) {
		return '';
	}
	const clean = url.split( '?' )[ 0 ].split( '#' )[ 0 ];
	return clean.substring( clean.lastIndexOf( '/' ) + 1 );
}

/**
 * Ensure WordPress ajax settings are initialized correctly.
 * Useful when the script runs inside an iframe (like Gutenberg editor-canvas).
 */
const ensureWpAjaxSettings = () => {
	if ( typeof window === 'undefined' ) {
		return;
	}
	const wpAjax = window.wp?.ajax;
	if ( ! wpAjax ) {
		return;
	}
	if ( ! wpAjax.settings || ! wpAjax.settings.url ) {
		const parentAjax = window.parent?.wp?.ajax;
		if ( parentAjax?.settings?.url ) {
			wpAjax.settings = { ...wpAjax.settings, ...parentAjax.settings };
		} else if ( window.parent?._wpUtilSettings ) {
			wpAjax.settings = { ...wpAjax.settings, url: window.parent._wpUtilSettings.ajaxurl };
		} else if ( window.parent?.ajaxurl ) {
			wpAjax.settings = { ...wpAjax.settings, url: window.parent.ajaxurl };
		}
	}
	if ( ! window.ajaxurl && window.parent?.ajaxurl ) {
		window.ajaxurl = window.parent.ajaxurl;
	}
};

/**
 * @param {?Object}  item                Active MediaItem (or null).
 * @param {Object}   [handlers]          Callbacks the destructive actions delegate to.
 * @param {Function} [handlers.onUpdate] Receives ( patch, id ) to patch a MediaItem
 *                                       (used for the image-editor geometry merge-back).
 * @param {Function} [handlers.onDelete] Receives ( id ) after a permanent delete succeeds.
 * @return {Object} Derived meta strings + the copy/edit/delete handlers.
 */
export default function useAttachmentDetails( item, { onUpdate, onDelete } = {} ) {
	const [ copied, setCopied ] = useState( false );
	const [ attachmentData, setAttachmentData ] = useState( null );
	// Holds the currently-open EditAttachments frame (a fresh one is built per open).
	// `busyRef` guards the async window between the click and the frame being ready.
	const frameRef = useRef( null );
	const busyRef = useRef( false );

	// Tear down any open editor frame when the consumer unmounts. frame.remove()
	// disposes its child views (including the modal), so a single call is enough.
	useEffect( () => {
		return () => {
			if ( frameRef.current ) {
				frameRef.current.remove();
				frameRef.current = null;
			}
		};
	}, [] );

	useEffect( () => {
		setAttachmentData( null );
		if ( ! item?.id || item.provider !== 'media_library' ) {
			return undefined;
		}
		ensureWpAjaxSettings();
		const wpMedia = typeof window !== 'undefined' ? window.wp?.media : null;
		if ( ! wpMedia || typeof wpMedia.attachment !== 'function' ) {
			return undefined;
		}
		const attachment = wpMedia.attachment( item.id );
		if ( ! attachment ) {
			return undefined;
		}
		if ( attachment.get( 'dateFormatted' ) ) {
			setAttachmentData( attachment.toJSON() );
			return undefined;
		}
		// Guard against out-of-order fetch resolutions: when the user clicks through
		// items quickly, a stale fetch must not overwrite the newer item's panel.
		let ignore = false;
		attachment.fetch().done( () => {
			if ( ! ignore ) {
				setAttachmentData( attachment.toJSON() );
			}
		} );
		return () => {
			ignore = true;
		};
	}, [ item?.id ] );

	// Read once per render rather than cached in state: it never changes within a
	// single page load, and every consumer already re-renders on its own triggers.
	const localize = window.shaped_gallery_data || window.shaped_gallery_admin || {};
	// Undefined (payload failed to print) defaults OPEN rather than hidden — the
	// render-side gate (GalleryOptions::custom_url_active()) is what actually
	// enforces the module being off, so a missing flag here can only ever show a
	// control that render-time silently ignores, never the reverse.
	const imageCustomUrlEnabled = localize.imageCustomUrlEnabled ?? true;

	const fileUrl = item ? item.full || item.url || '' : '';
	const displayTitle = item ? item.title || attachmentData?.title || fileNameFromUrl( fileUrl ) : '';
	const uploadDate = attachmentData?.dateFormatted || '';
	const fileSize = attachmentData?.filesizeHumanReadable || '';
	const originalFileName = attachmentData?.filename || fileNameFromUrl( fileUrl );
	const isLocalMedia = item?.provider === 'media_library';
	const isLocalImage = isLocalMedia && item?.type === 'image';

	let displayDimensions = '';
	if ( item?.width && item?.height ) {
		displayDimensions = sprintf(
			/* translators: 1: width in pixels, 2: height in pixels. */
			__( '%1$d by %2$d pixels', 'easy-lightbox-wp' ),
			item.width,
			item.height
		);
	} else if ( attachmentData?.width && attachmentData?.height ) {
		displayDimensions = sprintf(
			/* translators: 1: width in pixels, 2: height in pixels. */
			__( '%1$d by %2$d pixels', 'easy-lightbox-wp' ),
			attachmentData.width,
			attachmentData.height
		);
	}

	const copyUrl = () => {
		if ( fileUrl && window.navigator?.clipboard ) {
			window.navigator.clipboard.writeText( fileUrl ).then( () => {
				setCopied( true );
				window.setTimeout( () => setCopied( false ), 2000 );
			} );
		}
	};

	const editImage = () => {
		ensureWpAjaxSettings();
		const wpMedia = typeof window !== 'undefined' ? window.wp?.media : null;
		if ( ! wpMedia || ! item?.id || typeof wpMedia.attachment !== 'function' ) {
			return;
		}

		// Ignore repeat clicks while a frame is being built or is already open, so
		// two fast clicks can't leave an orphaned second editor frame behind.
		if ( busyRef.current || frameRef.current ) {
			return;
		}
		busyRef.current = true;

		// Bind the merge-back to the attachment we open, so a later item switch can
		// never misdirect the patch onto the wrong MediaItem.
		const targetId = item.id;

		// The Edit Image frame (EditAttachments) ships in core's `media-grid`, which
		// is no longer loaded up front. Inject it on demand, then build the frame; a
		// failed load resets the busy flag so the next click can retry.
		ensureMediaGrid().then( ( ready ) => {
			const attachment = ready ? wpMedia.attachment( targetId ) : null;
			if ( ! attachment ) {
				busyRef.current = false;
				return;
			}

			attachment
				.fetch()
				.done( () => {
					const library = new wpMedia.model.Attachments( [ attachment ] );

					// EditAttachments expects a grid controller; we mock only the parts it
					// actually reaches for — `gridRouter` (navigation) and
					// `browserView.toolbar` (resetRoute reads the search field). This
					// shadows WP core edit-attachments.js internals; revisit if core moves them.
					const mockController = new window.Backbone.Model();
					mockController.gridRouter = new window.Backbone.Model();
					mockController.gridRouter.navigate = () => {};
					mockController.gridRouter.baseUrl = ( url ) => url;
					mockController.browserView = {
						toolbar: {
							get: () => ( { $el: { val: () => '' } } ),
						},
					};

					const frame = new wpMedia.view.MediaFrame.EditAttachments( {
						controller: mockController,
						library,
						model: attachment,
					} );

					// The editor's Cancel/Save returns to the metadata screen; intercept
					// that transition and close the frame instead.
					if ( frame.content ) {
						const originalMode = frame.content.mode;
						frame.content.mode = function ( newMode ) {
							if ( 'edit-metadata' === newMode ) {
								frame.close();
								return undefined;
							}
							return originalMode.apply( this, arguments );
						};
						frame.content.mode( 'edit-image' );
					}

					frame.on( 'close', () => {
						// Merge back ONLY the fields the image editor can change (geometry +
						// regenerated URLs), scoped to the attachment we opened. Never the
						// whole normalized object — that would wipe the user's
						// alt/title/caption/description/Custom URL.
						frame.model.fetch().done( () => {
							const data = normalizeAttachment( frame.model.toJSON() );
							if ( typeof onUpdate === 'function' ) {
								onUpdate(
									{
										url: data.url,
										thumb: data.thumb,
										full: data.full,
										width: data.width,
										height: data.height,
									},
									targetId
								);
							}
							setAttachmentData( frame.model.toJSON() );
						} );
						frame.remove();
						frameRef.current = null;
					} );

					frameRef.current = frame;
					busyRef.current = false;
				} )
				.fail( () => {
					busyRef.current = false;
				} );
		} );
	};

	const deleteImage = () => {
		ensureWpAjaxSettings();
		const wpMedia = typeof window !== 'undefined' ? window.wp?.media : null;
		if ( ! wpMedia || ! item?.id || typeof wpMedia.attachment !== 'function' ) {
			return;
		}

		// Name the item so the user knows exactly what they are about to delete.
		const name = displayTitle || __( 'this item', 'easy-lightbox-wp' );

		// Two complete, independently-translatable sentences joined by display-only
		// newlines (the \n stays OUT of the translated strings per @wordpress/i18n).
		// The copy names the file and spells out the blast radius — deletion hits
		// every gallery that uses it, not just this one.
		const confirmMessage =
			sprintf(
				/* translators: %s: title or file name of the attachment being deleted. */
				__( 'Permanently delete “%s”?', 'easy-lightbox-wp' ),
				name
			) +
			'\n\n' +
			__(
				'This removes the file from your Media Library and from every gallery that uses it. This action cannot be undone.',
				'easy-lightbox-wp'
			);

		// eslint-disable-next-line no-alert
		if ( ! window.confirm( confirmMessage ) ) {
			return;
		}

		// Capture the id now so a late-resolving destroy patches the item it was
		// fired for, even if the active detail has since changed.
		const targetId = item.id;
		const attachment = wpMedia.attachment( targetId );
		if ( ! attachment ) {
			return;
		}
		// wait:true holds removal until the server confirms the delete. On success we
		// tell the caller to drop the item from the gallery so no broken placeholder
		// is left behind.
		attachment
			.fetch()
			.done( () => {
				attachment.destroy( {
					wait: true,
					success: () => {
						if ( typeof onDelete === 'function' ) {
							onDelete( targetId );
						}
					},
					error: () => {
						// eslint-disable-next-line no-alert
						window.alert(
							sprintf(
								/* translators: %s: title or file name of the attachment. */
								__(
									'Could not delete “%s”. You may not have permission, or the file may be in use. Please try again.',
									'easy-lightbox-wp'
								),
								name
							)
						);
					},
				} );
			} )
			.fail( () => {
				// eslint-disable-next-line no-alert
				window.alert(
					sprintf(
						/* translators: %s: title or file name of the attachment. */
						__(
							'Could not load “%s” to delete it — it may have already been removed. Refresh and try again.',
							'easy-lightbox-wp'
						),
						name
					)
				);
			} );
	};

	return {
		attachmentData,
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
	};
}

/**
 * The attachment ⇄ MediaItem seam: mapping a wp.media model into the plugin's
 * MediaItem contract, and fetching that model when all we hold is an attachment
 * id (the native image block's Replace / Crop leave a tile in exactly that state
 * — see app/blocks/gallery/image-blocks.js).
 */

/**
 * Normalize a wp.media attachment model into the plugin's MediaItem contract
 * (the same shape MediaLibraryProvider::map_attachment produces in PHP).
 *
 * @param {Object} a wp.media attachment (toJSON()).
 * @return {Object} MediaItem.
 */
export function normalizeAttachment( a ) {
	const sizes = a.sizes || {};
	const medium = sizes.medium || sizes.large || sizes.full || {};
	const full = sizes.full || sizes.large || {};
	const isVideo = a.type === 'video';

	// A video carries no image sizes of its own, so core fills `image`/`thumb` from
	// its FEATURED IMAGE — and when it hasn't got one, from the generic mime-type
	// icon, which is byte-for-byte the URL core also puts in `icon` (see
	// wp_prepare_attachment_for_js()). That equality is the ONLY way to tell a real
	// poster from the placeholder; `a.image.src` on its own is always truthy.
	const poster = isVideo && a.image?.src && a.image.src !== a.icon ? a.image.src : '';

	// Poster-less video: `url`/`thumb` stay the FILE, never the mime icon.
	// map_attachment() already falls back that way, and both the editor preview and
	// MediaThumb feed a poster-less video's `url` to a `<video src>` to paint its
	// first frame — exactly as LayoutRenderer::render_item() does. An SVG icon in
	// that slot decodes as nothing and the tile renders empty. A freshly uploaded
	// video is what hit this: the upload path normalizes the wp.media model here
	// instead of re-reading the item back through /media, where PHP gets it right.
	const display = isVideo ? poster || a.url || '' : medium.url || a.url;

	return {
		id: a.id,
		type: isVideo ? 'video' : 'image',
		url: display,
		thumb: display,
		full: isVideo ? a.url : full.url || a.url,
		poster,
		// Mirror map_attachment(): a poster sizes the tile when there is one, and the
		// video's own intrinsic dimensions (WP reads them off the file on upload) when
		// there isn't — so the measured layouts get a real aspect ratio either way.
		width: ( isVideo && poster ? a.image?.width : full.width || a.width ) || 0,
		height: ( isVideo && poster ? a.image?.height : full.height || a.height ) || 0,
		alt: a.alt || '',
		title: a.title || '',
		caption: a.caption || '',
		description: a.description || '',
		link: '',
		provider: 'media_library',
	};
}

/**
 * Normalize a list of attachments.
 *
 * @param {Array} list wp.media attachments.
 * @return {Array} MediaItem[].
 */
export function normalizeAll( list ) {
	return ( list || [] ).map( normalizeAttachment );
}

/**
 * Resolve attachment ids to MediaItems through `wp.media`, the same Backbone
 * collection the media modal and the details panel already read (see
 * useAttachmentDetails / useMediaLibrary) — so a model the modal has already
 * fetched costs nothing, a fetch populates the collection everything else
 * subscribes to, and the id is asked for over the same `upload_files`-gated
 * surface as the rest of the media UI.
 *
 * Never rejects: a missing attachment, a failed request or a page without
 * `wp.media` all resolve to "not found" for that id, because the caller's job is
 * to top a tile up when it can, not to fail the edit when it cannot.
 *
 * @param {Array<number>} ids Attachment ids.
 * @return {Promise<Object>} Resolves to a map of id → MediaItem (missing ids absent).
 */
export function fetchMediaItems( ids ) {
	const wpMedia = typeof window !== 'undefined' ? window.wp?.media : null;
	if ( ! wpMedia || typeof wpMedia.attachment !== 'function' || ! ids?.length ) {
		return Promise.resolve( {} );
	}

	return Promise.all(
		ids.map( ( id ) => {
			const attachment = wpMedia.attachment( id );
			if ( ! attachment ) {
				return Promise.resolve( null );
			}
			// `url` is the field a bare `wp.media.attachment( id )` placeholder lacks,
			// and the one normalizeAttachment cannot do without.
			if ( attachment.get( 'url' ) ) {
				return Promise.resolve( attachment );
			}
			return new Promise( ( resolve ) => {
				attachment
					.fetch()
					.done( () => resolve( attachment ) )
					.fail( () => resolve( null ) );
			} );
		} )
	).then( ( models ) => {
		const byId = {};
		models.forEach( ( model ) => {
			if ( ! model ) {
				return;
			}
			const item = normalizeAttachment( model.toJSON() );
			if ( item.id ) {
				byId[ item.id ] = item;
			}
		} );
		return byId;
	} );
}

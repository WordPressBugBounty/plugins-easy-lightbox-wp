/**
 * Which URL the editor canvas should draw for an item — pure, no store, no React.
 *
 * A stored MediaItem carries `url` and `thumb`, and for an attachment picked in the
 * media modal both are WordPress's `medium` rendition (~300px): the modal's
 * `normalizeAttachment()` sets them that way, and nothing re-resolves them. The
 * frontend never sees that, because the renderer re-fetches every attachment by id
 * at the gallery's Image Resolution (`LayoutRenderer::provider_items()`). The canvas
 * has no such round trip, so drawing the stored URL put a 300px file in a tile
 * ~500px wide — soft on every screen and visibly worse on a HiDPI one.
 *
 * The editor therefore asks core-data for the attachment's own size list and picks
 * the rendition the gallery is configured to deliver (see `useImageSources`).
 */

/**
 * The URL of one registered size from a REST attachment record.
 *
 * Mirrors `wp_get_attachment_image_src( $id, $size )` as the provider uses it: the
 * named size when the image has one, otherwise the original — WordPress only
 * generates a size an upload is large enough to need, so a small image has no
 * `large` and the original IS the right answer there.
 *
 * @param {?Object} media REST `/wp/v2/media` record (`source_url`, `media_details.sizes`).
 * @param {string}  size  Registered size name (thumbnail|medium|large|full).
 * @return {string} URL, or '' when the record carries none.
 */
export function sizeUrl( media, size ) {
	if ( ! media ) {
		return '';
	}
	const sizes = media.media_details?.sizes || {};
	if ( 'full' !== size && sizes[ size ]?.source_url ) {
		return sizes[ size ].source_url;
	}
	return sizes.full?.source_url || media.source_url || '';
}

/**
 * The URL a gallery tile's <img> should use in the canvas.
 *
 * Order of preference, matching what the frontend draws:
 *   1. a video's own poster (the renderer uses it as `src` whole);
 *   2. the attachment's rendition at the gallery's Image Resolution, once core-data
 *      has delivered it;
 *   3. the stored thumbnail, so the tile is never empty while that request is out
 *      or for a source with no attachment behind it (External Images).
 *
 * @param {Object} item    MediaItem.
 * @param {Object} sources Map of attachment id => resolved URL.
 * @return {string} Image URL.
 */
export function editorImageSrc( item, sources ) {
	if ( 'video' === item.type && item.poster ) {
		return item.poster;
	}
	const resolved = 'number' === typeof item.id ? sources?.[ item.id ] : '';
	return resolved || item.thumb || item.url || item.full || '';
}

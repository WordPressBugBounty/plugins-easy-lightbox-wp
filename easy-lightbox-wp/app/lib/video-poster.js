/**
 * First-frame source for a poster-less video.
 *
 * A `<video preload="metadata">` with no `poster` is not guaranteed to paint
 * anything: metadata is enough to size the element, not to decode a frame, so the
 * tile can sit there as an empty black box. A `#t=` media fragment makes the browser
 * seek to that time and paint the frame it lands on, which is what gives the tile a
 * still. 0.1s rather than 0 dodges the all-black opening frame most encoders emit.
 *
 * §18: the three surfaces that draw a poster-less video — the editor preview, the
 * media manager's thumbnails, and `LayoutRenderer::first_frame_src()` on the front
 * end — all go through this one rule, so they show the SAME frame.
 */

/** @type {string} The seek offset appended to a poster-less video source. */
export const FIRST_FRAME_FRAGMENT = '#t=0.1';

/**
 * Providers whose `url`/`full` is an iframe player PAGE rather than a media file.
 * The mirror of `LayoutRenderer::EMBED_PROVIDERS` — keep the two in sync.
 *
 * @type {string[]}
 */
export const EMBED_PROVIDERS = [ 'youtube' ];

/**
 * Whether a MediaItem is drawn as a frame of the video file itself rather than as
 * an `<img>`: a video, with no poster, that is a real file.
 *
 * Mirrors the `$is_video && ! $has_poster && $playable` branch of
 * `LayoutRenderer::render_item()` (§18) — an embed must never take this path, since
 * its source is HTML and paints nothing in a `<video>`.
 *
 * @param {Object} item MediaItem.
 * @return {boolean} Whether the item draws its own first frame.
 */
export function showsFirstFrame( item ) {
	return !! item && 'video' === item.type && ! item.poster && ! EMBED_PROVIDERS.includes( item.provider );
}

/**
 * @param {string} src Video file URL.
 * @return {string} The URL with a seek fragment appended, unchanged when it already carries one.
 */
export function firstFrameSrc( src ) {
	if ( ! src || src.includes( '#' ) ) {
		return src || '';
	}

	return `${ src }${ FIRST_FRAME_FRAGMENT }`;
}

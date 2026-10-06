/**
 * Provider embed players — the single source of iframe knowledge, shared by the
 * lightbox (app/frontend/shaped-layout.js) and inline tile playback
 * (app/frontend/media.js).
 *
 * A provider embed's `full` URL is an iframe player, not a media file, so it can
 * never be a `<video src>`. Keeping the per-provider config here (rather than in
 * either consumer) means adding another embed source is a one-line data change and
 * the two playback surfaces can't drift apart.
 */

/** Landscape (16:9) lightbox frame. */
const LANDSCAPE_FRAME = 'width:min(90vw, calc(85vh * 16 / 9));aspect-ratio:16/9';

/**
 * Per-provider embed config:
 *
 * - `params`   — query appended to `item.full` on every open. Privacy-lean where the
 *                platform allows (youtube uses the nocookie host).
 * - `autoplay` — the provider's own autoplay parameter, appended only when autoplay
 *                is wanted (the gallery's AutoPlay setting in the lightbox; always,
 *                for an inline tile, since the click IS the intent to play).
 * - `frame`    — inline style sizing the LIGHTBOX iframe. It is width-driven with
 *                `aspect-ratio` deriving the height: the lightbox
 *                stage is a flex row, and a flex item's main size (width) is
 *                resolved BEFORE its cross size, so a height-driven frame would let
 *                the iframe fall back to its 300px intrinsic replaced-element width
 *                and the ratio would be ignored. Capping the width by viewport
 *                HEIGHT keeps the player inside the overlay on any viewport without
 *                a `max-height` that would re-break the ratio.
 *
 * @type {Object<string,{params:string,autoplay:string,frame:string}>}
 */
export const EMBED_PARAMS = {
	youtube: { params: 'rel=0', autoplay: 'autoplay=1', frame: LANDSCAPE_FRAME },
};

/**
 * Whether a provider's media plays through an iframe embed rather than a file.
 *
 * @param {string} provider Provider id.
 * @return {boolean} True for an embed provider.
 */
export function isEmbedProvider( provider ) {
	return Object.prototype.hasOwnProperty.call( EMBED_PARAMS, provider );
}

/**
 * Build a provider embed URL.
 *
 * `full` may already carry a query, so the separator
 * is picked accordingly; a provider with no base params and autoplay off adds no
 * query at all.
 *
 * @param {string}  full     The provider embed URL (`item.full`).
 * @param {string}  provider Provider id.
 * @param {boolean} autoplay Append the provider's autoplay parameter.
 * @return {string} Player URL.
 */
export function embedUrl( full, provider, autoplay ) {
	const embed = EMBED_PARAMS[ provider ];
	if ( ! embed ) {
		return full;
	}
	const query = [ embed.params, autoplay ? embed.autoplay : '' ].filter( Boolean ).join( '&' );
	if ( ! query ) {
		return full;
	}
	return `${ full }${ full.includes( '?' ) ? '&' : '?' }${ query }`;
}

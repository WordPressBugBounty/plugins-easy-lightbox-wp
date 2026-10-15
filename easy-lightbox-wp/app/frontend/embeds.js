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
 * - `hosts`    — the exact hosts the player may load from. `item.full` comes from a
 *                block attribute an author can write, so it is held to these before
 *                it becomes an `<iframe src>` (see safeEmbedUrl()). Mirrors
 *                `EmbedUrl::HOSTS` (src/Render/EmbedUrl.php); both are pinned to one
 *                case table by `embeds.test.js` and `verify-embed-url.php`.
 * - `frame`    — inline style sizing the LIGHTBOX iframe. It is width-driven with
 *                `aspect-ratio` deriving the height: the lightbox
 *                stage is a flex row, and a flex item's main size (width) is
 *                resolved BEFORE its cross size, so a height-driven frame would let
 *                the iframe fall back to its 300px intrinsic replaced-element width
 *                and the ratio would be ignored. Capping the width by viewport
 *                HEIGHT keeps the player inside the overlay on any viewport without
 *                a `max-height` that would re-break the ratio.
 *
 * @type {Object<string,{params:string,autoplay:string,hosts:string[],frame:string}>}
 */
export const EMBED_PARAMS = {
	youtube: {
		params: 'rel=0',
		autoplay: 'autoplay=1',
		hosts: [ 'www.youtube-nocookie.com', 'youtube-nocookie.com', 'www.youtube.com', 'youtube.com' ],
		frame: LANDSCAPE_FRAME,
	},
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
 * The URL when it is a safe player for the provider, else an empty string.
 *
 * Safe means `https`, a host on the provider's own list, and no credentials, port,
 * whitespace, control character or backslash. The URL is parsed with `new URL()` —
 * the same parser the browser will use for the `src`, so
 * `https://evil.test\@www.youtube.com/` resolves to the host the browser would
 * actually load (`evil.test`) and is refused. The PHP twin, `EmbedUrl::sanitize()`,
 * filters at render; this is the second gate for any URL that reaches the runtime
 * another way.
 *
 * @param {string} full     The provider embed URL (`item.full`).
 * @param {string} provider Provider id.
 * @return {string} The parsed URL, or '' when it must not be framed.
 */
export function safeEmbedUrl( full, provider ) {
	const embed = EMBED_PARAMS[ provider ];
	if ( ! embed || 'string' !== typeof full ) {
		return '';
	}

	// Whitespace, control characters and backslashes are refused outright, as in
	// PHP: `new URL()` would quietly percent-encode a space and accept the rest.
	const candidate = full.trim();
	// eslint-disable-next-line no-control-regex -- control characters are exactly what is being refused.
	if ( /[\u0000-\u0020\u007f\\]/.test( candidate ) ) {
		return '';
	}

	let parsed;
	try {
		parsed = new URL( candidate );
	} catch ( error ) {
		return '';
	}

	const ok =
		'https:' === parsed.protocol &&
		embed.hosts.includes( parsed.hostname ) &&
		'' === parsed.username &&
		'' === parsed.password &&
		'' === parsed.port;

	return ok ? parsed.href : '';
}

/**
 * Build a provider embed URL.
 *
 * `full` may already carry a query, so the separator
 * is picked accordingly; a provider with no base params and autoplay off adds no
 * query at all.
 *
 * An unsafe `full` (see safeEmbedUrl()) yields '' — callers must treat that as
 * "nothing to frame" rather than set it as a `src`.
 *
 * @param {string}  full     The provider embed URL (`item.full`).
 * @param {string}  provider Provider id.
 * @param {boolean} autoplay Append the provider's autoplay parameter.
 * @return {string} Player URL, or '' when `full` is not a safe embed for the provider.
 */
export function embedUrl( full, provider, autoplay ) {
	const embed = EMBED_PARAMS[ provider ];
	if ( ! embed ) {
		return full;
	}
	const safe = safeEmbedUrl( full, provider );
	if ( ! safe ) {
		return '';
	}
	const query = [ embed.params, autoplay ? embed.autoplay : '' ].filter( Boolean ).join( '&' );
	if ( ! query ) {
		return safe;
	}
	return `${ safe }${ safe.includes( '?' ) ? '&' : '?' }${ query }`;
}

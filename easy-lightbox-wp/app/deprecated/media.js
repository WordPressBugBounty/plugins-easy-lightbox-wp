/**
 * Easy Lightbox URL resolution — what a legacy trigger's `href` means.
 *
 * DEPRECATED BY DESIGN. Everything under `app/deprecated/` exists to keep sites
 * that ran Easy Lightbox 1.x working after 1.2.0 replaced it (CLAUDE.md §25), and
 * is meant to be deleted in a future major. Nothing outside this folder may import
 * it, and it imports nothing of its own.
 *
 * ## What this reproduces
 *
 * Easy Lightbox bundled LiteBox v1.2 (Joe Mottershaw, MIT). Its `populateLitebox()`
 * decided what a link meant in a fixed order, and that order is the compatibility
 * contract — not the markup it produced, which this plugin's own viewer replaces:
 *
 * 1. no `href`                                   → error
 * 2. the href looks like an image file           → `<img>`
 * 3. youtube / youtu.be / vimeo / dailymotion /
 *    kickstarter                                 → provider `<iframe>`
 * 4. the href starts with `#`                    → clone of that element, inline
 * 5. anything else                               → generic `<iframe src=href>`
 *
 * The order matters as much as the branches: an image URL on a provider host is an
 * image, and `#gallery-1` is inline content rather than a relative page.
 *
 * ## Where this deliberately differs from LiteBox, and why
 *
 * The original is preserved in `wp-content/repos/easy-lightbox-wp` — read
 * `js/litebox.min.js` before changing anything here. Four differences are
 * deliberate, and every one of them is a case the original got WRONG, so
 * reproducing it faithfully would mean shipping a known defect on purpose:
 *
 * - **YouTube `embed/ID` and `shorts/ID`.** LiteBox's single mega-regex captured
 *   the video id only from `watch?v=`, so every other YouTube URL shape built
 *   `https://www.youtube.com/embed/undefined?autoplay=1` and framed a 404.
 * - **Vimeo `vimeo.com/video/ID`.** Same regex, same shape of bug: the captured
 *   group kept the `video/` prefix and the player URL doubled it.
 * - **A provider URL whose id cannot be read** produced no content and no error —
 *   an empty overlay, which on a small screen had no visible way out. That is the
 *   defect Easy Lightbox 1.1.4 shipped a fix for. Here it cannot arise: each
 *   pattern below requires the ids its player URL interpolates, so such a URL is
 *   simply not a provider match and is framed like any other page.
 * - **The `youtube-nocookie.com` host**, matching what the gallery block's own
 *   YouTube items already use (`app/frontend/embeds.js`). Same player, no cookie
 *   until the visitor presses play.
 *
 * `webp`, `avif` and `svg` are also treated as images, which LiteBox did not
 * recognise — it framed them instead. Both show the picture; one of them can be
 * paged through and zoomed.
 *
 * Pure: a string in, a descriptor out, no DOM and no `window`. That is what makes
 * the contract above testable (`tests/js/unit/deprecated-media.test.js`) rather
 * than merely asserted.
 */

/**
 * Image file extensions, tested against the path only so a query string or a
 * fragment cannot hide one — and cannot invent one either.
 *
 * LiteBox tested `\.(jpeg|jpg|gif|png|bmp)` anywhere in the URL, which also matched
 * a path segment like `/a.png/b`. Anchoring to the end of the path is the same
 * answer for every real link and a narrower one for a crafted URL.
 *
 * @type {RegExp}
 */
const IMAGE_PATTERN = /\.(jpe?g|gif|png|bmp|webp|avif|svg)$/i;

/**
 * The providers LiteBox framed, each with the id it needs and the player URL it
 * builds. A data map rather than a chain of `if`s: adding or removing a provider
 * is one entry, and the order below IS the matching order.
 *
 * `autoplay` reproduces LiteBox's `?autoplay=1`, which it appended for every
 * provider except Kickstarter. YouTube is the exception in the other direction —
 * it carries no query here, because `EMBED_PARAMS.youtube` in
 * `app/frontend/embeds.js` owns the parameters for every YouTube frame this
 * plugin opens, this one included.
 *
 * @type {Array<{id: string, pattern: RegExp, url: Function, embed: boolean}>}
 */
const PROVIDERS = [
	{
		id: 'youtube',
		pattern: /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{6,})/i,
		url: ( id ) => `https://www.youtube-nocookie.com/embed/${ id }`,
		embed: true,
	},
	{
		id: 'vimeo',
		pattern: /vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/i,
		url: ( id ) => `https://player.vimeo.com/video/${ id }?autoplay=1`,
		embed: false,
	},
	{
		id: 'dailymotion',
		pattern: /(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-z0-9]+)/i,
		url: ( id ) => `https://www.dailymotion.com/embed/video/${ id }?autoplay=1`,
		embed: false,
	},
	{
		id: 'kickstarter',
		pattern: /kickstarter\.com\/projects\/([\w-]+)\/([\w-]+)/i,
		url: ( creator, project ) =>
			`https://www.kickstarter.com/projects/${ creator }/${ project }/widget/video.html`,
		embed: false,
	},
];

/**
 * The path part of a URL, without its query or fragment.
 *
 * String work rather than `new URL()`: an `href` here can be relative, scheme-less
 * or outright malformed, and `new URL()` throws on all three. A resolver that
 * throws on a bad link would take the whole click handler with it.
 *
 * @param {string} href Raw href.
 * @return {string} Path portion.
 */
function pathOf( href ) {
	return String( href ).split( '#' )[ 0 ].split( '?' )[ 0 ];
}

/**
 * Resolve a legacy trigger's href to a slide descriptor.
 *
 * The descriptor is the same shape `app/frontend/lightbox/slides.js` builds for a
 * gallery tile, so the viewer cannot tell the two apart — which is the whole point:
 * one viewer, one overlay, one set of keyboard and gesture behaviour, whichever
 * era of markup opened it.
 *
 * @param {string} href Raw href.
 * @return {?Object} Slide descriptor, or `null` when there is nothing to show.
 */
export function resolveLegacyMedia( href ) {
	const raw = String( href || '' ).trim();

	// 1. LiteBox: `if ( ! i ) return void o.liteboxError()`. An anchor with no href
	// is the one case that is an error rather than a guess.
	if ( '' === raw ) {
		return null;
	}

	// 2. An image file, judged by its path.
	if ( IMAGE_PATTERN.test( pathOf( raw ) ) ) {
		return { type: 'image', provider: '', full: raw };
	}

	// 3. A provider the original framed. Each pattern REQUIRES the ids its player
	// URL interpolates, so a half-match is not a match — which is what makes the
	// original's `.../embed/undefined` unreachable here rather than guarded
	// against. A provider host with no id falls through to the generic frame
	// below, exactly as it did before.
	for ( const provider of PROVIDERS ) {
		const match = provider.pattern.exec( raw );

		if ( ! match ) {
			continue;
		}

		return {
			type: provider.embed ? 'embed' : 'frame',
			// Only an `embed` carries a provider id: that field is what makes
			// `EMBED_PARAMS` apply, and the others own their query already.
			provider: provider.embed ? provider.id : '',
			full: provider.url( ...match.slice( 1 ) ),
		};
	}

	// 4. Inline content: a selector into this page, not a URL.
	if ( raw.startsWith( '#' ) ) {
		return { type: 'inline', provider: '', full: raw };
	}

	// 5. Everything else is framed, exactly as the original did.
	return { type: 'frame', provider: '', full: raw };
}

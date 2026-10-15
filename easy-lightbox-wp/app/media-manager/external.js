/**
 * Helpers for the "External Images" / "External Video" sources — staging media
 * URLs the user pastes in, with no Media Library attachment behind them.
 *
 * Validation is split: `isValidUrl` is a pure, unit-testable syntactic check;
 * `loadImage` / `loadVideo` are the DOM-bound runtime probes that confirm the
 * URL really resolves to a decodable image/video (and yield its intrinsic
 * geometry). Keeping the pure part separate mirrors `selection.js` and keeps the
 * component thin.
 */

/**
 * Whether a string is a syntactically valid http(s) URL.
 *
 * @param {string} value Candidate URL.
 * @return {boolean} True for a well-formed http/https URL.
 */
export function isValidUrl(value) {
	if (typeof value !== "string" || "" === value.trim()) {
		return false;
	}
	try {
		const url = new URL(value.trim());
		return "http:" === url.protocol || "https:" === url.protocol;
	} catch (e) {
		return false;
	}
}

/**
 * Host of a media URL for display ("images.pexels.com"), minus a leading `www.`.
 * Names where the file lives without claiming to know the brand behind it.
 *
 * @param {string} url Media URL.
 * @return {string} Hostname, or '' when the URL cannot be parsed.
 */
export function externalHost(url) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch (e) {
		return "";
	}
}

/**
 * Build a normalized external MediaItem. The URL doubles as the id so dedup and
 * React keys are stable and duplicate URLs collapse to one entry.
 *
 * @param {string} url           Media URL (assumed validated).
 * @param {Object} [meta]        Intrinsic size + media type.
 * @param {number} [meta.width]  Natural width.
 * @param {number} [meta.height] Natural height.
 * @param {string} [meta.type]   'image' (default) or 'video'.
 * @return {Object} MediaItem.
 */
export function makeExternalItem(url, { width = 0, height = 0, type = "image" } = {}) {
	const clean = url.trim();
	return {
		id: clean,
		type: "video" === type ? "video" : "image",
		url: clean,
		thumb: clean,
		full: clean,
		poster: "",
		width,
		height,
		alt: "",
		title: "",
		caption: "",
		description: "",
		link: "",
		provider: "external",
	};
}

/**
 * How long a direct-media probe (`loadImage` / `loadVideo`) may take before it is
 * abandoned. Without a ceiling a server that accepts the connection but never
 * answers — or a browser that defers media loading — leaves the pane on "Adding…"
 * forever, because neither `load` nor `error` ever fires.
 *
 * @type {number}
 */
export const PROBE_TIMEOUT_MS = 10000;

/**
 * How long a provider oEmbed request may take before it is abandoned.
 *
 * @type {number}
 */
export const FETCH_TIMEOUT_MS = 10000;

/**
 * Ceiling for best-effort enrichment (YouTube orientation). The item is already
 * usable without it, so a slow answer must not hold the user up for long.
 *
 * @type {number}
 */
export const ENRICH_TIMEOUT_MS = 4000;

/**
 * HTTP statuses that mean "the provider answered, but not for this video" —
 * private, deleted, embedding disabled, or a malformed id.
 *
 * @type {number[]}
 */
const UNAVAILABLE_STATUSES = [ 400, 401, 403, 404 ];

/**
 * Load a URL as an image to confirm it decodes, resolving with its intrinsic
 * dimensions. Rejects if the resource fails to load (404, not an image, blocked),
 * or with `Error('timeout')` when nothing settles within `PROBE_TIMEOUT_MS`.
 *
 * @param {string} url Image URL.
 * @return {Promise<{width:number,height:number}>} Intrinsic size on success.
 */
export function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new window.Image();
		const timer = window.setTimeout(() => {
			// Drop the request so a late response cannot hold the connection open.
			img.onload = null;
			img.onerror = null;
			img.src = "";
			reject(new Error("timeout"));
		}, PROBE_TIMEOUT_MS);
		img.onload = () => {
			window.clearTimeout(timer);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			window.clearTimeout(timer);
			reject(new Error("image-load-failed"));
		};
		img.src = url;
	});
}

/**
 * Load a URL as a video (metadata only) to confirm it is a playable video,
 * resolving with its intrinsic dimensions. Rejects on load failure, or with
 * `Error('timeout')` when no metadata or error arrives within `PROBE_TIMEOUT_MS`.
 *
 * @param {string} url Video URL.
 * @return {Promise<{width:number,height:number}>} Intrinsic size on success.
 */
export function loadVideo(url) {
	return new Promise((resolve, reject) => {
		const video = window.document.createElement("video");
		video.preload = "metadata";
		video.muted = true;
		const timer = window.setTimeout(() => {
			video.onloadedmetadata = null;
			video.onerror = null;
			// Detach the source and reload so the pending request is cancelled.
			video.removeAttribute("src");
			video.load();
			reject(new Error("timeout"));
		}, PROBE_TIMEOUT_MS);
		video.onloadedmetadata = () => {
			window.clearTimeout(timer);
			resolve({ width: video.videoWidth, height: video.videoHeight });
		};
		video.onerror = () => {
			window.clearTimeout(timer);
			reject(new Error("video-load-failed"));
		};
		video.src = url;
	});
}

/**
 * GET a provider's oEmbed endpoint and parse its JSON, with a ceiling and a
 * classified failure so the pane can say WHY a link was refused instead of one
 * generic message.
 *
 * Rejects with `Error(code)` where `code` is:
 * - `unavailable` — the provider answered 400/401/403/404 (private, deleted,
 *   embedding disabled, unknown id);
 * - `timeout`     — nothing settled within `timeoutMs`;
 * - `network`     — the request never completed (offline, DNS, ad blocker, CORS);
 * - `failed`      — any other non-2xx status, or a body that is not JSON.
 *
 * @param {string} endpoint    Absolute oEmbed URL.
 * @param {number} [timeoutMs] Ceiling in ms (default `FETCH_TIMEOUT_MS`).
 * @return {Promise<Object>} Parsed JSON body.
 */
export function fetchJson(endpoint, timeoutMs = FETCH_TIMEOUT_MS) {
	const controller = "function" === typeof window.AbortController ? new window.AbortController() : null;
	let timedOut = false;
	const timer = window.setTimeout(() => {
		timedOut = true;
		controller?.abort();
	}, timeoutMs);

	return window
		.fetch(endpoint, controller ? { signal: controller.signal } : undefined)
		.then(
			(response) => {
				if (!response.ok) {
					throw new Error(UNAVAILABLE_STATUSES.includes(response.status) ? "unavailable" : "failed");
				}
				return response.json().catch(() => {
					throw new Error(timedOut ? "timeout" : "failed");
				});
			},
			() => {
				throw new Error(timedOut ? "timeout" : "network");
			}
		)
		.finally(() => window.clearTimeout(timer));
}

/**
 * Extract the 11-char YouTube video id from any common URL form, else null.
 *
 * Unlike External Images/Video, a YouTube URL is a page URL — not a media file —
 * so validation is synchronous URL parsing (no DOM probe). Handles watch?v=,
 * youtu.be/, /embed/, /shorts/, /live/, /v/, and extra query params.
 *
 * @param {string} url Candidate YouTube URL.
 * @return {?string} The 11-char video id, or null when not a YouTube link.
 */
export function parseYouTubeId(url) {
	if (typeof url !== "string") {
		return null;
	}
	try {
		const parsed = new URL(url.trim());
		const host = parsed.hostname.replace(/^www\./, "");
		if ("youtu.be" === host) {
			const id = parsed.pathname.slice(1).split("/")[0];
			return /^[\w-]{11}$/.test(id) ? id : null;
		}
		if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
			const v = parsed.searchParams.get("v");
			if (v && /^[\w-]{11}$/.test(v)) {
				return v;
			}
			const match = parsed.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
			if (match) {
				return match[1];
			}
		}
	} catch (e) {
		// Malformed URL — fall through to null.
	}
	return null;
}

/**
 * Build a normalized YouTube MediaItem (type:'video', provider:'youtube').
 *
 * The id is the video id (paste-form independent, so dedup collapses the same
 * video); poster/thumb is the YouTube CDN still; full is the privacy-friendly
 * embed URL the lightbox loads in an <iframe>; a 16:9 intrinsic size gives
 * justified/masonry a sane aspect ratio.
 *
 * @param {string} url YouTube URL (any common form).
 * @return {?Object} MediaItem, or null when the URL is not a valid YouTube link.
 */
export function makeYouTubeItem(url) {
	const id = parseYouTubeId(url);
	if (!id) {
		return null;
	}
	const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
	return {
		id,
		type: "video",
		url: `https://www.youtube.com/watch?v=${id}`,
		thumb,
		full: `https://www.youtube-nocookie.com/embed/${id}`,
		poster: thumb,
		width: 1280,
		height: 720,
		alt: "",
		title: "",
		caption: "",
		description: "",
		link: "",
		provider: "youtube",
	};
}

/**
 * Intrinsic size given to a portrait (9:16) YouTube video — a Short.
 *
 * @type {{width:number,height:number}}
 */
export const YOUTUBE_PORTRAIT_SIZE = { width: 720, height: 1280 };

/**
 * Whether a YouTube oEmbed body describes a portrait player.
 *
 * @param {Object} data Parsed oEmbed body.
 * @return {boolean} True when both sizes are integers and height exceeds width.
 */
export function isPortraitOEmbed(data) {
	return Boolean(
		data && Number.isInteger(data.width) && Number.isInteger(data.height) && data.height > data.width
	);
}

/**
 * Resolve a pasted YouTube URL to a MediaItem, correcting the tile ratio for Shorts.
 *
 * `makeYouTubeItem` is synchronous and assumes 16:9, which is wrong for a Short —
 * Justified/Masonry would size its tile as landscape. Nothing in the URL says which
 * it is (`watch?v=` and `/shorts/` both resolve either kind), so YouTube's oEmbed is
 * asked instead. It is queried through the `/shorts/<id>` form on purpose: for a
 * real Short that form reports a portrait player (113×200), while the canonical
 * `watch?v=` form reports 200×113 for the same video; for a normal video both
 * report landscape. The lookup is best-effort — thumbnail and embed URL are already
 * derivable — so any failure keeps the landscape default rather than rejecting.
 *
 * @param {string} url Pasted YouTube URL (any common form).
 * @return {Promise<Object>} MediaItem (rejects 'invalid' for a non-YouTube URL).
 */
export function resolveYouTubeItem(url) {
	const item = makeYouTubeItem(url);
	if (!item) {
		return Promise.reject(new Error("invalid"));
	}
	const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
		`https://www.youtube.com/shorts/${item.id}`
	)}&format=json`;

	return fetchJson(endpoint, ENRICH_TIMEOUT_MS)
		.then((data) => (isPortraitOEmbed(data) ? { ...item, ...YOUTUBE_PORTRAIT_SIZE } : item))
		.catch(() => item);
}

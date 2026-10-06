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
 * Load a URL as an image to confirm it decodes, resolving with its intrinsic
 * dimensions. Rejects if the resource fails to load (404, not an image, blocked).
 *
 * @param {string} url Image URL.
 * @return {Promise<{width:number,height:number}>} Intrinsic size on success.
 */
export function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new window.Image();
		img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
		img.onerror = () => reject(new Error("image-load-failed"));
		img.src = url;
	});
}

/**
 * Load a URL as a video (metadata only) to confirm it is a playable video,
 * resolving with its intrinsic dimensions. Rejects on load failure.
 *
 * @param {string} url Video URL.
 * @return {Promise<{width:number,height:number}>} Intrinsic size on success.
 */
export function loadVideo(url) {
	return new Promise((resolve, reject) => {
		const video = window.document.createElement("video");
		video.preload = "metadata";
		video.muted = true;
		video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
		video.onerror = () => reject(new Error("video-load-failed"));
		video.src = url;
	});
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

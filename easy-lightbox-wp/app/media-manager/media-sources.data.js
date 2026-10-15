/**
 * Media-source registry for the modal's left sidebar.
 *
 * Data, not code branches — mirrors `picker/layouts.data.js`. The sidebar, its
 * active state, and the query the grid runs are all derived from this array.
 * Every entry in a group's `items` is wired and actionable.
 *
 * A group's `proItems` are ShapedGallery Pro's extra sources (ids, labels and
 * icons are Pro's own, `shaped-gallery-pro/app/media-manager/media-sources.data.js`),
 * drawn after the real rows as locked rows that open the upgrade page instead of
 * switching source — the media-modal twin of `PRO_LAYOUTS`. They are a separate
 * list, never `items` with a flag, for the same reason: `allSources()` and
 * `getSource()` read `items` only, so the modal can never make one the active
 * source, and this build has no provider to back it (`GET /media` has no
 * `vimeo` / `tiktok` / `wistia` branch).
 *
 * Adding a real source later is one registry entry plus a provider class — and a
 * future "Connect & Import" group (Dropbox, Google Photos, …) drops in here as
 * another `{ id, label, items }` object, which the sidebar renders automatically.
 * No component or schema change is needed to ship it later.
 *
 * Item shape: `{ id, label, icon, provider, type[, kind] }`, where `icon` is a
 * key resolved to an SVG element by `SOURCE_ICONS` in the sidebar — keeping this
 * module pure data (no JSX). `provider` + `type` map to the `GET /media` query.
 * `kind: 'external'` flags a source that stages pasted URLs instead of browsing
 * the REST grid (the modal renders `ExternalImagesPane` for it).
 */
import { __ } from "@wordpress/i18n";

/**
 * The source the modal opens on.
 *
 * @type {string}
 */
export const DEFAULT_SOURCE_ID = "images";

export const MEDIA_SOURCE_GROUPS = [
	{
		id: "add-media-from",
		label: __("Add media from", "easy-lightbox-wp"),
		items: [
			{
				id: "images",
				label: __("Images", "easy-lightbox-wp"),
				icon: "images",
				provider: "media_library",
				type: "image",
			},
			{
				id: "external-images",
				label: __("External Images", "easy-lightbox-wp"),
				icon: "link",
				provider: "external",
				type: "image",
				kind: "external",
			},
			{
				id: "videos",
				label: __("Videos", "easy-lightbox-wp"),
				icon: "video",
				provider: "media_library",
				type: "video",
			},
			{
				id: "external-video",
				label: __("External Video", "easy-lightbox-wp"),
				icon: "link",
				provider: "external",
				type: "video",
				kind: "external",
			},
			{
				id: "youtube",
				label: __("YouTube", "easy-lightbox-wp"),
				icon: "youtube",
				provider: "youtube",
				type: "video",
				kind: "external",
			},
		],
		proItems: [
			{
				id: "vimeo",
				label: __("Vimeo", "easy-lightbox-wp"),
				icon: "vimeo",
				pro: true,
			},
			{
				id: "tiktok",
				label: __("TikTok", "easy-lightbox-wp"),
				icon: "tiktok",
				pro: true,
			},
			{
				id: "wistia",
				label: __("Wistia", "easy-lightbox-wp"),
				icon: "wistia",
				pro: true,
			},
		],
	},
];

/**
 * Flat list of every source item.
 *
 * @return {Array<Object>} All source items across groups.
 */
export const allSources = () => MEDIA_SOURCE_GROUPS.flatMap((group) => group.items);

/**
 * Resolve a source item by id.
 *
 * @param {string} id Source id.
 * @return {Object|undefined} The matching source item.
 */
export const getSource = (id) => allSources().find((item) => item.id === id);

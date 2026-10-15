/**
 * Layout catalog for the picker.
 *
 * The picker and its cards all render from this array (data, not code
 * branches). Adding a CSS-Grid layout later is a registry entry here + a
 * `.sp-shaped-gallery--<id>` CSS rule — no component change.
 *
 * `icon` is the layout's design thumbnail (a self-contained SVG from
 * `@shaped-gallery/icons`) shown on each picker card and in the Layout Settings
 * source row (see LayoutCard / LayoutSource).
 *
 * Two lists, never one with a flag inside it. `LAYOUTS` is what this build can
 * RENDER, and must equal `GalleryOptions::LAYOUTS` and `Functions::layouts()`
 * (§6.5) — `LayoutSource` resolves a stored layout against it and the patterns
 * library filters by the PHP twin. `PRO_LAYOUTS` is advertising only: the picker
 * and the Change Layout popover draw it after the real cards as locked cards
 * (`pro: true`) that open the upgrade page instead of selecting. Keeping it out
 * of `LAYOUTS` is what guarantees no consumer can ever apply one: this build has
 * no renderer for them, and `GalleryOptions::normalize()` would turn a stored one
 * back into the default layout.
 */
import { __ } from '@wordpress/i18n';
import {
	LayoutAutoJustified,
	LayoutGrid,
	LayoutMasonry,
	LayoutMetro,
	LayoutThumbnail,
	LayoutStaggered,
	LayoutPerspective,
} from '@shaped-gallery/icons';

export const LAYOUTS = [
	{
		id: 'justified',
		label: __( 'Auto. Justified', 'easy-lightbox-wp' ),
		icon: LayoutAutoJustified,
	},
	{
		id: 'grid',
		label: __( 'Grid', 'easy-lightbox-wp' ),
		icon: LayoutGrid,
	},
	{
		id: 'masonry',
		label: __( 'Masonry', 'easy-lightbox-wp' ),
		icon: LayoutMasonry,
	},
];

/**
 * ShapedGallery Pro's layouts, shown as locked cards. Labels and ids are Pro's own
 * (`shaped-gallery-pro/app/picker/layouts.data.js`), so the card names the layout
 * the user will find after upgrading.
 */
export const PRO_LAYOUTS = [
	{
		id: 'metro',
		label: __( 'Metro', 'easy-lightbox-wp' ),
		icon: LayoutMetro,
		pro: true,
	},
	{
		id: 'thumbnails',
		label: __( 'Thumbnails', 'easy-lightbox-wp' ),
		icon: LayoutThumbnail,
		pro: true,
	},
	{
		id: 'staggered',
		label: __( 'Staggered', 'easy-lightbox-wp' ),
		icon: LayoutStaggered,
		pro: true,
	},
	{
		id: 'perspective',
		label: __( 'Perspective', 'easy-lightbox-wp' ),
		icon: LayoutPerspective,
		pro: true,
	},
];

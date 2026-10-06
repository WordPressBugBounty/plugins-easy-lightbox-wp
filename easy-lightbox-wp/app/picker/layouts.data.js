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
 */
import { __ } from '@wordpress/i18n';
import { LayoutAutoJustified, LayoutGrid, LayoutMasonry } from '@shaped-gallery/icons';

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

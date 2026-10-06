/**
 * Which of `core/image`'s native controls a gallery tile is allowed to offer.
 *
 * Projecting each item as a real `core/image` (§6.4) buys the native toolbar for
 * free, and with it a handful of controls the gallery renderer cannot honour:
 * `items[]` is the only storage (§1), and everything it does not carry is dropped
 * on reload. Others duplicate a gallery option that already works — margin,
 * border, radius and shadow all come from Image/Video Settings, per device.
 * Either way the author is being offered a control that changes nothing, which is
 * exactly what §19 says not to ship.
 *
 * Everything here is scoped to images INSIDE a gallery. A `core/image` anywhere
 * else in the editor keeps every control it has always had, so this file must
 * never widen a rule to `core/image` as a block type.
 *
 * The three seams, all of them core's own:
 *
 *  - `allowResize` block context — the flag core/image reads to drop Width,
 *    Height, Aspect ratio, Scale and its drag-resize handles. `core/gallery`
 *    passes exactly this to its own images.
 *  - the inner blocks' `layout.alignments` — the align toolbar is built from the
 *    alignments the PARENT layout offers, so an empty list removes it the same
 *    way a flex or grid parent does. Nothing else about the layout changes: the
 *    value is merged over the editor's default layout, and the container's layout
 *    class names are already suppressed (see EditableGalleryPreview).
 *  - `blockEditor.useSetting.before` — the documented per-instance filter for
 *    style settings, which is what the Styles tab builds its panels from.
 *
 * What is deliberately NOT hidden: Replace, Crop, Alt text, Caption, the Shape
 * block style and Duotone all round-trip into `items[]` and are left alone.
 *
 * What CANNOT be hidden from here, and so is left visible rather than hacked out:
 * Link, Resolution, and the Advanced panel's anchor / CSS class / title fields.
 * Core gates none of them on anything a parent block can reach — the only levers
 * are block bindings (which relabel the control "Connected to dynamic data") and
 * CSS against a toolbar the whole editor shares. Both are worse than an inert
 * control: one lies about why it is disabled, the other breaks silently the first
 * time core renames a class.
 */
import { addFilter } from '@wordpress/hooks';
import { select } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

/** The parent whose images these rules apply to. */
const GALLERY_BLOCK = 'shaped-gallery/gallery';

/**
 * Style settings the gallery owns itself, as `useSettings` paths.
 *
 * `border.*` and `shadow` are the Border panel (core builds the whole panel from
 * these five, so all five have to go or an empty panel is left behind);
 * `spacing.margin` is the Dimensions panel's Margin control. Each has a
 * per-device equivalent in Image/Video Settings that the renderer actually emits.
 *
 * Duotone's paths (`color.duotone.*`, `color.customDuotone`) are absent on
 * purpose — that one works.
 */
const GALLERY_OWNED_SETTINGS = [
	'border.color',
	'border.radius',
	'border.style',
	'border.width',
	'shadow',
	'spacing.margin',
];

/** Block context for the preview's inner blocks. Frozen module constant: it is a `useMemo` dependency. */
export const TILE_BLOCK_CONTEXT = { allowResize: false };

/** Layout for the preview's inner blocks — merged over the editor default, so it only removes alignments. */
export const TILE_LAYOUT = { alignments: [] };

/**
 * Whether a style setting is one the gallery already controls.
 *
 * Pure and name-checked so the list above can be unit tested without a store.
 *
 * @param {string} path      A `useSettings` path.
 * @param {string} blockName The block asking for it.
 * @return {boolean} True when the gallery owns this setting for this block.
 */
export function isGalleryOwnedSetting( path, blockName ) {
	return 'core/image' === blockName && GALLERY_OWNED_SETTINGS.includes( path );
}

/**
 * Whether a block is one of the gallery preview's tiles.
 *
 * By parentage rather than by our own tile context: this runs inside a store
 * selector, where React context is out of reach. Only the DIRECT parent counts —
 * the preview's images are always its own children, and a gallery nested deeper
 * inside some other block must not drag its host's images into this.
 *
 * @param {string} clientId Block client id.
 * @return {boolean} True when the block sits directly in a gallery.
 */
function isGalleryTile( clientId ) {
	if ( ! clientId ) {
		return false;
	}
	const { getBlockRootClientId, getBlockName } = select( blockEditorStore );
	const rootClientId = getBlockRootClientId( clientId );
	return !! rootClientId && GALLERY_BLOCK === getBlockName( rootClientId );
}

/*
 * Order matters: the path and block-name test is a string compare, the parentage
 * test is a store read, and core calls this filter once per setting per block for
 * every block in the editor.
 *
 * A value another filter already returned is overridden for our tiles on purpose.
 * The question this answers is not "should border be available here" but "can the
 * renderer emit it", and the answer does not change because a theme said yes.
 */
addFilter(
	'blockEditor.useSetting.before',
	'shaped-gallery/tile-controls',
	( value, path, clientId, blockName ) => {
		if ( ! isGalleryOwnedSetting( path, blockName ) || ! isGalleryTile( clientId ) ) {
			return value;
		}
		return false;
	}
);

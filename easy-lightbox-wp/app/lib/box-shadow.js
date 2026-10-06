/**
 * The shared BoxShadow bundle: its shipped default, preset styles, and the
 * resolvers that turn it into CSS.
 *
 * Shape (`app/components/boxShadow`, and `CssHelpers::box_shadow_value()` on the
 * PHP side):
 *   { selectDefault?: 'preset-m' | 'custom', value: { top, right, bottom, left }, unit: 'inset'|'outset', color, hoverColor }
 * where `top` = X offset, `right` = Y offset, `bottom` = blur, `left` = spread,
 * all px, and `unit` selects the inset/outset keyword rather than a length unit.
 */

/**
 * The shipped shadow — a soft drop shadow, visible the moment the control's
 * enable toggle goes on.
 *
 * @type {Object}
 */
export const BOX_SHADOW_DEFAULT = {
	value: { top: '0', right: '3', bottom: '6', left: '0' },
	unit: 'outset',
	color: '#949494',
};

/**
 * The preset tiles, in the order the design lays them out (Figma node 7:32541 —
 * XS → S → M → L → XL → SHARP). Each `shadow` is a full bundle, so a preset
 * resolves through exactly the same code path a hand-typed shadow does; the tile
 * previews its own CSS via `boxShadowValue()` rather than carrying a second,
 * hand-written copy of the same string (§18).
 *
 * `name` is the design's own label and doubles as the tile tooltip. It is a size
 * abbreviation, not prose, so it is deliberately NOT translated.
 *
 * @type {Array<{id:string,name:string,shadow:Object}>}
 */
export const BOX_SHADOW_PRESETS = [
	{
		id: 'preset-xs',
		name: 'XS',
		shadow: { value: { top: '0', right: '1', bottom: '2', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.12)' },
	},
	{
		id: 'preset-s',
		name: 'S',
		shadow: { value: { top: '0', right: '2', bottom: '4', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.14)' },
	},
	{
		id: 'preset-m',
		name: 'M',
		shadow: { value: { top: '0', right: '4', bottom: '6', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.16)' },
	},
	{
		id: 'preset-l',
		name: 'L',
		shadow: { value: { top: '0', right: '8', bottom: '10', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.18)' },
	},
	{
		id: 'preset-xl',
		name: 'XL',
		shadow: { value: { top: '0', right: '12', bottom: '17', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.2)' },
	},
	{
		id: 'preset-sharp',
		name: 'SHARP',
		shadow: { value: { top: '6', right: '6', bottom: '0', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.25)' },
	},
];

/**
 * Retired preset ids, kept resolvable but no longer offered.
 *
 * `selectDefault` is stored in post content, so an id that stops resolving does
 * not merely drop a tile from the picker — the saved gallery falls through to its
 * own `value`/`color`, which for a preset-selected bundle is whatever was last
 * typed in Custom mode (often nothing at all). These five are the pre-Figma
 * vocabulary; they stay here, and in `CssHelpers::box_shadow_value()`, so a
 * gallery saved against them keeps painting the shadow it was saved with.
 *
 * @type {Object<string, Object>}
 */
const LEGACY_BOX_SHADOW_PRESETS = {
	'preset-soft': { value: { top: '0', right: '1', bottom: '3', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.12)' },
	'preset-medium': { value: { top: '0', right: '3', bottom: '6', left: '0' }, unit: 'outset', color: '#949494' },
	'preset-large': { value: { top: '0', right: '6', bottom: '12', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.18)' },
	'preset-floating': { value: { top: '0', right: '12', bottom: '20', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.22)' },
	'preset-outset': { value: { top: '4', right: '4', bottom: '0', left: '0' }, unit: 'outset', color: 'rgba(0, 0, 0, 0.25)' },
};

/**
 * Resolve a `preset-*` id to its bundle — offered presets first, retired ones
 * after.
 *
 * @param {string} id Stored `selectDefault`.
 * @return {Object|undefined} Preset bundle, or undefined for an unknown id.
 */
export function boxShadowPreset( id ) {
	const preset = BOX_SHADOW_PRESETS.find( ( p ) => p.id === id );
	return preset ? preset.shadow : LEGACY_BOX_SHADOW_PRESETS[ id ];
}

/**
 * Fill a stored bundle's missing keys from the default.
 *
 * @param {Object} [shadow] Stored shadow bundle.
 * @return {Object} Bundle with every top-level key present.
 */
export function withBoxShadowDefaults( shadow = {} ) {
	return { ...BOX_SHADOW_DEFAULT, ...shadow };
}

/**
 * Resolve a bundle to a CSS `box-shadow` value.
 *
 * @param {Object} [shadow]   Shadow bundle.
 * @param {string} [colorKey] Colour key to read ('color'|'hoverColor').
 * @return {string} CSS box-shadow value, or ''.
 */
export function boxShadowValue( shadow = {}, colorKey = 'color' ) {
	const selectDefault = shadow.selectDefault;

	if ( selectDefault && 'custom' !== selectDefault && selectDefault.startsWith( 'preset-' ) ) {
		const preset = boxShadowPreset( selectDefault );
		if ( preset ) {
			return boxShadowValue( preset, colorKey );
		}
	}

	const color = ( shadow[ colorKey ] || '' ).trim();
	if ( '' === color ) {
		return '';
	}
	const sides = shadow.value || {};
	const px = ( v ) => `${ '' === v || null === v || undefined === v ? '0' : v }px`;
	const inset = 'inset' === shadow.unit ? 'inset ' : '';

	return `${ inset }${ px( sides.top ) } ${ px( sides.right ) } ${ px( sides.bottom ) } ${ px(
		sides.left
	) } ${ color }`;
}

/**
 * Shared editor-side dynamic-style primitives — the JS mirror of the PHP
 * {@see CssHelpers} var-set builders (src/Render/Css/CssHelpers.php).
 *
 * The editor/frontend split these encode: PHP emits the FULL responsive set
 * (base + `-t` + `-m`) and lets the stylesheet's media queries pick the device,
 * while the editor previews ONE device at a time (via useDeviceType) and must
 * therefore write the resolved value into EVERY breakpoint slot — the editor
 * iframe is narrower than a desktop viewport, so the `max-width` queries fire
 * under a "Desktop" switcher and an unset slot would fall back to the SCSS
 * default and override the preview (CLAUDE.md §16).
 *
 * Internal to app/lib/style — deliberately NOT re-exported from the barrel, which
 * exposes only per-panel `*Style()` builders.
 */

/** Every breakpoint slot a responsive var occupies, in fallback order. */
const SLOTS = [ '', '-t', '-m' ];

/**
 * Resolve a flat responsive scalar (`{ desktop, tablet, mobile }`) for a device,
 * with an appended unit. Falls back to desktop. Returns '' when unset.
 *
 * Mirrors CssHelpers::responsive_length().
 *
 * @param {Object} bundle Responsive scalar bundle.
 * @param {string} device desktop|tablet|mobile.
 * @param {string} unit   Unit to append ('' for none).
 * @return {string} Value+unit, or ''.
 */
export function len( bundle = {}, device = 'desktop', unit = 'px' ) {
	const value = bundle?.[ device ] ?? bundle?.desktop ?? '';
	if ( '' === value || null === value || undefined === value ) {
		return '';
	}
	return `${ value }${ unit }`;
}

/**
 * Resolve a four-side spacing bundle to a CSS "T R B L" string for a device.
 *
 * Handles the responsive box model (`{ desktop:{…}, unit }`) and the
 * non-responsive form (`{ value:{…}, unit }`). Empty sides render as `0`; returns
 * '' when every side is empty. Mirrors CssHelpers::spacing_value().
 *
 * @param {Object} bundle Spacing bundle.
 * @param {string} device desktop|tablet|mobile.
 * @return {string} CSS shorthand, or ''.
 */
export function spacing( bundle = {}, device = 'desktop' ) {
	if ( ! bundle || 'object' !== typeof bundle ) {
		return '';
	}
	const unit = 'string' === typeof bundle.unit ? bundle.unit : 'px';
	let sides = null;
	if ( bundle[ device ] && 'object' === typeof bundle[ device ] ) {
		sides = bundle[ device ];
	} else if ( bundle.value && 'object' === typeof bundle.value ) {
		sides = bundle.value;
	}
	if ( ! sides ) {
		return '';
	}
	const { top = '', right = '', bottom = '', left = '' } = sides;
	if ( '' === top && '' === right && '' === bottom && '' === left ) {
		return '';
	}
	const side = ( v ) => `${ '' === v || null === v || undefined === v ? '0' : v }${ unit }`;
	return `${ side( top ) } ${ side( right ) } ${ side( bottom ) } ${ side( left ) }`;
}

/**
 * Resolve a `{ style, solid, gradient }` background bundle to a CSS value.
 * Mirrors CssHelpers::background_value().
 *
 * @param {Object} bg Background bundle.
 * @return {string} CSS colour/gradient, or ''.
 */
export function background( bg = {} ) {
	if ( 'gradient' === bg?.style ) {
		return bg.gradient || '';
	}
	if ( 'solid' === bg?.style || ( ! bg?.style && bg?.solid ) ) {
		return bg.solid || '';
	}
	if ( ! bg?.style && bg?.gradient ) {
		return bg.gradient || '';
	}
	return '';
}

/**
 * Write one value into every breakpoint slot of a responsive var.
 *
 * The editor counterpart of PHP emitting three different per-device values: here
 * the ONE device-resolved value fills all three slots (see the file header).
 *
 * @param {Object} vars  Var map (mutated).
 * @param {string} name  Base custom property (e.g. `--sp-shaped-gallery-fl-fs`).
 * @param {string} value Resolved value; '' is skipped.
 * @return {void}
 */
export function fillSlots( vars, name, value ) {
	if ( '' === value ) {
		return;
	}
	SLOTS.forEach( ( slot ) => {
		vars[ `${ name }${ slot }` ] = value;
	} );
}

/**
 * Emit a responsive scalar across every slot, device-resolved.
 * Mirrors CssHelpers::length_vars().
 *
 * @param {Object} vars   Var map (mutated).
 * @param {string} name   Base custom property.
 * @param {Object} bundle Responsive scalar bundle.
 * @param {string} device Active editor device.
 * @param {string} unit   Unit to append.
 * @return {void}
 */
export function lengthVars( vars, name, bundle, device, unit = 'px' ) {
	fillSlots( vars, name, len( bundle || {}, device, unit ) );
}

/**
 * Emit a responsive box model across every slot, device-resolved.
 * Mirrors CssHelpers::spacing_vars().
 *
 * @param {Object} vars   Var map (mutated).
 * @param {string} name   Base custom property.
 * @param {Object} bundle Spacing bundle.
 * @param {string} device Active editor device.
 * @return {void}
 */
export function spacingVars( vars, name, bundle, device ) {
	fillSlots( vars, name, spacing( bundle || {}, device ) );
}

/**
 * Emit a typography bundle's custom properties.
 *
 * Family / weight / style / transform / decoration emit once; font size fills
 * every slot (device-resolved); line height (unitless), letter spacing and word
 * spacing emit desktop-only — exactly the split
 * CssHelpers::typography_vars() implements, so PHP and the preview agree.
 *
 * @param {Object} vars    Var map (mutated).
 * @param {string} prefix  Var prefix WITHOUT the property (e.g. `--sp-shaped-gallery-fl`).
 * @param {Object} typo    Typography bundle.
 * @param {Object} scalars Responsive bundles keyed `fs`|`lh`|`ls`|`ws`.
 * @param {string} device  Active editor device.
 * @return {void}
 */
export function typographyVars( vars, prefix, typo = {}, scalars = {}, device = 'desktop' ) {
	const once = {
		ff: typo?.family,
		fw: typo?.fontWeight,
		fst: typo?.style && 'normal' !== typo.style ? typo.style : '',
		tt: typo?.transform && 'none' !== typo.transform ? typo.transform : '',
		td: typo?.decoration,
	};
	Object.entries( once ).forEach( ( [ suffix, value ] ) => {
		if ( value ) {
			vars[ `${ prefix }-${ suffix }` ] = value;
		}
	} );

	lengthVars( vars, `${ prefix }-fs`, scalars.fs, device, 'px' );

	// Desktop-only, matching PHP (the stylesheet reads only the base var).
	[
		[ 'lh', '' ],
		[ 'ls', 'px' ],
		[ 'ws', 'px' ],
	].forEach( ( [ suffix, unit ] ) => {
		const value = len( scalars[ suffix ] || {}, 'desktop', unit );
		if ( '' !== value ) {
			vars[ `${ prefix }-${ suffix }` ] = value;
		}
	} );
}

/**
 * Emit one state of a button/chip appearance bundle (textColor, background,
 * border, borderWidth). Mirrors CssHelpers::button_state_vars().
 *
 * @param {Object} vars   Var map (mutated).
 * @param {string} prefix Var prefix (e.g. `--sp-shaped-gallery-fl`).
 * @param {Object} state  State bundle.
 * @param {string} suffix '' for normal, '-hover' for hover.
 * @return {void}
 */
export function buttonStateVars( vars, prefix, state = {}, suffix = '' ) {
	if ( state?.textColor ) {
		vars[ `${ prefix }-color${ suffix }` ] = state.textColor;
	}
	const bg = background( state?.background || {} );
	if ( '' !== bg ) {
		vars[ `${ prefix }-bg${ suffix }` ] = bg;
	}
	const border = state?.border || {};
	if ( border.style && 'none' !== border.style ) {
		vars[ `${ prefix }-bd-style${ suffix }` ] = border.style;
		if ( border.color ) {
			vars[ `${ prefix }-bd-color${ suffix }` ] = border.color;
		}
		const width = spacing( state?.borderWidth || {} );
		if ( '' !== width ) {
			vars[ `${ prefix }-bd-width${ suffix }` ] = width;
		}
	}
}

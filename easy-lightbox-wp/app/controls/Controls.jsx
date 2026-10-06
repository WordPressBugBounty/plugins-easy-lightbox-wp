/**
 * Small control helpers shared across the editor UI.
 */

/**
 * Short pseudo-random id (not cryptographic — for client-side uniqueness only).
 *
 * @return {string} Random id.
 */
export function getRandomId() {
	return Math.random().toString( 36 ).slice( 2, 9 );
}

/**
 * True when value is in the array.
 *
 * @param {*}     value Needle.
 * @param {Array} arr   Haystack.
 * @return {boolean} Found.
 */
export function inArray( value, arr ) {
	return Array.isArray( arr ) && arr.indexOf( value ) !== -1;
}

/**
 * Resolve a responsive value for a device.
 *
 * @param {Object} value  Responsive object.
 * @param {string} device desktop|tablet|mobile.
 * @return {*} Value.
 */
export function deviceValue( value, device ) {
	if ( ! value || typeof value !== 'object' ) {
		return value;
	}
	return value[ device ] ?? value.desktop;
}

/**
 * Resolve the active unit from a scalar or per-device unit attribute.
 *
 * @param {Object} attributes Attribute value carrying a `unit`.
 * @param {string} device     desktop|tablet|mobile.
 * @return {string} Unit.
 */
export function unit( attributes, device ) {
	if ( ! attributes || typeof attributes.unit !== 'object' ) {
		return attributes?.unit;
	}
	return attributes.unit[ device ];
}

/**
 * Serialize a `{ selector: { prop: value } }` map into a CSS string, skipping
 * empty declarations. Used by the styling controls (Border, BoxShadow) that
 * emit editor-preview CSS.
 *
 * @param {Object} css Selector → declarations map.
 * @return {string} CSS text.
 */
export function cssString( css ) {
	let result = '';
	for ( const selector in css ) {
		let props = '';
		for ( const property in css[ selector ] ) {
			const value = css[ selector ][ property ];
			if ( value && String( value ).length > 0 ) {
				props += property + ':' + value + ';';
			}
		}
		result += '' !== props ? selector + '{' + props + '}' : '';
	}
	return result;
}

/**
 * Format a scalar or per-side object into a space-separated CSS value with unit.
 *
 * @param {*}      value Scalar or object of side values.
 * @param {string} u     Unit suffix.
 * @return {string} CSS value.
 */
export function cssDataCheck( value, u = '' ) {
	if ( value === undefined ) {
		return '';
	}
	if ( typeof value === 'object' ) {
		const filtered = Object.values( value ).filter(
			( val ) => val !== null && val !== undefined && String( val ).trim().length > 0
		);
		if ( filtered.length === 0 ) {
			return '';
		}
		return filtered.map( ( val ) => `${ val }${ u }` ).join( ' ' );
	}
	return String( value ).trim().length > 0 ? `${ value }${ u }` : '';
}

/**
 * Build a `box-shadow` value from a shadow attribute, or `none` when disabled.
 *
 * @param {boolean} enable Whether the shadow is enabled.
 * @param {Object}  shadow Shadow attribute ({ unit, value:{top,right,bottom,left} }).
 * @param {string}  color  Key on `shadow` holding the color.
 * @return {string} CSS box-shadow value.
 */
export function boxCss( enable, shadow, color ) {
	if ( ! enable || '' === shadow?.[ color ] ) {
		return 'none';
	}
	const inset = shadow?.unit === 'inset' ? 'inset' : '';
	const { top, right, bottom, left } = shadow?.value || {};
	return `${ inset } ${ top }px ${ right }px ${ bottom }px ${ left }px ${ shadow[ color ] }`.trim();
}

/**
 * Border style options shared by the Border / BoxShadow controls.
 *
 * @type {Array<{label: string, value: string}>}
 */
export const borderStyles = [
	{ label: 'None', value: 'none' },
	{ label: 'Solid', value: 'solid' },
	{ label: 'Dashed', value: 'dashed' },
	{ label: 'Dotted', value: 'dotted' },
	{ label: 'Double', value: 'double' },
];

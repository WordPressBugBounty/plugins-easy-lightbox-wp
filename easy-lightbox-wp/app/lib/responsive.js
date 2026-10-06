/**
 * Shared responsive-value resolution — the single source for the gallery's
 * breakpoints and the device/value pickers.
 *
 * Previously this logic was triplicated: shaped-layout.js had its own `deviceKey`
 * and `pickResponsive`, layout-math.js defined `resolveResponsive`, and PHP
 * hard-coded the same breakpoints in its media queries. They must all agree or
 * the editor preview, the frontend runtime and the stylesheet resolve different
 * devices. This module is the JS side of that agreement; `layout-math.js`
 * re-exports `resolveResponsive` from here for back-compat.
 */

/**
 * Max-width breakpoints (px). Mirrors the style.scss media queries and the
 * editor's `useDeviceType` (<=600 mobile, <=1024 tablet, else desktop).
 */
export const BREAKPOINTS = { tablet: 1024, mobile: 600 };

/**
 * Active responsive breakpoint for a viewport width.
 *
 * @param {number} width Viewport width in px; defaults to the current window.
 * @return {('desktop'|'tablet'|'mobile')} Device key.
 */
export function deviceKey( width = typeof window !== 'undefined' ? window.innerWidth : 0 ) {
	if ( width <= BREAKPOINTS.mobile ) {
		return 'mobile';
	}
	if ( width <= BREAKPOINTS.tablet ) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * Resolve a responsive value object to a given breakpoint. Scalars pass through.
 *
 * @param {{desktop:*,tablet:*,mobile:*}|*} value  Responsive value or scalar.
 * @param {('desktop'|'tablet'|'mobile')}   device Active device.
 * @return {*} Value for the device (falls back to desktop).
 */
export function resolveResponsive( value, device ) {
	if ( ! value || typeof value !== 'object' ) {
		return value;
	}
	return value[ device ] ?? value.desktop;
}

/**
 * Resolve a responsive `data-*` JSON string ({desktop,tablet,mobile}) to a
 * numeric value for the current viewport, falling back to desktop then a scalar
 * default. Used by the frontend runtime to read the container's data-* geometry.
 *
 * @param {string} json     Raw JSON attribute (e.g. box.dataset.cols).
 * @param {number} fallback Value when nothing parses.
 * @return {number} Resolved number.
 */
export function pickResponsive( json, fallback ) {
	let obj = {};
	try {
		obj = JSON.parse( json || '{}' );
	} catch ( e ) {
		// keep empty → falls through to fallback
	}
	const n = parseInt( obj[ deviceKey() ], 10 );
	if ( Number.isFinite( n ) ) {
		return n;
	}
	const d = parseInt( obj.desktop, 10 );
	return Number.isFinite( d ) ? d : fallback;
}

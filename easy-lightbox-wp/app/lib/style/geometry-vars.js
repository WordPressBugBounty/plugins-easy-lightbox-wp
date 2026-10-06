/**
 * Editor mirror of the PHP geometry contributor (src/Render/Css/Contributors/
 * GeometryVars.php) and its effective-row-height rule.
 *
 * The frontend renderer emits the FULL responsive var set (desktop + `-t`/`-m`)
 * and lets the CSS media queries pick the device. The editor previews ONE device
 * at a time (via useDeviceType), so it resolves each value for the active device
 * and emits the base vars only. The derivation rules — effective row height,
 * gap unit — are identical, so this is the JS side of the same
 * contract; keep the two in lockstep.
 */

/** Default justified target row height when the mode is "Auto" (mirrors PHP). */
export const DEFAULT_ROW_HEIGHT = 280;

/**
 * Effective justified target row height.
 *
 * Custom → the configured height; Auto → the default, so a stale custom value
 * never leaks into an auto gallery. Mirrors GeometryVars::effective_row_height()
 * and the frontend runtime's DEFAULT_ROW_HEIGHT fallback.
 *
 * @param {string} rowHeightMode 'auto' | 'custom'.
 * @param {number} maxRowHeight  Configured custom height.
 * @return {number} Row height in px.
 */
export function effectiveRowHeight( rowHeightMode, maxRowHeight ) {
	return 'custom' === rowHeightMode ? maxRowHeight || DEFAULT_ROW_HEIGHT : DEFAULT_ROW_HEIGHT;
}

/**
 * Build the gallery container CSS-custom-property style object for the editor
 * preview, with each value already resolved for the active device.
 *
 * Unlike the frontend (which emits desktop as the base var and lets the CSS
 * media queries switch to the tablet/mobile vars per VIEWPORT width), the editor
 * previews ONE device at a time via the device switcher. It therefore emits the
 * SAME device-resolved value into the base AND the `-t`/`-m` breakpoint slots:
 * style.scss's media queries fire on the editor canvas iframe's width (which is
 * narrower than a real desktop viewport, so `max-width:1024px` triggers even in
 * Desktop mode), and if `-t`/`-m` were left unset those queries would fall back
 * to the stylesheet's `:root` defaults (`--sp-shaped-gallery-cols-t:3`, …) and override the
 * preview — making the editor ignore the user's per-device values. Writing the
 * resolved value into every slot neutralizes the media queries so the switcher
 * fully drives the preview and it matches the frontend at that device.
 *
 * @param {Object} params
 * @param {number} params.cols       Column count (device-resolved).
 * @param {number} params.gh         Horizontal gap (device-resolved).
 * @param {number} params.gv         Vertical gap (device-resolved).
 * @param {number} params.row        Effective row height in px.
 * @param {string} [params.unit]     Gap unit (default 'px').
 * @param {Object} [params.advanced] Advanced block attributes.
 * @param {string} [params.device]   Active device type ('desktop'|'tablet'|'mobile').
 * @return {Object} React style object of CSS custom properties.
 */
export function geometryStyle( { cols, gh, gv, row, unit = 'px', advanced, device } ) {
	const h = gh + unit;
	const v = gv + unit;
	const styles = {
		// Base + tablet/mobile all carry the device-resolved value so the shared
		// style.scss media queries can't override the preview with SCSS defaults.
		'--sp-shaped-gallery-cols': cols,
		'--sp-shaped-gallery-cols-t': cols,
		'--sp-shaped-gallery-cols-m': cols,
		'--sp-shaped-gallery-gh': h,
		'--sp-shaped-gallery-gh-t': h,
		'--sp-shaped-gallery-gh-m': h,
		'--sp-shaped-gallery-gv': v,
		'--sp-shaped-gallery-gv-t': v,
		'--sp-shaped-gallery-gv-m': v,
		'--sp-shaped-gallery-row': row + 'px',
	};

	if ( advanced ) {
		const bg = resolveBackground( advanced.background );
		if ( bg ) {
			styles['--sp-shaped-gallery-wrap-bg'] = bg;
		}

		if ( device ) {
			const pad = resolveSpacing( advanced.padding, device );
			if ( pad ) {
				styles['--sp-shaped-gallery-wrap-pad'] = pad;
				styles['--sp-shaped-gallery-wrap-pad-t'] = pad;
				styles['--sp-shaped-gallery-wrap-pad-m'] = pad;
			}

			const mg = resolveSpacing( advanced.margin, device );
			if ( mg ) {
				styles['--sp-shaped-gallery-wrap-mg'] = mg;
				styles['--sp-shaped-gallery-wrap-mg-t'] = mg;
				styles['--sp-shaped-gallery-wrap-mg-m'] = mg;
			}
		}
	}

	return styles;
}

/**
 * Resolve background styling object to color/gradient string.
 *
 * @param {Object} background Background styling object.
 * @return {string} Color or gradient CSS value.
 */
function resolveBackground( background ) {
	if ( ! background ) {
		return '';
	}
	if ( background.style === 'gradient' ) {
		return background.gradient || '';
	}
	if ( background.style === 'solid' ) {
		return background.solid || '';
	}
	return '';
}

/**
 * Resolve four-sided spacing object to CSS margin/padding T R B L value.
 *
 * @param {Object} spacing Spacing object.
 * @param {string} device  Active device key ('desktop'|'tablet'|'mobile').
 * @return {string} CSS shorthand value or ''.
 */
function resolveSpacing( spacing, device ) {
	if ( ! spacing ) {
		return '';
	}
	const unit = spacing.unit || 'px';
	const sides = spacing[ device ] || spacing.desktop || spacing.value;
	if ( ! sides ) {
		return '';
	}

	const top = sides.top !== undefined && sides.top !== '' ? sides.top : 0;
	const right = sides.right !== undefined && sides.right !== '' ? sides.right : 0;
	const bottom = sides.bottom !== undefined && sides.bottom !== '' ? sides.bottom : 0;
	const left = sides.left !== undefined && sides.left !== '' ? sides.left : 0;

	if ( sides.top === undefined && sides.right === undefined && sides.bottom === undefined && sides.left === undefined ) {
		return '';
	}

	return `${top}${unit} ${right}${unit} ${bottom}${unit} ${left}${unit}`;
}

/**
 * Editor mirror of the PHP ImageVideoStyle contributor
 * (src/Render/Css/Contributors/ImageVideoStyle.php) — the per-item media styling
 * from the Image & Video Settings panel's Style tab, as `--sp-shaped-gallery-iv-*`
 * custom properties, plus the mirror of the renderer's container modifier classes.
 *
 * The frontend emits the full responsive var set (desktop + `-t`/`-m`) and lets the
 * CSS media queries pick the device. The editor previews ONE device at a time (via
 * useDeviceType), so — exactly like geometryStyle / ajaxStyle — it resolves the one
 * responsive value (margin) for the active device and writes it into the base AND
 * `-t`/`-m` slots, so the shared style.scss media queries (which fire on the narrow
 * editor iframe) can't override the preview. Every other property is state-scoped,
 * not responsive, and emits once.
 *
 * Derivation rules are identical to the PHP side; keep the two in lockstep.
 */
import { boxShadowValue, withBoxShadowDefaults } from '../box-shadow';

/**
 * Resolve a four-side spacing bundle to a CSS "T R B L" string for a device.
 * Mirrors `CssHelpers::spacing_value()`.
 *
 * @param {Object} bundle Spacing bundle.
 * @param {string} device desktop|tablet|mobile.
 * @return {string} CSS shorthand, or ''.
 */
function spacing( bundle = {}, device = 'desktop' ) {
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
 * Add one state's custom properties (border, radius, shadow). None of them is
 * responsive, so each emits once.
 *
 * @param {Object} vars   Var map (mutated).
 * @param {Object} state  Per-state style bundle.
 * @param {string} suffix '' for normal, '-hover' for hover.
 * @return {void}
 */
function stateVars( vars, state = {}, suffix = '' ) {
	const border = state.border || {};
	if ( border.style && 'none' !== border.style ) {
		vars[ `--sp-shaped-gallery-iv-bd-style${ suffix }` ] = border.style;
		if ( border.color ) {
			vars[ `--sp-shaped-gallery-iv-bd-color${ suffix }` ] = border.color;
		}
		const width = spacing( state.borderWidth || {} );
		if ( '' !== width ) {
			vars[ `--sp-shaped-gallery-iv-bd-width${ suffix }` ] = width;
		}
	}

	const radius = spacing( state.borderRadius || {} );
	if ( '' !== radius ) {
		vars[ `--sp-shaped-gallery-iv-radius${ suffix }` ] = radius;
	}

	/*
	 * Filled from the shipped default first, matching the merge
	 * `GalleryOptions::normalize_image_video()` applies server-side: block attribute
	 * defaults are shallow, so a gallery with a stored `imageVideo` object never
	 * receives the nested `boxShadow` default and the canvas would draw no shadow
	 * while the front end drew one.
	 */
	if ( state.boxShadowEnable ) {
		const shadow = boxShadowValue( withBoxShadowDefaults( state.boxShadow ) );
		if ( '' !== shadow ) {
			vars[ `--sp-shaped-gallery-iv-shadow${ suffix }` ] = shadow;
		}
	}
}

/**
 * Whether the image preloader is active (mirrors
 * `GalleryOptions::preloader_active()`).
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} Whether the placeholder class applies.
 */
function isPreloaderActive( attributes ) {
	const iv = attributes.imageVideo ?? {};
	return !! iv.lazyLoad && !! iv.imagePreloader;
}

/**
 * Build the Image & Video CSS-custom-property style object for the editor preview.
 *
 * @param {Object} attributes Block attributes (imageVideo, margin, layout).
 * @param {string} device     desktop|tablet|mobile (active editor device).
 * @return {Object} React style object of `--sp-shaped-gallery-iv-*` custom properties.
 */
export function imageVideoStyle( attributes = {}, device = 'desktop' ) {
	const iv = attributes.imageVideo ?? {};
	const style = iv.style ?? {};
	const vars = {};

	stateVars( vars, style.normal || {}, '' );
	stateVars( vars, style.hover || {}, '-hover' );

	// Per-item margin is responsive → device-resolved value in every slot.
	const margin = spacing( attributes.margin || {}, device );
	if ( '' !== margin ) {
		vars[ '--sp-shaped-gallery-iv-mg' ] = margin;
		vars[ '--sp-shaped-gallery-iv-mg-t' ] = margin;
		vars[ '--sp-shaped-gallery-iv-mg-m' ] = margin;
	}

	if ( undefined !== iv.playIconSize && null !== iv.playIconSize ) {
		vars[ '--sp-shaped-gallery-iv-play' ] = `${ Math.max(
			12,
			Math.min( 120, parseInt( iv.playIconSize, 10 ) || 48 )
		) }px`;
	}

	return vars;
}

/**
 * Editor mirror of LayoutRenderer's Image & Video container modifier classes
 * (preloader placeholder, play-icon reveal).
 *
 * The preloader's `is-js` marker is deliberately NOT mirrored: the placeholder CSS
 * requires it, and the editor has no load-watching runtime to clear it, so the
 * placeholder would stay inert over every tile.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Space-joined class list ('' when none apply).
 */
export function imageVideoClasses( attributes = {} ) {
	const iv = attributes.imageVideo ?? {};
	const classes = [];

	if ( isPreloaderActive( attributes ) ) {
		classes.push( 'sp-shaped-gallery--preloader' );
	}
	if ( iv.displayIconOnHover ) {
		classes.push( 'sp-shaped-gallery--play-hover' );
	}

	return classes.join( ' ' );
}

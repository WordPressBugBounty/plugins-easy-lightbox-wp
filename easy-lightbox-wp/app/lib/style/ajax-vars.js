/**
 * Editor mirror of the PHP AjaxStyle contributor (src/Render/Css/Contributors/
 * AjaxStyle.php) — the Load More button's `--sp-shaped-gallery-ap-*` custom properties.
 *
 * The frontend emits the full responsive var set (desktop + `-t`/`-m`) and lets
 * the CSS media queries pick the device. The editor previews ONE device at a time
 * (via useDeviceType), so — exactly like geometryStyle — it resolves each
 * responsive value (font size, padding, margin, gap) for the active device and
 * writes that resolved value into the base AND `-t`/`-m` slots, so the shared
 * style.scss media queries (which fire on the narrow editor iframe) can't override
 * the preview. Non-responsive props (family/weight/…, per-state colours, radius)
 * emit once.
 *
 * Both sides now derive those rules from one place — the shared helpers here mirror
 * the PHP CssHelpers var-set builders — so this module only names its vars and
 * their sources, exactly like its PHP counterpart.
 */
import { spacing, spacingVars, typographyVars, buttonStateVars } from './helpers';

/** Var prefix for every property this mirror emits (mirrors AjaxStyle::PREFIX). */
const PREFIX = '--sp-shaped-gallery-ap';

/**
 * Build the pagination-button CSS-custom-property style object for the editor
 * preview, each responsive value resolved for the active device and written into
 * every breakpoint slot (see file header).
 *
 * @param {Object} style  The `ajaxPagination.style` object.
 * @param {string} device desktop|tablet|mobile (active editor device).
 * @return {Object} React style object of `--sp-shaped-gallery-ap-*` custom properties.
 */
export function ajaxStyle( style = {}, device = 'desktop' ) {
	const vars = {};

	typographyVars(
		vars,
		PREFIX,
		style.typography,
		{
			fs: style.fontSize,
			lh: style.lineHeight,
			ls: style.letterSpacing,
			ws: style.wordSpacing,
		},
		device
	);

	buttonStateVars( vars, PREFIX, style.normal, '' );
	buttonStateVars( vars, PREFIX, style.hover, '-hover' );

	// Corner radius is a single value (no per-device slot in the stylesheet).
	const radius = spacing( style.borderRadius || {} );
	if ( '' !== radius ) {
		vars[ `${ PREFIX }-radius` ] = radius;
	}

	spacingVars( vars, `${ PREFIX }-pad`, style.padding, device );
	spacingVars( vars, `${ PREFIX }-mg`, style.margin, device );

	return vars;
}

/**
 * Build the full pagination-bar CSS-custom-property style object for the editor
 * preview: the button style vars ({@see ajaxStyle}) plus the Number-type gap
 * between pages, which lives on the ajaxPagination object (not `style`) and
 * carries its own unit. Mirrors the PHP AjaxStyle contributor's full `vars()`.
 *
 * @param {Object} ap     The `ajaxPagination` object ({ style, … }).
 * @param {string} device desktop|tablet|mobile (active editor device).
 * @return {Object} React style object of `--sp-shaped-gallery-ap-*` custom properties.
 */
export function paginationStyle( ap = {}, device = 'desktop' ) {
	const vars = ajaxStyle( ap.style || {}, device );


	return vars;
}

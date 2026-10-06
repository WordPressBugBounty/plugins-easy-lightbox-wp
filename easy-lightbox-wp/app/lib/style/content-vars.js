/**
 * Editor mirror of the PHP ContentStyle contributor
 * (src/Render/Css/Contributors/ContentStyle.php) — the Content Settings panel's
 * `--sp-shaped-gallery-ct-*` custom properties: alignment, the content box
 * (background / border / radius / responsive padding), the title-to-description
 * gap, the description line clamp, and the two text elements' typography +
 * colour.
 *
 * Same gate as PHP — a gallery with neither the title nor the description on
 * contributes nothing — and the same sources, read through the shared helpers that
 * mirror the PHP CssHelpers builders so the derivation rules cannot drift. The one
 * difference is device handling: each responsive value is resolved for the active
 * editor device and written into every breakpoint slot (see
 * app/lib/style/helpers.js for why).
 *
 * The stylesheet these feed is `style.scss`, shared by the editor and the front
 * end, so one set of rules draws both.
 */
import { background, spacing, lengthVars, spacingVars, typographyVars, fillSlots } from './helpers';

/** Var prefix for every property this mirror emits. */
const CONTENT = '--sp-shaped-gallery-ct';

/**
 * Build the `--sp-shaped-gallery-ct-<slug>-*` typography properties for one text
 * element. Mirrors ContentStyle::typography_vars(), including the text colour
 * that the panel keeps as its own control rather than inside the bundle.
 *
 * @param {Object} vars    Var map (mutated).
 * @param {Object} content The grouped content attribute.
 * @param {string} prefix  Attribute key prefix ('title'|'desc').
 * @param {string} slug    CSS-var slug ('ttl'|'desc').
 * @param {string} device  Active editor device.
 * @return {void}
 */
function textVars( vars, content, prefix, slug, device ) {
	const name = `${ CONTENT }-${ slug }`;

	typographyVars(
		vars,
		name,
		content[ `${ prefix }Typography` ],
		{
			fs: content[ `${ prefix }FontSize` ],
			lh: content[ `${ prefix }LineHeight` ],
			ls: content[ `${ prefix }LetterSpacing` ],
			ws: content[ `${ prefix }WordSpacing` ],
		},
		device
	);

	const color = 'title' === prefix ? content.titleColor : content.descColor;
	if ( color ) {
		vars[ `${ name }-color` ] = color;
	}
}

/**
 * Build the Content Settings custom-property style object for the editor preview.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} device     desktop|tablet|mobile (active editor device).
 * @return {Object} React style object of `--sp-shaped-gallery-ct-*` properties.
 */
export function contentStyle( attributes = {}, device = 'desktop' ) {
	const content = attributes.content || {};

	// The same gate PHP applies: nothing to style when neither element renders.
	if ( ! content.imageTitle && ! content.imageDescription ) {
		return {};
	}

	const vars = {};

	// Alignment is always emitted (the stylesheet's text-align source).
	vars[ `${ CONTENT }-align` ] = content.alignment || 'left';

	const bg = background( content.background || {} );
	if ( '' !== bg ) {
		vars[ `${ CONTENT }-bg` ] = bg;
	}

	// Border: the style gates the colour + width, as everywhere else.
	const border = content.border || {};
	if ( border.style && 'none' !== border.style ) {
		vars[ `${ CONTENT }-bd-style` ] = border.style;
		if ( border.color ) {
			vars[ `${ CONTENT }-bd-color` ] = border.color;
		}
		const width = spacing( content.borderWidth || {} );
		if ( '' !== width ) {
			vars[ `${ CONTENT }-bd-width` ] = width;
		}
	}

	const radius = spacing( content.borderRadius || {} );
	if ( '' !== radius ) {
		vars[ `${ CONTENT }-radius` ] = radius;
	}

	spacingVars( vars, `${ CONTENT }-pad`, content.padding, device );

	// Title-to-description gap: responsive AND unit-bearing, so both travel (the
	// unit lives on the bundle — one switcher for all three slots).
	const gap = content.titleToDescGap || {};
	lengthVars( vars, `${ CONTENT }-gap`, gap, device, gap.unit || 'px' );

	// Description line clamp — only meaningful while the limit is counted in lines
	// (the "word" unit truncates the text itself instead).
	const limit = content.descriptionLimit || {};
	if ( 'lines' === limit.unit ) {
		const lines = parseInt( limit[ device ] ?? limit.desktop, 10 );
		if ( lines > 0 ) {
			fillSlots( vars, `${ CONTENT }-desc-clamp`, String( lines ) );
		}
	}

	textVars( vars, content, 'title', 'ttl', device );
	textVars( vars, content, 'desc', 'desc', device );

	return vars;
}

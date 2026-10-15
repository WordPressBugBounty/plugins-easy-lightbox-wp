/**
 * Typography family → family + generic fallback. The JS twin of
 * `CssHelpers::font_stack()` (src/Render/Css/CssHelpers.php); the two lists must
 * name the same families and give them the same generic.
 *
 * The Typography control offers named faces (Roboto, Open Sans, Inter, …) but the
 * plugin fetches no web fonts, so where one is not installed `font-family: Roboto`
 * matches nothing and the browser falls back to its DEFAULT font — a serif — for a
 * face that is sans-serif. Appending the family's generic keeps the fallback in the
 * same style as the face that was asked for; an installed font still wins.
 */

/** Generic fallback per family, keyed by lower-cased family name. */
const GENERIC_BY_FAMILY = {
	georgia: 'serif',
	'times new roman': 'serif',
	'playfair display': 'serif',
	merriweather: 'serif',
	'courier new': 'monospace',
	arial: 'sans-serif',
	helvetica: 'sans-serif',
	verdana: 'sans-serif',
	tahoma: 'sans-serif',
	'trebuchet ms': 'sans-serif',
	roboto: 'sans-serif',
	'open sans': 'sans-serif',
	lato: 'sans-serif',
	montserrat: 'sans-serif',
	poppins: 'sans-serif',
	inter: 'sans-serif',
	nunito: 'sans-serif',
	raleway: 'sans-serif',
	'source sans pro': 'sans-serif',
	oswald: 'sans-serif',
};

/**
 * Complete a typography family with its generic fallback.
 *
 * A family outside the control's list (a stored custom value) and a value that is
 * already a stack (it carries a comma) are returned untouched, as is an empty one.
 *
 * @param {string} family Family as stored in the typography bundle.
 * @return {string} Family, with its generic fallback when it is one the control offers.
 */
export function fontStack( family ) {
	const value = 'string' === typeof family ? family.trim() : '';
	if ( ! value || value.includes( ',' ) ) {
		return value;
	}
	const generic = GENERIC_BY_FAMILY[ value.toLowerCase() ];
	return generic ? `${ value }, ${ generic }` : value;
}

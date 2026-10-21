/**
 * Typography family → the font weights it actually has. Sits beside
 * `font-stack.js`, which completes the same families with a generic fallback.
 *
 * The plugin fetches no web fonts, so a weight renders only when the face ships
 * it. The web-safe system families ship Regular and Bold — "Medium 500" on
 * Courier New draws as Regular, which is a Font Style option that saves and does
 * nothing. The Google families are listed with their published weights, which is
 * what a theme that loads them serves; where a family's published weights have
 * changed between releases (Roboto, Nunito, Merriweather) only the weights every
 * release carries are listed, so an offered weight is never a guess.
 */

/** Weights per family, keyed by lower-cased family name. */
const WEIGHTS_BY_FAMILY = {
	arial: [ 400, 700 ],
	helvetica: [ 400, 700 ],
	georgia: [ 400, 700 ],
	'times new roman': [ 400, 700 ],
	'courier new': [ 400, 700 ],
	verdana: [ 400, 700 ],
	tahoma: [ 400, 700 ],
	'trebuchet ms': [ 400, 700 ],
	roboto: [ 100, 300, 400, 500, 700, 900 ],
	'open sans': [ 300, 400, 500, 600, 700, 800 ],
	lato: [ 100, 300, 400, 700, 900 ],
	montserrat: [ 100, 200, 300, 400, 500, 600, 700, 800, 900 ],
	poppins: [ 100, 200, 300, 400, 500, 600, 700, 800, 900 ],
	inter: [ 100, 200, 300, 400, 500, 600, 700, 800, 900 ],
	nunito: [ 200, 300, 400, 600, 700, 800, 900 ],
	raleway: [ 100, 200, 300, 400, 500, 600, 700, 800, 900 ],
	'playfair display': [ 400, 500, 600, 700, 800, 900 ],
	merriweather: [ 300, 400, 700, 900 ],
	'source sans pro': [ 200, 300, 400, 600, 700, 900 ],
	oswald: [ 200, 300, 400, 500, 600, 700 ],
};

/**
 * The weights a typography family offers, as the string values the control stores.
 *
 * @param {string} family Family as stored in the typography bundle.
 * @return {string[]|null} Weights, or null for the theme font ('') or a custom
 *                         family, whose weights are unknown and so unrestricted.
 */
export function supportedWeights( family ) {
	const key = 'string' === typeof family ? family.trim().toLowerCase() : '';
	const weights = WEIGHTS_BY_FAMILY[ key ];
	return weights ? weights.map( String ) : null;
}

/**
 * The weight a family actually draws for a requested one.
 *
 * Follows CSS font matching (CSS Fonts 4, §5.2): a weight from 400 to 500 tries
 * heavier ones up to 500, then lighter ones, then heavier ones past 500; below
 * 400 lighter ones come first; above 500 heavier ones come first. Snapping a
 * stored weight with it therefore never changes what renders.
 *
 * @param {string}        weight    Stored weight ('' when unset).
 * @param {string[]|null} supported The family's weights (see supportedWeights()).
 * @return {string} The weight that renders, or `weight` when nothing is known.
 */
export function nearestWeight( weight, supported ) {
	const want = parseInt( weight, 10 );
	if ( Number.isNaN( want ) ) {
		return weight ? String( weight ) : '';
	}
	if ( ! supported?.length ) {
		return String( weight );
	}

	const list = supported.map( Number ).sort( ( a, b ) => a - b );
	if ( list.includes( want ) ) {
		return String( want );
	}

	const lighter = list.filter( ( w ) => w < want ).reverse();
	const heavier = list.filter( ( w ) => w > want );
	let order;
	if ( want >= 400 && want <= 500 ) {
		order = [ ...heavier.filter( ( w ) => w <= 500 ), ...lighter, ...heavier.filter( ( w ) => w > 500 ) ];
	} else if ( want < 400 ) {
		order = [ ...lighter, ...heavier ];
	} else {
		order = [ ...heavier, ...lighter ];
	}
	return String( order[ 0 ] );
}

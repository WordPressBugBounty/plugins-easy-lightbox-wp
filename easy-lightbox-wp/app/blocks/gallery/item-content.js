/**
 * Pure mirror of the PHP renderer's content block
 * (LayoutRenderer::content_markup() + ::limit_description()) — which text each
 * element shows, whether anything shows at all, and the figcaption's class list.
 *
 * Kept separate from the component (ItemContent.jsx) so the decisions can be
 * unit-tested without a DOM, the same split image-blocks.js uses. Every rule here
 * has a counterpart in PHP; a change on either side without the other is a
 * frontend/editor divergence, which is exactly what §18 forbids.
 *
 * The escaping half is deliberately absent: React escapes text children, so the
 * `esc_html()` calls in the PHP have no mirror to keep in step.
 */

/**
 * Apply the description word limit.
 *
 * Mirrors LayoutRenderer::limit_description(): only the "word" unit truncates
 * here — a "lines" limit is enforced by CSS (`-webkit-line-clamp` via
 * `--sp-shaped-gallery-ct-desc-clamp`) — and it uses the DESKTOP count on every
 * device, because the truncation happens once for the stored text rather than per
 * breakpoint.
 *
 * @param {string} text  Description text.
 * @param {Object} limit Responsive limit bundle ({desktop,tablet,mobile,unit}).
 * @return {string} Possibly truncated text.
 */
export function limitDescription( text, limit = {} ) {
	if ( 'word' !== limit?.unit ) {
		return text;
	}
	const max = parseInt( limit.desktop, 10 );
	if ( ! ( max >= 1 ) ) {
		return text;
	}
	const words = String( text ).trim().split( /\s+/ );
	if ( words.length <= max ) {
		return text;
	}
	return `${ words.slice( 0, max ).join( ' ' ) }…`;
}

/**
 * The title this item shows, or '' when the element is off or the source is empty.
 *
 * @param {Object} item    MediaItem (or a partial stand-in carrying the text fields).
 * @param {Object} content The grouped content attribute.
 * @return {string} Title text.
 */
export function titleFor( item = {}, content = {} ) {
	if ( ! content.imageTitle ) {
		return '';
	}
	// Caption is the default source (GalleryAttributesFactory), so only an explicit
	// `title` reads the attachment title — an absent key resolves as it does in PHP.
	const value = 'title' === content.imageTitleSource ? item.title : item.caption;
	return String( value ?? '' ).trim() ? String( value ) : '';
}

/**
 * The description this item shows, word-limited, or '' when the element is off or
 * the source is empty.
 *
 * @param {Object} item    MediaItem (or a partial stand-in carrying the text fields).
 * @param {Object} content The grouped content attribute.
 * @return {string} Description text.
 */
export function descriptionFor( item = {}, content = {} ) {
	if ( ! content.imageDescription ) {
		return '';
	}
	// Description is the default source (GalleryAttributesFactory), so only an explicit
	// `caption` reads the attachment caption — an absent key resolves as it does in PHP.
	const source = 'caption' === content.imageDescriptionSource ? item.caption : item.description;
	const value = limitDescription( String( source ?? '' ), content.descriptionLimit );
	return value.trim() ? value : '';
}

/**
 * The figcaption's class list. Mirrors content_markup()'s sprintf exactly — the
 * position modifier anchors the block to an edge and `is-<displayStyle>` picks the
 * solid bar or the gradient scrim.
 *
 * @param {Object} content The grouped content attribute.
 * @return {string} Class attribute value.
 */
export function contentClasses( content = {} ) {
	const position = content.position || 'bottom';
	const displayStyle = content.displayStyle || 'classic';
	return `sp-shaped-gallery__content sp-shaped-gallery__content--${ position } is-${ displayStyle }`;
}

/**
 * The HTML tag the title renders as. Mirrors the allow-list
 * GalleryOptions::normalize_content() validates against, because this value is
 * used as an element name.
 *
 * @param {Object} content The grouped content attribute.
 * @return {string} Tag name.
 */
export function titleTag( content = {} ) {
	const tag = content.imageTitleTag;
	return [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span' ].includes( tag ) ? tag : 'h4';
}

/**
 * Whether this item renders a content block at all.
 *
 * The PHP returns '' both when neither element is enabled AND when both resolve to
 * empty text, so an item with no title and no caption emits no figcaption even
 * with the panel on. The preview has to make the same call or an empty bar appears
 * over images the front end leaves clean.
 *
 * @param {Object} item    MediaItem (or a partial stand-in carrying the text fields).
 * @param {Object} content The grouped content attribute.
 * @return {boolean} Whether anything renders.
 */
export function hasItemContent( item = {}, content = {} ) {
	if ( ! content.imageTitle && ! content.imageDescription ) {
		return false;
	}
	return '' !== titleFor( item, content ) || '' !== descriptionFor( item, content );
}

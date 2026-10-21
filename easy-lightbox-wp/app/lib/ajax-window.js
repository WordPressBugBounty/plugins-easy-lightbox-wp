/**
 * Ajax Pagination's first window — how many of a gallery's items the first view
 * renders. The JS twin of the `$window` slice in `LayoutRenderer::render()`: the
 * editor canvas and its pagination bar both read it, so the canvas shows exactly
 * the tiles a visitor first sees and the bar appears exactly when more exist.
 */
import { resolveResponsive } from './responsive';

/**
 * One page's size: the DESKTOP Show Per View on every device, like
 * `GalleryOptions::responsive_int( showPerView, 'desktop', 15 )`. The renderer sizes
 * the first window and the number nav from the desktop value whatever the
 * viewport, so the editor does too.
 *
 * @param {Object} ajaxPagination The grouped ajaxPagination attribute.
 * @return {number} Items per page, at least 1.
 */
export function ajaxPageSize( ajaxPagination ) {
	const raw = resolveResponsive( ajaxPagination?.showPerView, 'desktop' );
	const numeric = 'number' === typeof raw || ( 'string' === typeof raw && '' !== raw.trim() );
	const value = numeric ? Number( raw ) : NaN;
	return Number.isFinite( value ) ? Math.max( 1, Math.trunc( value ) ) : 15;
}

/**
 * How many items the first view renders: one page when pagination is on and the
 * items outnumber it, every item otherwise.
 *
 * @param {Object} attributes Block attributes.
 * @return {number} Item count of the first window.
 */
export function firstWindowSize( attributes ) {
	const { items = [], ajaxPagination } = attributes;
	if ( ! ajaxPagination?.enable ) {
		return items.length;
	}
	return Math.min( items.length, ajaxPageSize( ajaxPagination ) );
}

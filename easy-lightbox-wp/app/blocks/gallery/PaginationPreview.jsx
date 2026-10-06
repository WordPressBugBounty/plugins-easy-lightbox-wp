/**
 * Editor-canvas preview of the Ajax Pagination bar.
 *
 * Renders the SAME bar structure + class names the PHP `LayoutRenderer` emits
 * (the Load More button), styled by the SAME `--sp-shaped-gallery-ap-*` custom
 * properties via the {@see paginationStyle} mirror — so the editor matches the
 * frontend. It is a STATIC preview: the control is inert (the runtime that wires
 * it is frontend-only), which is exactly the intended "editor shows the
 * pagination UI but it doesn't work" behaviour.
 *
 * It is a sibling of the grid preview (matching the frontend, where the bar is a
 * sibling of `.sp-shaped-gallery`), shown whenever pagination is enabled and the
 * gallery holds more items than one view.
 */
import { __ } from '@wordpress/i18n';
import { paginationStyle } from '@shaped-gallery/lib/style';
import { resolveResponsive } from '@shaped-gallery/lib/responsive';

/**
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.device     Active editor device (desktop|tablet|mobile).
 * @return {JSX.Element|null} Bar preview, or null when pagination is inactive.
 */
export default function PaginationPreview( { attributes, device } ) {
	const { items = [], ajaxPagination = {} } = attributes;

	// Page size is the desktop showPerView on every device (the SSR renderer
	// resolves it the same way); the bar only shows once there is more than one
	// page — the same `total > per_view` gate, so editor ⇄ frontend agree.
	const pageSize = parseInt( resolveResponsive( ajaxPagination.showPerView || {}, 'desktop' ), 10 ) || 15;
	if ( ! ajaxPagination.enable || items.length <= pageSize ) {
		return null;
	}

	const align = ajaxPagination.alignment || 'center';
	const style = paginationStyle( ajaxPagination, device );
	const label = __( 'Gallery pagination', 'easy-lightbox-wp' );
	const barClass = `sp-shaped-gallery__pagination sp-shaped-gallery__pagination--${ align }`;

	// Inert in the editor — clicks must not navigate or steal block selection.
	const inert = ( e ) => e.preventDefault();

	const buttonLabel = ( ajaxPagination.buttonLabel || '' ).trim() || __( 'Load More', 'easy-lightbox-wp' );

	return (
		<nav className={ barClass } aria-label={ label } style={ style }>
			<button type="button" className="sp-shaped-gallery__load-more" onClick={ inert }>
				<span className="sp-shaped-gallery__spinner" aria-hidden="true" />
				<span className="sp-shaped-gallery__load-more-label">{ buttonLabel }</span>
			</button>
		</nav>
	);
}

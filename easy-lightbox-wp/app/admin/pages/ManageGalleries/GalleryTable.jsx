/**
 * The galleries table: header, rows, empty / loading / error states, pager.
 *
 * A real `<table>` rather than a grid of divs — the data is tabular, and the row/column
 * relationships are what a screen reader needs to read a shortcode back to its gallery.
 */
import { Spinner } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import GalleryRow from './GalleryRow';

/**
 * @param {Object}   props
 * @param {Array}    props.items       Gallery rows.
 * @param {Object}   props.copy        Localized manage-screen copy.
 * @param {string}   [props.search]    Active search term, for the empty message.
 * @param {Set}      props.selected    Selected gallery ids.
 * @param {Function} props.onSelect    Row select handler (id, checked).
 * @param {Function} props.onSelectAll Select-all handler (checked).
 * @param {Function} props.onDuplicate Duplicate handler.
 * @param {Function} props.onDelete    Delete handler.
 * @param {boolean}  props.loading     Whether the list is loading.
 * @param {boolean}  props.error       Whether the list failed to load.
 * @param {boolean}  props.busy        Whether a mutation is in flight.
 * @param {number}   props.page        Current page.
 * @param {number}   props.totalPages  Total pages.
 * @param {number}   props.total       Total galleries.
 * @param {Function} props.onPage      Page change handler.
 * @return {JSX.Element} Table card.
 */
export default function GalleryTable( {
	items,
	copy,
	search = '',
	selected,
	onSelect,
	onSelectAll,
	onDuplicate,
	onDelete,
	loading,
	error,
	busy,
	page,
	totalPages,
	total,
	onPage,
} ) {
	const columns = copy.columns || {};
	const allSelected = items.length > 0 && items.every( ( item ) => selected.has( item.id ) );

	if ( loading ) {
		return (
			<div className="sp-shaped-gallery-manage__state" role="status">
				<Spinner />
				<span>{ copy.loadingLabel || __( 'Loading galleries…', 'easy-lightbox-wp' ) }</span>
			</div>
		);
	}

	if ( error ) {
		return (
			<div className="sp-shaped-gallery-manage__state sp-shaped-gallery-manage__state--error" role="alert">
				{ copy.errorLabel || __( 'Could not load galleries. Please reload the page.', 'easy-lightbox-wp' ) }
			</div>
		);
	}

	/*
	 * The table is only mounted once the site HAS galleries — the first-run case is
	 * the screen's own banner (see index.jsx) — so an empty page here is a search
	 * that matched nothing. The `emptyTitle` pair is still the fallback for the one
	 * other way to get here: a page number left pointing past the end of an
	 * unfiltered list.
	 */
	if ( ! items.length ) {
		return (
			<div className="sp-shaped-gallery-manage__state">
				{ search ? (
					<span>
						{ copy.noResultsLabel ||
							__( 'No galleries match your search.', 'easy-lightbox-wp' ) }
					</span>
				) : (
					<>
						<strong>
							{ copy.emptyTitle || __( 'No galleries yet.', 'easy-lightbox-wp' ) }
						</strong>
						<span>{ copy.emptyText }</span>
					</>
				) }
			</div>
		);
	}

	return (
		<>
			<table className="sp-shaped-gallery-manage__table">
				<thead>
					<tr>
						<th scope="col" className="sp-shaped-gallery-manage__cell--check">
							<input
								type="checkbox"
								checked={ allSelected }
								aria-label={ copy.selectAllLabel || __( 'Select all galleries', 'easy-lightbox-wp' ) }
								onChange={ ( event ) => onSelectAll( event.target.checked ) }
							/>
						</th>
						<th scope="col">{ columns.title || __( 'Title', 'easy-lightbox-wp' ) }</th>
						<th scope="col">{ columns.shortcode || __( 'Shortcode', 'easy-lightbox-wp' ) }</th>
						<th scope="col">{ columns.date || __( 'Date', 'easy-lightbox-wp' ) }</th>
						<th scope="col">{ columns.actions || __( 'Actions', 'easy-lightbox-wp' ) }</th>
					</tr>
				</thead>
				<tbody>
					{ items.map( ( gallery ) => (
						<GalleryRow
							key={ gallery.id }
							gallery={ gallery }
							copy={ copy }
							selected={ selected.has( gallery.id ) }
							onSelect={ onSelect }
							onDuplicate={ onDuplicate }
							onDelete={ onDelete }
							busy={ busy }
						/>
					) ) }
				</tbody>
			</table>

			{ totalPages > 1 && (
				<nav className="sp-shaped-gallery-manage__pager" aria-label={ __( 'Galleries pagination', 'easy-lightbox-wp' ) }>
					<button
						type="button"
						className="sp-shaped-gallery-manage__page"
						onClick={ () => onPage( page - 1 ) }
						disabled={ page <= 1 }
					>
						{ __( 'Previous', 'easy-lightbox-wp' ) }
					</button>
					<span className="sp-shaped-gallery-manage__page-count">
						{ sprintf(
							/* translators: 1: current page, 2: total pages, 3: total galleries. */
							__( 'Page %1$d of %2$d (%3$d galleries)', 'easy-lightbox-wp' ),
							page,
							totalPages,
							total
						) }
					</span>
					<button
						type="button"
						className="sp-shaped-gallery-manage__page"
						onClick={ () => onPage( page + 1 ) }
						disabled={ page >= totalPages }
					>
						{ __( 'Next', 'easy-lightbox-wp' ) }
					</button>
				</nav>
			) }
		</>
	);
}

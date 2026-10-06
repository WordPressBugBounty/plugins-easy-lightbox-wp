/**
 * Ready Patterns — the main-area toolbar: sort, grid density, favourites, refresh.
 *
 * The sort control is deliberately NOT a styled `<select>`. A native select can
 * be given a border and a radius but not a custom chevron, and the reference
 * design draws the label and the chevron 16px apart inside a 36px pill. So the
 * pill is our own markup with the real `<select>` laid transparently over it at
 * `inset: 0` — the browser's own dropdown, its own keyboard handling and its own
 * accessibility tree, under a box we control. Nothing here re-implements a
 * listbox.
 */
import { __ } from '@wordpress/i18n';
import { memo } from '@wordpress/element';
import { COLUMN_OPTIONS, SORT } from './constants';
import { GridThreeColIcon, GridTwoColIcon } from './icons';

const SORT_OPTIONS = [
	{ value: SORT.DEFAULT, label: __( 'Sort By', 'easy-lightbox-wp' ) },
	{ value: SORT.POPULAR, label: __( 'Popular', 'easy-lightbox-wp' ) },
	{ value: SORT.LATEST, label: __( 'Latest', 'easy-lightbox-wp' ) },
];

const DENSITY_ICONS = {
	2: GridTwoColIcon,
	3: GridThreeColIcon,
};

/**
 * @param {Object}   props
 * @param {string}   props.sort              Active sort key.
 * @param {Function} props.onSortChange      Sort handler.
 * @param {string}   props.columns           Column count as a string.
 * @param {Function} props.onColumnsChange   Density handler.
 * @param {string}   props.resultCount       Patterns currently shown, as a phrase.
 * @param {number}   props.favoritesCount    Favourited pattern count.
 * @param {boolean}  props.showFavoritesOnly Whether the grid is filtered to favourites.
 * @param {Function} props.onToggleFavorites Favourites-only handler.
 * @param {Function} props.onRefresh         Refresh handler.
 * @param {boolean}  props.isRefreshing      Whether a refresh is in flight.
 * @return {JSX.Element} Toolbar.
 */
function Toolbar( {
	sort,
	onSortChange,
	columns,
	onColumnsChange,
	resultCount,
	favoritesCount,
	showFavoritesOnly,
	onToggleFavorites,
	onRefresh,
	isRefreshing,
} ) {
	const activeSortLabel =
		SORT_OPTIONS.find( ( option ) => option.value === sort )?.label ||
		__( 'Sort By', 'easy-lightbox-wp' );

	return (
		<div className="sp-shaped-patterns__toolbar">
			<div className="sp-shaped-patterns__toolbar-left">
				<div className="sp-shaped-patterns__sort">
					<span className="sp-shaped-patterns__sort-label">{ activeSortLabel }</span>
					<span className="dashicons dashicons-arrow-down-alt2 sp-shaped-patterns__sort-chevron" />
					<select
						className="sp-shaped-patterns__sort-select"
						value={ sort }
						onChange={ ( event ) => onSortChange( event.target.value ) }
						aria-label={ __( 'Sort patterns', 'easy-lightbox-wp' ) }
					>
						{ SORT_OPTIONS.map( ( option ) => (
							<option key={ option.value } value={ option.value }>
								{ option.label }
							</option>
						) ) }
					</select>
				</div>

				{ /* A live region: the count is the only feedback a search gives, and a
				     screen reader would otherwise hear nothing as results narrow. The
				     reference draws no count, but §14 asks for async results to be
				     announced, so it rides in the toolbar's own 12px gap rather than
				     costing the row any height. */ }
				<p className="sp-shaped-patterns__count" role="status" aria-live="polite">
					{ resultCount }
				</p>
			</div>

			<div className="sp-shaped-patterns__toolbar-actions">
				<div
					className="sp-shaped-patterns__density"
					role="group"
					aria-label={ __( 'Grid density', 'easy-lightbox-wp' ) }
				>
					{ COLUMN_OPTIONS.map( ( option ) => {
						const Glyph = DENSITY_ICONS[ option ];
						return (
							<button
								key={ option }
								type="button"
								className={ `sp-shaped-patterns__density-btn${
									columns === option ? ' is-active' : ''
								}` }
								aria-pressed={ columns === option }
								aria-label={ `${ option } ${ __( 'columns', 'easy-lightbox-wp' ) }` }
								onClick={ () => onColumnsChange( option ) }
							>
								<Glyph />
							</button>
						);
					} ) }
				</div>

				<button
					type="button"
					className={ `sp-shaped-patterns__favorites-btn${
						showFavoritesOnly ? ' is-active' : ''
					}` }
					aria-pressed={ showFavoritesOnly }
					aria-label={
						showFavoritesOnly
							? __( 'Show all patterns', 'easy-lightbox-wp' )
							: __( 'Show favourites only', 'easy-lightbox-wp' )
					}
					onClick={ onToggleFavorites }
				>
					<span className="dashicons dashicons-heart" />
					{ favoritesCount > 0 && (
						<span className="sp-shaped-patterns__favorites-count">{ favoritesCount }</span>
					) }
				</button>

				<button
					type="button"
					className={ `sp-shaped-patterns__refresh-btn${ isRefreshing ? ' is-refreshing' : '' }` }
					aria-label={ __( 'Refresh the pattern library', 'easy-lightbox-wp' ) }
					onClick={ onRefresh }
					disabled={ isRefreshing }
				>
					<span className="dashicons dashicons-update" />
				</button>
			</div>
		</div>
	);
}

export default memo( Toolbar );

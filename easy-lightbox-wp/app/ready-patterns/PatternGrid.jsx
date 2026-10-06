/**
 * Ready Patterns — the results grid, plus its loading and empty states.
 *
 * The filtered, sorted list arrives ready-made from `Library` (`./list.js`) and
 * this component only draws it. That is not a tidiness move: the preview header's
 * prev/next steps through the same list, and a grid that filtered privately would
 * have Next walking into patterns the active facets exclude (§18).
 */
import { __ } from '@wordpress/i18n';
import { memo } from '@wordpress/element';
import { isLocked } from './tier';
import PatternCard from './PatternCard';

/**
 * Skeleton cards while the first manifest lands.
 *
 * @param {Object} props
 * @param {string} props.columns Column count.
 * @return {JSX.Element} Skeleton grid.
 */
const Skeleton = memo( ( { columns } ) => (
	<div className={ `sp-shaped-patterns__grid is-cols-${ columns }` } aria-hidden="true">
		{ Array.from( { length: 9 } ).map( ( _, index ) => (
			<div className="sp-shaped-patterns__card is-skeleton" key={ index }>
				<div className="sp-shaped-patterns__card-thumb" />
				<div className="sp-shaped-patterns__card-body">
					<span className="sp-shaped-patterns__skeleton-line" />
					<span className="sp-shaped-patterns__skeleton-btn" />
				</div>
			</div>
		) ) }
	</div>
) );

/**
 * @param {Object}   props
 * @param {Array}    props.patterns         The rows to draw, already filtered and
 *                                          sorted by `Library`.
 * @param {string}   props.columns          Column count.
 * @param {boolean}  props.favoritesOnly    Whether the favourites toggle is on —
 *                                          the empty state says a different thing.
 * @param {Array}    props.favorites        Favourited ids as strings.
 * @param {boolean}  props.isLoading        Whether the first load is in flight.
 * @param {number}   props.insertingId      Pattern currently importing.
 * @param {Function} props.onInsert         Insert handler.
 * @param {Function} props.onPreview        Preview handler.
 * @param {Function} props.onToggleFavorite Favourite handler.
 * @return {JSX.Element} Grid.
 */
function PatternGrid( {
	patterns,
	columns,
	favoritesOnly,
	favorites,
	isLoading,
	insertingId,
	onInsert,
	onPreview,
	onToggleFavorite,
} ) {
	if ( isLoading ) {
		return <Skeleton columns={ columns } />;
	}

	if ( ! patterns.length ) {
		return (
			<div className="sp-shaped-patterns__state">
				<p className="sp-shaped-patterns__state-title">
					{ favoritesOnly
						? __( 'No favourites yet.', 'easy-lightbox-wp' )
						: __( 'No patterns match those filters.', 'easy-lightbox-wp' ) }
				</p>
				<p className="sp-shaped-patterns__state-body">
					{ favoritesOnly
						? __( 'Tap the heart on a pattern to keep it here.', 'easy-lightbox-wp' )
						: __( 'Try a different layout, category or search term.', 'easy-lightbox-wp' ) }
				</p>
			</div>
		);
	}

	return (
		<div className={ `sp-shaped-patterns__grid is-cols-${ columns }` } role="list">
			{ patterns.map( ( pattern ) => (
				<PatternCard
					key={ pattern.ID }
					pattern={ pattern }
					onInsert={ onInsert }
					onPreview={ onPreview }
					isInserting={ insertingId === pattern.ID }
					isBlocked={ !! insertingId && insertingId !== pattern.ID }
					isFavorite={ favorites.includes( String( pattern.ID ) ) }
					onToggleFavorite={ onToggleFavorite }
					isLocked={ isLocked( pattern ) }
				/>
			) ) }
		</div>
	);
}

export default memo( PatternGrid );

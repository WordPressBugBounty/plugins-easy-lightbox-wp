/**
 * Ready Patterns — one card: a framed 3:2 thumbnail with a hover Preview
 * overlay, then a single footer row of title + favourite + Insert.
 *
 * The footer is deliberately ONE row (the reference's), not a title-plus-subtitle
 * stack: the row is vertically centred against a 32px button, so a second line
 * under the title would push every card in the grid taller than its thumbnail
 * frame implies. The pattern's layout is already the sidebar's primary facet, so
 * nothing is lost by not restating it on each card.
 *
 * A premium pattern carries no PRO pill on its thumbnail: the locked CTA in the
 * footer already says "Get Pro", and two marks for the one fact read as clutter
 * rather than emphasis.
 */
import { __ } from '@wordpress/i18n';
import { memo } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { DownloadIcon, HeartIcon, HeartIconFull } from './icons';
import LockedCta from './LockedCta';

/**
 * @param {Object}   props
 * @param {Object}   props.pattern          Manifest row.
 * @param {Function} props.onInsert         Insert handler, receives the pattern.
 * @param {Function} props.onPreview        Preview handler, receives the pattern.
 * @param {boolean}  props.isInserting      Whether THIS pattern is importing.
 * @param {boolean}  props.isBlocked        Whether another import is in flight.
 * @param {boolean}  props.isFavorite       Whether it is favourited.
 * @param {Function} props.onToggleFavorite Favourite handler.
 * @param {boolean}  props.isLocked         Whether this build may insert it.
 * @return {JSX.Element} Card.
 */
function PatternCard( {
	pattern,
	onInsert,
	onPreview,
	isInserting,
	isBlocked,
	isFavorite,
	onToggleFavorite,
	isLocked,
} ) {
	const name = decodeEntities( pattern.name || '' );

	return (
		<article className="sp-shaped-patterns__card" role="listitem">
			<div className="sp-shaped-patterns__card-thumb">
				{ pattern.image ? (
					<img src={ pattern.image } alt={ name } loading="lazy" decoding="async" />
				) : (
					<span className="sp-shaped-patterns__card-thumb-placeholder" />
				) }

				{ /* The overlay is a real button so it is reachable by keyboard; the
				     hover treatment is presentation only. */ }
				<button
					type="button"
					className="sp-shaped-patterns__preview-link"
					onClick={ () => onPreview( pattern ) }
				>
					<span className="dashicons dashicons-visibility" />
					{ __( 'Preview', 'easy-lightbox-wp' ) }
				</button>
			</div>

			<div className="sp-shaped-patterns__card-body">
				<h3 className="sp-shaped-patterns__card-title" title={ name }>
					{ name }
				</h3>

				<button
					type="button"
					className={ `sp-shaped-patterns__favorite-btn${ isFavorite ? ' is-favorite' : '' }` }
					aria-pressed={ isFavorite }
					aria-label={
						isFavorite
							? `${ __( 'Remove from favourites', 'easy-lightbox-wp' ) }: ${ name }`
							: `${ __( 'Add to favourites', 'easy-lightbox-wp' ) }: ${ name }`
					}
					onClick={ () => onToggleFavorite( pattern.ID ) }
				>
					{ isFavorite ? <HeartIconFull /> : <HeartIcon /> }
				</button>

				{ isLocked ? (
					<LockedCta label={ __( 'Get Pro', 'easy-lightbox-wp' ) } />
				) : (
					<button
						type="button"
						className={ `sp-shaped-patterns__insert-btn${ isInserting ? ' is-busy' : '' }` }
						onClick={ () => onInsert( pattern ) }
						disabled={ isInserting || isBlocked }
					>
						{ isInserting
							? __( 'Inserting…', 'easy-lightbox-wp' )
							: __( 'Insert', 'easy-lightbox-wp' ) }
						{ isInserting ? (
							<span className="dashicons dashicons-update sp-shaped-patterns__spin" />
						) : (
							<DownloadIcon />
						) }
					</button>
				) }
			</div>
		</article>
	);
}

export default memo( PatternCard );

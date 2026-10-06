/**
 * The custom Media Library browser: fetches normalized MediaItem[] from
 * `GET /shaped-gallery/v1/media` (provider/type/month/search), renders the
 * selectable card grid, and paginates client-stop (load until a page returns
 * fewer than per_page). Replaces the native wp.media frame for browsing.
 */
import { __, sprintf, _n } from '@wordpress/i18n';
import { Spinner } from '@wordpress/components';
import MediaCard from './MediaCard';
import useMediaLibrary from './useMediaLibrary';
import { isSelected, resolveSelection } from './selection';

/**
 * @param {Object}           props
 * @param {Object}           props.source            Active source ({ provider, type }).
 * @param {string}           props.month             Month bucket filter.
 * @param {string}           props.search            Debounced search text.
 * @param {Array}            props.selected          Current selection (MediaItem[]).
 * @param {?(number|string)} props.anchorId          Range-select anchor id (or null).
 * @param {Function}         props.onSelectionChange Persist ( nextSelected, nextAnchorId ).
 * @param {number}           props.activeId          Item id shown in the details panel.
 * @param {Function}         props.onActivate        Set the details item.
 * @return {JSX.Element} Browser.
 */
export default function MediaLibraryBrowser( {
	source,
	month,
	search,
	selected,
	anchorId,
	onSelectionChange,
	activeId,
	onActivate,
} ) {
	// Browse results are cached at module scope (survive modal unmount/remount) and
	// invalidated on media CRUD via a shared wp.media subscription — see
	// ./useMediaLibrary. A warm key paints instantly with no spinner and no fetch.
	const { media, loading, error, hasMore, loadMore } = useMediaLibrary( {
		provider: source?.provider || 'media_library',
		type: source?.type || '',
		month,
		search,
	} );

	// Modifier-aware selection: resolve against the visible list (`media`) so
	// Shift-click can range within what's on screen, then hand the full next
	// selection + anchor back up.
	const onSelect = ( item, { range } = {} ) => {
		const result = resolveSelection( { selected, visible: media, item, anchorId, range } );
		onSelectionChange( result.selected, result.anchorId );
	};

	return (
		<div className="sp-shaped-gallery-media-modal__browser">
			{ error && <p className="sp-shaped-gallery-browser__error">{ error }</p> }

			{ ! error && media.length > 0 && (
				<div
					className="sp-shaped-gallery-mediagrid2"
					role="group"
					aria-label={ __( 'Media library', 'easy-lightbox-wp' ) }
				>
					{ media.map( ( item ) => (
						<MediaCard
							key={ item.id }
							item={ item }
							selected={ isSelected( selected, item.id ) }
							active={ activeId === item.id }
							onSelect={ onSelect }
							onActivate={ onActivate }
						/>
					) ) }
				</div>
			) }

			{ loading && (
				<div className="sp-shaped-gallery-browser__loading">
					<Spinner />
				</div>
			) }

			{ ! loading && ! error && 0 === media.length && (
				<p className="sp-shaped-gallery-browser__empty">{ __( 'No media found.', 'easy-lightbox-wp' ) }</p>
			) }

			{ hasMore && ! loading && (
				<div className="sp-shaped-gallery-browser__more">
					<button type="button" className="sp-shaped-gallery-btn sp-shaped-gallery-btn--secondary" onClick={ loadMore }>
						{ __( 'Load more', 'easy-lightbox-wp' ) }
					</button>
				</div>
			) }

			<div className="screen-reader-text" aria-live="polite">
				{ sprintf(
					/* translators: %d: number of media items shown. */
					_n( '%d item shown', '%d items shown', media.length, 'easy-lightbox-wp' ),
					media.length
				) }
			</div>
		</div>
	);
}

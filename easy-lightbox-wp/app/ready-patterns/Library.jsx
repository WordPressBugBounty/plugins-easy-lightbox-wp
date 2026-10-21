/**
 * Ready Patterns — the library modal.
 *
 * Built on the shared `Modal` (§6.7: it owns Escape, the focus trap, focus
 * restore and the scroll lock, and extending it beats hand-rolling an overlay —
 * which is what the Real Testimonials library this is modelled on does). The
 * preview drawer stacks on top and intercepts Escape on the capture phase so one
 * keypress never closes both.
 *
 * All filtering is client-side over the hardened manifest; the only server
 * conversations live in `usePatternLibrary`.
 */
import { __, sprintf, _n } from '@wordpress/i18n';
import { useCallback, useMemo, useState } from '@wordpress/element';
import { Modal } from '@shaped-gallery/components';
import { ShapedLogoMark } from '@shaped-gallery/icons';
import ErrorBoundary from './ErrorBoundary';
import PatternGrid from './PatternGrid';
import PreviewDrawer from './PreviewDrawer';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import usePatternLibrary from './usePatternLibrary';
import { SORT } from './constants';
import { stepIndex, visiblePatterns } from './list';
import { isLocked } from './tier';
import './editor.scss';

/**
 * @param {Object}   props
 * @param {Function} props.onClose         Close the library.
 * @param {string}   [props.initialLayout] Layout slug to preselect — the block
 *                                         toolbar passes the gallery's own, so
 *                                         the library opens on relevant work.
 * @return {JSX.Element} Library.
 */
export default function Library( { onClose, initialLayout = 'all' } ) {
	const {
		patterns,
		layouts,
		categories,
		favorites,
		isLoading,
		isRefreshing,
		insertingId,
		error,
		refresh,
		insert,
		toggleFavorite,
		dismissError,
	} = usePatternLibrary();

	const [ tier, setTier ] = useState( 'all' );
	const [ search, setSearch ] = useState( '' );
	const [ layout, setLayout ] = useState( initialLayout || 'all' );
	const [ category, setCategory ] = useState( 'all' );
	const [ favoritesOnly, setFavoritesOnly ] = useState( false );
	const [ sort, setSort ] = useState( SORT.DEFAULT );
	const [ columns, setColumns ] = useState( '3' );
	/*
	 * The preview holds an ID, not the row. The footer's Prev / Next steps through
	 * the VISIBLE list, so the drawer's position has to be looked up in that list
	 * anyway — and an id survives a Refresh replacing every object in the manifest,
	 * which a captured row would not.
	 */
	const [ previewId, setPreviewId ] = useState( null );

	const total = patterns.length;
	const proCount = useMemo( () => patterns.filter( ( item ) => item.pro ).length, [ patterns ] );

	/*
	 * One filtered, sorted list, computed here and handed to both consumers: the
	 * grid draws it, and the preview footer steps through it. Two passes would let
	 * Next walk into a pattern the active facets exclude (§18).
	 */
	const visible = useMemo(
		() =>
			visiblePatterns( patterns, {
				search,
				tier,
				layout,
				category,
				favoritesOnly,
				favorites,
				sort,
			} ),
		[ patterns, search, tier, layout, category, favoritesOnly, favorites, sort ]
	);

	const previewIndex = useMemo(
		() => ( null === previewId ? -1 : visible.findIndex( ( item ) => item.ID === previewId ) ),
		[ visible, previewId ]
	);
	const preview = 0 <= previewIndex ? visible[ previewIndex ] : null;

	const handlePreview = useCallback( ( item ) => setPreviewId( item.ID ), [] );

	const step = useCallback(
		( delta ) => {
			const next = stepIndex( previewIndex, delta, visible.length );
			if ( 0 <= next ) {
				setPreviewId( visible[ next ].ID );
			}
		},
		[ previewIndex, visible ]
	);

	/*
	 * Stable identities: the drawer binds its arrow-key shortcut to `document`,
	 * and a fresh callback every render would tear that listener down and rebuild
	 * it every render.
	 */
	const closePreview = useCallback( () => setPreviewId( null ), [] );
	const handlePrev = useCallback( () => step( -1 ), [ step ] );
	const handleNext = useCallback( () => step( 1 ), [ step ] );

	const layoutOptions = useMemo(
		() => [
			{ label: __( 'All layouts', 'easy-lightbox-wp' ), value: 'all', count: total },
			...layouts.map( ( entry ) => ( {
				label: entry.label,
				value: entry.value,
				count: entry.count,
			} ) ),
		],
		[ layouts, total ]
	);

	const categoryOptions = useMemo(
		() => [
			{ label: __( 'All categories', 'easy-lightbox-wp' ), value: 'all', count: total },
			...categories.map( ( entry ) => ( {
				label: entry.label,
				value: String( entry.value ),
				count: entry.count,
			} ) ),
		],
		[ categories, total ]
	);

	const handleInsert = useCallback(
		( pattern ) => {
			/*
			 * Belt to the server's braces. Nothing in the UI offers Insert for a
			 * premium pattern in this build ({@see ./tier.js}), but a Refresh can
			 * flip a row's `pro` flag between the render and the click — and the
			 * import would then come back refused, which reads as a broken button
			 * rather than as a paywall.
			 */
			if ( isLocked( pattern ) ) {
				return;
			}

			// The modal closes only once the blocks are actually in the canvas, so a
			// failed import still has somewhere to report itself.
			insert( pattern.ID, onClose );
		},
		[ insert, onClose ]
	);

	const countLabel = sprintf(
		/* translators: %d: number of patterns currently shown. */
		_n( '%d pattern', '%d patterns', visible.length, 'easy-lightbox-wp' ),
		visible.length
	);

	return (
		<Modal
			opened
			onClose={ onClose }
			className="sp-shaped-patterns"
			label={ __( 'Ready Patterns Library', 'easy-lightbox-wp' ) }
		>
			<ErrorBoundary onRetry={ refresh }>
				{ /*
				   The close control is the shared Modal's own (§6.7 — it owns Escape,
				   the focus trap and focus restore). It is absolutely positioned, and
				   `editor.scss` parks it inside this header's right-hand slot rather
				   than drawing a second X beside it.
				 */ }
				<header className="sp-shaped-patterns__header">
					<div className="sp-shaped-patterns__brand">
						<ShapedLogoMark />
						<h2 className="sp-shaped-patterns__title">
							{ __( 'Ready Patterns Library', 'easy-lightbox-wp' ) }
						</h2>
					</div>
					<div className="sp-shaped-patterns__header-actions" />
				</header>

				{ !! error && (
					<div className="sp-shaped-patterns__error" role="alert">
						<span>{ error }</span>
						<button type="button" onClick={ dismissError }>
							{ __( 'Dismiss', 'easy-lightbox-wp' ) }
						</button>
					</div>
				) }

				<div className="sp-shaped-patterns__body">
					<Sidebar
						tier={ tier }
						onTierChange={ setTier }
						tierCounts={ { all: total, free: total - proCount, pro: proCount } }
						search={ search }
						onSearchChange={ setSearch }
						layout={ layout }
						onLayoutChange={ setLayout }
						layoutOptions={ layoutOptions }
						category={ category }
						onCategoryChange={ setCategory }
						categoryOptions={ categoryOptions }
					/>

					<div className="sp-shaped-patterns__main">
						<Toolbar
							sort={ sort }
							onSortChange={ setSort }
							columns={ columns }
							onColumnsChange={ setColumns }
							resultCount={ countLabel }
							favoritesCount={ favorites.length }
							showFavoritesOnly={ favoritesOnly }
							onToggleFavorites={ () => setFavoritesOnly( ( value ) => ! value ) }
							onRefresh={ refresh }
							isRefreshing={ isRefreshing }
						/>

						<PatternGrid
							patterns={ visible }
							columns={ columns }
							favoritesOnly={ favoritesOnly }
							favorites={ favorites }
							isLoading={ isLoading }
							insertingId={ insertingId }
							onInsert={ handleInsert }
							onPreview={ handlePreview }
							onToggleFavorite={ toggleFavorite }
						/>
					</div>
				</div>

				{ preview && (
					<PreviewDrawer
						pattern={ preview }
						onClose={ closePreview }
						onInsert={ handleInsert }
						isInserting={ insertingId === preview.ID }
						index={ previewIndex }
						total={ visible.length }
						onPrev={ handlePrev }
						onNext={ handleNext }
					/>
				) }
			</ErrorBoundary>
		</Modal>
	);
}

/**
 * Saved Galleries — every reusable gallery, with its permanent shortcode.
 *
 * A dashboard route rather than a `WP_List_Table` screen: the design puts this table
 * inside the plugin's own chrome (header tabs, footer), which a list table cannot
 * render, and the row actions are REST calls the same screen already needs for
 * search and paging.
 *
 * **Two states, one screen.** Until the site has its first saved gallery there is no
 * table worth drawing, so the screen is the design's banner instead — the same card
 * the Dashboard uses, saying what a shortcode is for and offering the one action that
 * creates one. The moment a gallery exists the banner is gone for good and the
 * toolbar + table take the whole screen. `hasAny` — not `items.length` — is what
 * switches them: a search that matches nothing still has galleries behind it, and
 * answering that with "create your first gallery" would read as data loss. That case
 * is the table's own no-results row.
 *
 * This component owns only screen state — selection, the pending confirmation, the
 * notice. The data lives in useGalleries(); the copy in `DashboardConfig::manage()`.
 */
import { Notice, Spinner } from '@wordpress/components';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Modal } from '@shaped-gallery/components';
import { PlusIcon } from '@shaped-gallery/icons';
import { useConfig } from '../../ConfigContext';
import DashBanner from '../../components/DashBanner';
import DashCard from '../../components/DashCard';
import GalleryTable from './GalleryTable';
import Toolbar from './Toolbar';
import useGalleries from './useGalleries';

const CONFIRM_TITLE_ID = 'sp-shaped-gallery-manage-confirm-title';

/**
 * @return {JSX.Element} Page.
 */
export default function ManageGalleries() {
	const config = useConfig();
	const copy = config.manage || {};

	const {
		items,
		total,
		totalPages,
		page,
		search,
		loading,
		error,
		busy,
		hasAny,
		setPage,
		setSearch,
		remove,
		duplicate,
		bulk,
	} = useGalleries();

	const [ selected, setSelected ] = useState( () => new Set() );
	const [ bulkAction, setBulkAction ] = useState( '' );
	const [ confirm, setConfirm ] = useState( null );
	const [ notice, setNotice ] = useState( null );

	// A selection is a set of rows the user can see; a new page or search is a new set
	// of rows, so carrying it over would act on galleries scrolled out of sight.
	useEffect( () => {
		setSelected( new Set() );
	}, [ page, search ] );

	const toggleRow = useCallback( ( id, checked ) => {
		setSelected( ( previous ) => {
			const next = new Set( previous );
			if ( checked ) {
				next.add( id );
			} else {
				next.delete( id );
			}
			return next;
		} );
	}, [] );

	const selectAll = useCallback(
		( checked ) => setSelected( checked ? new Set( items.map( ( item ) => item.id ) ) : new Set() ),
		[ items ]
	);

	const fail = useCallback( () => {
		setNotice( { status: 'error', msg: __( 'That action could not be completed.', 'easy-lightbox-wp' ) } );
	}, [] );

	const duplicateOne = useCallback(
		( gallery ) => {
			setNotice( null );
			duplicate( gallery.id )
				.then( () =>
					setNotice( {
						status: 'success',
						msg: copy.duplicatedLabel || __( 'Gallery duplicated.', 'easy-lightbox-wp' ),
					} )
				)
				.catch( fail );
		},
		[ duplicate, copy.duplicatedLabel, fail ]
	);

	// Deletion is permanent — there is no Trash for this CPT — so it always confirms,
	// and the message says so plainly rather than offering an "undo" that does not exist.
	const askDelete = useCallback(
		( gallery ) =>
			setConfirm( {
				kind: 'single',
				id: gallery.id,
				message:
					copy.confirmDelete ||
					__(
						'Permanently delete this gallery? It will stop working everywhere its shortcode is used, and this cannot be undone.',
						'easy-lightbox-wp'
					),
			} ),
		[ copy.confirmDelete ]
	);

	const applyBulk = useCallback( () => {
		setNotice( null );

		if ( ! bulkAction || 0 === selected.size ) {
			setNotice( {
				status: 'warning',
				msg: copy.noSelection || __( 'Select at least one gallery first.', 'easy-lightbox-wp' ),
			} );
			return;
		}

		const ids = Array.from( selected );

		if ( 'delete' === bulkAction ) {
			setConfirm( {
				kind: 'bulk',
				action: bulkAction,
				ids,
				// The format string is PHP-sourced (falls back to an identical literal),
				// so the static placeholder check has nothing fixed to verify against.
				// eslint-disable-next-line @wordpress/valid-sprintf
				message: sprintf(
					copy.confirmBulkDelete ||
						/* translators: %d: number of selected galleries. */
						__(
							'Permanently delete %d selected galleries? They will stop working everywhere their shortcodes are used, and this cannot be undone.',
							'easy-lightbox-wp'
						),
					ids.length
				),
			} );
			return;
		}

		bulk( bulkAction, ids )
			.then( () => {
				setSelected( new Set() );
				setNotice( {
					status: 'success',
					msg: copy.duplicatedLabel || __( 'Gallery duplicated.', 'easy-lightbox-wp' ),
				} );
			} )
			.catch( fail );
	}, [ bulkAction, selected, bulk, copy.confirmBulkDelete, copy.noSelection, copy.duplicatedLabel, fail ] );

	const runConfirm = useCallback( () => {
		if ( ! confirm ) {
			return;
		}
		const pending = confirm;
		setConfirm( null );
		setNotice( null );

		const request =
			'bulk' === pending.kind ? bulk( pending.action, pending.ids ) : remove( pending.id );

		request
			.then( () => {
				setSelected( new Set() );
				setNotice( {
					status: 'success',
					msg: copy.deletedLabel || __( 'Gallery deleted.', 'easy-lightbox-wp' ),
				} );
			} )
			.catch( fail );
	}, [ confirm, bulk, remove, copy.deletedLabel, fail ] );

	return (
		<div className="sp-shaped-gallery-dash-page sp-shaped-gallery-manage">
			<h1 className="sp-shaped-gallery-dash-sr">
				{ copy.title || __( 'Saved Galleries', 'easy-lightbox-wp' ) }
			</h1>

			{ /* Notice is not a live region on its own — announce action results. */ }
			<div role="status" aria-live="polite">
				{ notice && (
					<Notice status={ notice.status } onRemove={ () => setNotice( null ) }>
						{ notice.msg }
					</Notice>
				) }
			</div>

			{ /*
			 * The first load is the only one with neither branch to fall back on:
			 * afterwards `hasAny` is settled and the table owns its own spinner. Showing
			 * the banner first and yanking it away once the count arrives would be worse
			 * than one beat of "loading".
			 */ }
			{ loading && ! hasAny && (
				<DashCard className="sp-shaped-gallery-manage__list">
					<div className="sp-shaped-gallery-manage__state" role="status">
						<Spinner />
						<span>
							{ copy.loadingLabel || __( 'Loading galleries…', 'easy-lightbox-wp' ) }
						</span>
					</div>
				</DashCard>
			) }

			{ ! loading && ! error && ! hasAny && (
				<DashBanner
					heading={
						copy.banner?.heading ||
						__( 'Create Reusable Saved Galleries', 'easy-lightbox-wp' )
					}
					description={ copy.banner?.description }
					artUrl={ copy.banner?.artUrl }
					artAlt={ copy.banner?.artAlt }
				>
					{ config.urls?.createGallery && (
						<a
							className="sp-shaped-gallery-dash-cta sp-shaped-gallery-dash-cta--primary"
							href={ config.urls.createGallery }
						>
							<span className="sp-shaped-gallery-dash-cta__icon" aria-hidden="true">
								<PlusIcon />
							</span>
							{ copy.banner?.ctaLabel ||
								__( 'Create a Saved Gallery', 'easy-lightbox-wp' ) }
						</a>
					) }
				</DashBanner>
			) }

			{ hasAny && (
				<>
					<DashCard className="sp-shaped-gallery-manage__bar">
						<Toolbar
							copy={ copy }
							createUrl={ config.urls?.createGallery }
							search={ search }
							onSearch={ setSearch }
							bulkAction={ bulkAction }
							onBulkChange={ setBulkAction }
							onApply={ applyBulk }
							busy={ busy }
						/>
					</DashCard>

					<DashCard className="sp-shaped-gallery-manage__list">
						<GalleryTable
							items={ items }
							copy={ copy }
							search={ search }
							selected={ selected }
							onSelect={ toggleRow }
							onSelectAll={ selectAll }
							onDuplicate={ duplicateOne }
							onDelete={ askDelete }
							loading={ loading }
							error={ error }
							busy={ busy }
							page={ page }
							totalPages={ totalPages }
							total={ total }
							onPage={ setPage }
						/>
					</DashCard>
				</>
			) }

			{ /*
			 * The load itself can fail before `hasAny` is known, and the banner is not
			 * the right answer to "the request broke" — so the error keeps its own
			 * branch, on the same card the table would have used.
			 */ }
			{ error && ! hasAny && (
				<DashCard className="sp-shaped-gallery-manage__list">
					<div
						className="sp-shaped-gallery-manage__state sp-shaped-gallery-manage__state--error"
						role="alert"
					>
						{ copy.errorLabel ||
							__( 'Could not load galleries. Please reload the page.', 'easy-lightbox-wp' ) }
					</div>
				</DashCard>
			) }

			<Modal
				opened={ !! confirm }
				onClose={ () => setConfirm( null ) }
				className="sp-shaped-gallery-manage-confirm"
				labelledBy={ CONFIRM_TITLE_ID }
			>
				<h2 id={ CONFIRM_TITLE_ID } className="sp-shaped-gallery-manage-confirm__title">
					{ copy.confirmDeleteTitle || __( 'Delete Gallery', 'easy-lightbox-wp' ) }
				</h2>
				<p className="sp-shaped-gallery-manage-confirm__text">{ confirm?.message }</p>
				<div className="sp-shaped-gallery-manage-confirm__actions">
					<button
						type="button"
						className="sp-shaped-gallery-manage-confirm__cancel"
						onClick={ () => setConfirm( null ) }
					>
						{ __( 'Cancel', 'easy-lightbox-wp' ) }
					</button>
					{ /* Names the actual, permanent consequence — not a repeat of the title. */ }
					<button
						type="button"
						className="sp-shaped-gallery-manage-confirm__confirm"
						onClick={ runConfirm }
					>
						{ __( 'Delete Permanently', 'easy-lightbox-wp' ) }
					</button>
				</div>
			</Modal>
		</div>
	);
}

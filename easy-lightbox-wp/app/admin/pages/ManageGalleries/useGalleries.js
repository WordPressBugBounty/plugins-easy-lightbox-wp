/**
 * Manage Galleries data layer — one hook owning the list query and its mutations.
 *
 * Kept out of the components so the screen stays declarative and the request
 * bookkeeping (stale-response guarding, page clamping after a delete) lives in one
 * testable place. Every call goes to `shaped-gallery/v1/galleries`, which is
 * `can_manage()`-gated server-side; nothing here decides permissions.
 */
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

const BASE = 'shaped-gallery/v1/galleries';

/**
 * Galleries per page. Matches the REST default; the endpoint caps at 100.
 *
 * @type {number}
 */
export const PER_PAGE = 20;

/**
 * List + mutate the stored galleries.
 *
 * @return {Object} List state and actions.
 */
export default function useGalleries() {
	const [ page, setPageState ] = useState( 1 );
	const [ search, setSearchState ] = useState( '' );
	const [ items, setItems ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ totalAll, setTotalAll ] = useState( 0 );
	const [ totalPages, setTotalPages ] = useState( 0 );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( false );
	const [ busy, setBusy ] = useState( false );

	// Monotonic ticket: a slow response for an old query must not overwrite a newer
	// one (type-ahead search makes that ordinary, not theoretical).
	const ticketRef = useRef( 0 );

	const load = useCallback( () => {
		const ticket = ticketRef.current + 1;
		ticketRef.current = ticket;

		setLoading( true );
		setError( false );

		return apiFetch( {
			path: addQueryArgs( BASE, { page, per_page: PER_PAGE, search } ),
		} )
			.then( ( response ) => {
				if ( ticket !== ticketRef.current ) {
					return;
				}
				setItems( Array.isArray( response?.items ) ? response.items : [] );
				setTotal( Number( response?.total || 0 ) );
				setTotalPages( Number( response?.totalPages || 0 ) );
				/*
				 * `totalAll` ignores the search term, which is the whole point: the
				 * screen chooses between its empty-state banner and the table on
				 * "does this site have galleries", not "did this query match any".
				 * Falling back to `total` keeps the hook working against an older
				 * server that does not send the field — with no search in play the
				 * two are equal anyway.
				 */
				setTotalAll(
					Number(
						undefined === response?.totalAll ? response?.total || 0 : response.totalAll
					)
				);
			} )
			.catch( () => {
				if ( ticket === ticketRef.current ) {
					setError( true );
					setItems( [] );
				}
			} )
			.finally( () => {
				if ( ticket === ticketRef.current ) {
					setLoading( false );
				}
			} );
	}, [ page, search ] );

	useEffect( () => {
		load();
	}, [ load ] );

	// Deleting the last row of the last page leaves the request pointing past the end.
	useEffect( () => {
		if ( ! loading && totalPages > 0 && page > totalPages ) {
			setPageState( totalPages );
		}
	}, [ loading, page, totalPages ] );

	// A new search always starts at page one — page 3 of the previous query is
	// meaningless for a different result set.
	const setSearch = useCallback( ( value ) => {
		setSearchState( value );
		setPageState( 1 );
	}, [] );

	const setPage = useCallback( ( value ) => setPageState( Math.max( 1, Number( value ) || 1 ) ), [] );

	/**
	 * Run a mutation, then refresh the list.
	 *
	 * @param {Object} request apiFetch options.
	 * @return {Promise<Object>} The mutation's response.
	 */
	const mutate = useCallback(
		( request ) => {
			setBusy( true );

			return apiFetch( request )
				.then( ( response ) => load().then( () => response ) )
				.finally( () => setBusy( false ) );
		},
		[ load ]
	);

	const remove = useCallback(
		( id ) => mutate( { path: `${ BASE }/${ Number( id ) }`, method: 'DELETE' } ),
		[ mutate ]
	);

	const duplicate = useCallback(
		( id ) => mutate( { path: `${ BASE }/${ Number( id ) }/duplicate`, method: 'POST' } ),
		[ mutate ]
	);

	const bulk = useCallback(
		( action, ids ) =>
			mutate( {
				path: `${ BASE }/bulk`,
				method: 'POST',
				data: { action, ids: ids.map( Number ) },
			} ),
		[ mutate ]
	);

	return {
		items,
		total,
		totalAll,
		/** Whether the site has any saved gallery at all, search notwithstanding. */
		hasAny: totalAll > 0,
		totalPages,
		page,
		search,
		loading,
		error,
		busy,
		setPage,
		setSearch,
		reload: load,
		remove,
		duplicate,
		bulk,
	};
}

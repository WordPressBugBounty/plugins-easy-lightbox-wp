/**
 * useMediaLibrary — module-cached loader for the custom Media Library browse
 * grid (`GET /shaped-gallery/v1/media`).
 *
 * The fetched MediaItem[] lives in a MODULE-LEVEL cache, not in component state,
 * so it survives the media modal unmounting and remounting. Reopening the modal
 * (or applying a layout to an empty gallery, which auto-opens it) then paints the
 * grid instantly from cache with zero network — killing the reload spinner. This
 * mirrors the existing module-singleton pattern in `useAttachmentDetails.js`
 * (`mediaGridPromise`).
 *
 * Cache correctness:
 * - Keyed by `version|provider|type|month|search` so every distinct query (source
 *   switch, month filter, debounced search) is its own bucket, and a bumped server
 *   `mediaVersion` (see src/Core/MediaCache.php) lands a fresh page load on brand
 *   new keys — old buckets become unreachable.
 * - In-session CRUD is reflected live by subscribing to core's global attachment
 *   collection (`wp.media.model.Attachments.all`): uploads clear the media_library
 *   buckets, deletes prune the id everywhere, metadata edits patch it in place.
 * - Per-key request de-duplication replaces the old `requestRef` stale-guard:
 *   a superseded response still safely writes its OWN key's bucket (keys never
 *   cross-contaminate) but only the current key touches loading/UI.
 */
import { useEffect, useReducer, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { __ } from '@wordpress/i18n';
import { normalizeAttachment } from './normalize';

const PER_PAGE = 40;
const MAX_KEYS = 12; // LRU cap on distinct query keys held at once.
const MAX_ITEMS_PER_KEY = 400; // Soft cap so a marathon "Load more" can't balloon one bucket.

/**
 * Cache of browse results, keyed by query. Insertion-ordered `Map` used as an
 * LRU (evict the head — least-recently-written — on overflow).
 *
 * @type {Map<string, { items: Array, lastPage: number, hasMore: boolean }>}
 */
const cache = new Map();

/**
 * In-flight requests, keyed by `${queryKey}#${page}`, so concurrent identical
 * fetches share one promise.
 *
 * @type {Map<string, Promise>}
 */
const inflight = new Map();

/**
 * Mounted-hook re-render callbacks. A cache mutation from a wp.media event fans
 * out to every live browser so the grid reflects the change immediately.
 *
 * @type {Set<Function>}
 */
const listeners = new Set();

/** Stable empty list so an empty render doesn't churn a new array identity. */
const EMPTY = [];

/**
 * Notify every mounted hook that the cache changed.
 *
 * @return {void}
 */
function emit() {
	listeners.forEach( ( fn ) => fn() );
}

/**
 * Current media version token, seeded from the localize payload. Baked into the
 * cache key so a server-side CRUD bump (new page load) invalidates automatically.
 *
 * @return {number|string} Version token (0 when unset).
 */
function mediaVersion() {
	const localize =
		( typeof window !== 'undefined' &&
			( window.shaped_gallery_data || window.shaped_gallery_admin ) ) ||
		{};
	return localize.mediaVersion ?? 0;
}

/**
 * Build the cache key for a query. Version first, provider second — the
 * invalidator relies on that positional layout.
 *
 * @param {Object} query          Query params.
 * @param {string} query.provider Provider id.
 * @param {string} query.type     Media type filter.
 * @param {string} query.month    Month bucket.
 * @param {string} query.search   Search text.
 * @return {string} Cache key.
 */
function buildKey( { provider, type, month, search } ) {
	return `${ mediaVersion() }|${ provider }|${ type }|${ month }|${ search }`;
}

/**
 * Write a bucket and enforce the LRU cap (delete-then-set keeps the touched key
 * at the tail; the head is the least-recently-written).
 *
 * @param {string} key   Cache key.
 * @param {Object} entry Bucket ({ items, lastPage, hasMore }).
 * @return {void}
 */
function writeEntry( key, entry ) {
	cache.delete( key );
	cache.set( key, entry );
	while ( cache.size > MAX_KEYS ) {
		cache.delete( cache.keys().next().value );
	}
}

/**
 * Fetch one page into the cache (no UI side effects). De-dupes identical
 * concurrent requests and appends or replaces per `replace`.
 *
 * @param {string}  key     Cache key the result belongs to.
 * @param {Object}  params  Query params ({ provider, type, month, search }).
 * @param {number}  page    1-based page to fetch.
 * @param {boolean} replace Replace the bucket (page 1) vs append (load more).
 * @return {Promise<void>} Resolves when the bucket is written.
 */
function fetchInto( key, params, page, replace ) {
	const dedupKey = `${ key }#${ page }`;
	if ( inflight.has( dedupKey ) ) {
		return inflight.get( dedupKey );
	}
	const promise = apiFetch( {
		path: addQueryArgs( '/shaped-gallery/v1/media', {
			...params,
			page,
			per_page: PER_PAGE,
		} ),
	} )
		.then( ( results ) => {
			const list = Array.isArray( results ) ? results : [];
			const prev = replace ? [] : cache.get( key )?.items || [];
			let items = replace ? list : [ ...prev, ...list ];
			// Soft per-key cap: stop persisting once a bucket grows huge.
			if ( items.length > MAX_ITEMS_PER_KEY ) {
				items = items.slice( 0, MAX_ITEMS_PER_KEY );
			}
			writeEntry( key, { items, lastPage: page, hasMore: list.length === PER_PAGE } );
			inflight.delete( dedupKey );
		} )
		.catch( ( err ) => {
			inflight.delete( dedupKey );
			throw err;
		} );
	inflight.set( dedupKey, promise );
	return promise;
}

/**
 * Drop an attachment id from every cached bucket (delete/destroy).
 *
 * @param {number|string} id Attachment id.
 * @return {void}
 */
function removeIdFromCache( id ) {
	let changed = false;
	cache.forEach( ( entry, key ) => {
		const items = entry.items.filter( ( item ) => item.id !== id );
		if ( items.length !== entry.items.length ) {
			cache.set( key, { ...entry, items } );
			changed = true;
		}
	} );
	if ( changed ) {
		emit();
	}
}

/**
 * Patch an attachment in every bucket that holds it (metadata change). Only
 * overwrites with meaningful values so a partially-loaded model can't erase good
 * data (e.g. dimensions/urls) already fetched from REST.
 *
 * @param {number|string} id   Attachment id.
 * @param {Object}        next Normalized MediaItem to merge in.
 * @return {void}
 */
function patchItemInCache( id, next ) {
	let changed = false;
	cache.forEach( ( entry, key ) => {
		let hit = false;
		const items = entry.items.map( ( item ) => {
			if ( item.id !== id ) {
				return item;
			}
			hit = true;
			const merged = { ...item };
			Object.keys( next ).forEach( ( field ) => {
				const value = next[ field ];
				if ( value !== undefined && value !== null && value !== '' && value !== 0 ) {
					merged[ field ] = value;
				}
			} );
			return merged;
		} );
		if ( hit ) {
			cache.set( key, { ...entry, items } );
			changed = true;
		}
	} );
	if ( changed ) {
		emit();
	}
}

/**
 * Clear every bucket for a provider (new upload — its date-DESC page position is
 * unknowable, so the next open refetches page 1 with it on top).
 *
 * @param {string} provider Provider id (e.g. 'media_library').
 * @return {void}
 */
export function invalidateProvider( provider ) {
	let changed = false;
	cache.forEach( ( _entry, key ) => {
		// key = version|provider|type|month|search
		if ( key.split( '|' )[ 1 ] === provider ) {
			cache.delete( key );
			changed = true;
		}
	} );
	if ( changed ) {
		emit();
	}
}

/**
 * Attach the wp.media invalidation subscription once. Retries on later hook
 * mounts because `wp.media` can load AFTER the modal (e.g. the standalone admin
 * editor), so the collection may not exist on the first attempt.
 *
 * @type {boolean}
 */
let mediaSubscribed = false;

/**
 * @return {void}
 */
function ensureMediaSubscription() {
	if ( mediaSubscribed ) {
		return;
	}
	const all = typeof window !== 'undefined' ? window.wp?.media?.model?.Attachments?.all : null;
	if ( ! all ) {
		return; // Not ready yet — a later mount will retry.
	}
	mediaSubscribed = true;

	// NOTE: we deliberately do NOT listen for the collection's `add` event to
	// detect uploads. `add` also fires whenever wp.media.attachment(id) lazily
	// creates a model (e.g. opening the details panel), which would spuriously
	// clear the browse cache mid-session. Uploads are unambiguous at their own
	// success callback, so they invalidate explicitly via invalidateProvider()
	// (see useWpUploader).

	// Metadata edit (alt/title/caption/description, regenerated geometry).
	all.on( 'change', ( model ) => {
		if ( model?.id ) {
			patchItemInCache( model.id, normalizeAttachment( model.toJSON() ) );
		}
	} );

	// Permanent delete / collection removal.
	const drop = ( model ) => {
		if ( model?.id ) {
			removeIdFromCache( model.id );
		}
	};
	all.on( 'remove', drop );
	all.on( 'destroy', drop );
}

/**
 * Media Library browse loader.
 *
 * @param {Object} query          Active query.
 * @param {string} query.provider Provider id.
 * @param {string} query.type     Media type filter ('' | 'image' | 'video').
 * @param {string} query.month    Month bucket ('' | YYYYMM).
 * @param {string} query.search   Debounced search text.
 * @return {{ media: Array, loading: boolean, error: string, hasMore: boolean,
 *           loadMore: Function, refresh: Function }} Loader state + controls.
 */
export default function useMediaLibrary( { provider, type, month, search } ) {
	const key = buildKey( { provider, type, month, search } );
	const [ loading, setLoading ] = useState( () => ! cache.has( key ) );
	const [ error, setError ] = useState( '' );
	const [ , bump ] = useReducer( ( count ) => count + 1, 0 );

	// Latest key, so a resolving fetch knows whether it still matches what the
	// component is showing before it touches loading/UI (stale-guard).
	const keyRef = useRef( key );
	keyRef.current = key;

	// Fresh closure every render so the loader always sees the current query; the
	// effects below call it through the ref, keeping their deps to just [key].
	const loadRef = useRef();
	loadRef.current = ( page, replace ) => {
		const fetchKey = key;
		setLoading( true );
		setError( '' );
		fetchInto( fetchKey, { provider, type, month, search }, page, replace )
			.then( () => {
				if ( fetchKey === keyRef.current ) {
					setLoading( false );
				}
				emit();
			} )
			.catch( () => {
				if ( fetchKey === keyRef.current ) {
					setError( __( 'Could not load media. Please try again.', 'easy-lightbox-wp' ) );
					setLoading( false );
				}
			} );
	};

	// Register for cross-cutting re-renders and (re)try the wp.media subscription.
	useEffect( () => {
		listeners.add( bump );
		ensureMediaSubscription();
		return () => {
			listeners.delete( bump );
		};
	}, [] );

	const entry = cache.get( key );
	const hasEntry = !! entry;

	// Fetch when the current key has no bucket. Depending on `hasEntry` (not just
	// `key`) makes this self-healing: if an invalidation clears the visible key
	// while mounted, the bucket disappears and this refetches page 1. A warm key
	// paints instantly (no fetch, no spinner); the in-flight guard prevents a
	// duplicate request.
	useEffect( () => {
		if ( cache.has( key ) ) {
			setLoading( false );
			setError( '' );
			return;
		}
		if ( inflight.has( `${ key }#1` ) ) {
			return;
		}
		loadRef.current( 1, true );
	}, [ key, hasEntry ] );

	const media = entry?.items || EMPTY;
	const hasMore = entry?.hasMore || false;
	// A cold, not-yet-errored key is about to fetch — treat as loading so the
	// grid shows the spinner instead of a one-render "No media found" flash.
	const isLoading = loading || ( ! entry && ! error );

	const loadMore = () => {
		loadRef.current( ( cache.get( key )?.lastPage || 1 ) + 1, false );
	};

	const refresh = () => {
		cache.delete( key );
		inflight.delete( `${ key }#1` );
		loadRef.current( 1, true );
	};

	return { media, loading: isLoading, error, hasMore, loadMore, refresh };
}

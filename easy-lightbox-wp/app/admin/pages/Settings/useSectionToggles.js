/**
 * The generic "no Save button — a flip IS the write" toggle grid.
 *
 * Shared by every settings section whose cards are bare switches (Modules,
 * Integrations): each owns one branch of `shaped_gallery_settings`, and this hook is
 * the one place a flip is written. The optimistic update keeps the switch instant; a
 * failed request rolls that ONE key back rather than leaving the grid claiming a
 * state the server never accepted.
 *
 * Only the flipped KEY is sent. `Settings::sanitize()` merges a partial write over
 * what is stored — and every branch sanitizer keeps the stored value for a key the
 * write omits — so one flip can disturb neither a sibling switch nor a sibling
 * panel's values, which matters here more than elsewhere because this control saves
 * without the user asking.
 *
 * Three rules keep the switch honest. Each exists because breaking it made a switch
 * flip back on by itself:
 *
 * 1. **One write at a time.** Every flip queues behind the last, because that merge
 *    is a read-modify-write on ONE option row: two requests in flight both read the
 *    pre-flip option, and whichever commits last silently reverts the other — in the
 *    database, while both responses answered 200 and both switches looked saved.
 *    Serialising here is what makes each write see the previous one's result.
 * 2. **A response is applied for its own key only, and only if still current.** A
 *    response reports the whole branch as of that request, so its copy of any other
 *    key is already stale; and a flip made while it was in flight has superseded it
 *    entirely. Painting either is how a just-flipped switch got pushed back.
 * 3. **Intent is read synchronously and outlives the panel.** The branch's state and
 *    its per-key sequence live in a module-level store, so two clicks in one tick
 *    cannot both see the pre-click value, a repeat of a value already asked for is
 *    dropped before any request is made, and selecting another settings section
 *    (which unmounts the grid) does not re-seed the switches from the page-load
 *    payload — the stale snapshot that made a saved switch come back on.
 */
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/** The option every dashboard panel writes into. */
const OPTION = 'shaped_gallery_settings';

/**
 * The tail of the write queue.
 *
 * One queue for every grid, not one per branch: the branches are keys of a single
 * option row, so two of them writing at once race exactly as two keys would.
 *
 * @type {Promise}
 */
let queue = Promise.resolve();

/**
 * Branch => the state its switches show, and the newest value each key has been
 * ASKED for. One map, because a second click has to see the first click's intent
 * rather than the last render's value — plus `seq`, which numbers those clicks so a
 * superseded write can be recognised and dropped.
 *
 * @type {Object<string,{state:Object<string,boolean>,seq:Object<string,number>}>}
 */
const store = {};

/**
 * The store for one branch, created on first use from what this browser knows: the
 * localized option, over what the plugin ships with.
 *
 * @param {string}                 branch  Option branch.
 * @param {Object<string,boolean>} shipped Key => shipped enabled state.
 * @return {Object} The branch's store.
 */
function branchStore( branch, shipped ) {
	if ( ! store[ branch ] ) {
		store[ branch ] = {
			state: {
				...shipped,
				...( window.shaped_gallery_admin?.settings?.[ branch ] || {} ),
			},
			seq: {},
		};
	}

	return store[ branch ];
}

/**
 * @param {string}                 branch              The option branch this grid owns (e.g. `modules`).
 * @param {Object<string,boolean>} shipped             Key => shipped enabled state.
 * @param {Object}                 [opts]
 * @param {Function}               [opts.onToggled]    Called once the server has CONFIRMED the
 *                                                     flip, with `( key, value )`. A toast fired
 *                                                     on the click would claim a save that may
 *                                                     still fail and roll back.
 * @param {string}                 [opts.errorMessage] Message shown when the write fails.
 * @return {Object} `{ enabled, status, isSaving, toggle }`.
 */
export default function useSectionToggles( branch, shipped, { onToggled, errorMessage } = {} ) {
	const shared = branchStore( branch, shipped );

	const [ enabled, setEnabled ] = useState( shared.state );
	const [ pending, setPending ] = useState( 0 );
	const [ status, setStatus ] = useState( null );

	// The callbacks arrive as fresh inline arrows every render; a ref keeps `toggle`
	// stable without capturing a stale one.
	const optsRef = useRef( { onToggled, errorMessage } );
	optsRef.current = { onToggled, errorMessage };

	/** Write one key, then reconcile the switch with what the server confirmed. */
	const write = useCallback(
		async ( key, next, previous, seq ) => {
			try {
				// Superseded while queued: the newer flip's own write is the one that
				// should reach the server, so this one is dropped instead of sent.
				if ( shared.seq[ key ] !== seq ) {
					return;
				}

				const response = await apiFetch( {
					path: '/wp/v2/settings',
					method: 'POST',
					data: { [ OPTION ]: { [ branch ]: { [ key ]: next } } },
				} );

				if ( shared.seq[ key ] !== seq ) {
					return;
				}

				// The server's copy wins, as everywhere else on this screen — for
				// this key alone (rule 2). A response carrying no branch (the
				// endpoint nulls a value its schema rejects) leaves the flip as made:
				// the write answered 200, so there is nothing to correct it with.
				const confirmed = response?.[ OPTION ]?.[ branch ];
				const value =
					confirmed && Object.prototype.hasOwnProperty.call( confirmed, key )
						? !! confirmed[ key ]
						: next;

				shared.state = { ...shared.state, [ key ]: value };
				setEnabled( shared.state );
				optsRef.current.onToggled?.( key, value );
			} catch ( error ) {
				// Superseded: the queued newer write decides this key now, and
				// reports its own outcome. Rolling back here would undo a click the
				// user has already made.
				if ( shared.seq[ key ] !== seq ) {
					return;
				}

				// This key alone. The whole-map rollback this replaced also undid
				// every flip made while the request was in flight.
				shared.state = { ...shared.state, [ key ]: previous };
				setEnabled( shared.state );
				setStatus( {
					type: 'error',
					message:
						error?.message ||
						optsRef.current.errorMessage ||
						__( 'Could not save the change. Please try again.', 'easy-lightbox-wp' ),
				} );
			} finally {
				setPending( ( count ) => count - 1 );
			}
		},
		[ branch, shared ]
	);

	const toggle = useCallback(
		( key, next ) => {
			const value = !! next;
			const previous = !! shared.state[ key ];

			// Duplicate: this key has already been asked for `value` — a repeated
			// change event, a double click on the same side of the switch, or a
			// re-render firing the handler again. Nothing to write.
			if ( previous === value ) {
				return;
			}

			const seq = ( shared.seq[ key ] || 0 ) + 1;
			shared.seq[ key ] = seq;
			shared.state = { ...shared.state, [ key ]: value };

			setEnabled( shared.state );
			setPending( ( count ) => count + 1 );
			setStatus( null );

			queue = queue.then( () => write( key, value, previous, seq ) );
		},
		[ shared, write ]
	);

	return { enabled, status, isSaving: pending > 0, toggle };
}

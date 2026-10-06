/**
 * A module panel's draft state, and the one place it is written.
 *
 * Same two-copy model as `useSettings` one level up — `saved` (what the server
 * last confirmed) and `draft` (what the user has changed) — because "dirty" is
 * what gates the panel's Save and Reset pair, and a Save that is always enabled
 * says nothing about whether there is anything to save.
 *
 * ## Persistence
 *
 * A module persists once it has a branch of `shaped_gallery_settings` with a sanitizer
 * of its own — the registry says which (`persist`). All three shipped panels do.
 * Without the flag the hook still works, it just keeps `saved`/`draft` in the
 * module-level cache and nothing leaves the browser: Save commits, Reset discards,
 * and a close/reopen finds the values where they were left.
 *
 * The write goes through core's `/wp/v2/settings`, like every other panel on this
 * screen — the option is registered with `show_in_rest` and that endpoint already
 * enforces `manage_options`, so no route of our own is needed (§9). Only this
 * module's branch is sent: the server merges a partial write over what is stored,
 * so two panels open at once cannot overwrite each other.
 *
 * The cache is module-level for the same reason `useSettings`' is: closing the
 * panel unmounts it, and without it an unsaved draft would silently revert on the
 * next open.
 */
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/** The option every dashboard panel writes into. */
const OPTION = 'shaped_gallery_settings';

/**
 * How long a success message stays on screen, in ms.
 *
 * Success is transient — it confirms something that already finished, and the
 * disabled Save behind it says the same thing for as long as it is true. An error
 * is NOT on a timer: it describes work still to be done, and its retry button is
 * right beside it.
 */
const SUCCESS_TIMEOUT = 2500;

/**
 * The message a successful save leaves in the panel.
 *
 * A function, not a constant: `__()` at module scope would run before the locale
 * data is set up and bake the English string in.
 *
 * @return {string} Translated message.
 */
const savedMessage = () => __( 'Settings saved.', 'easy-lightbox-wp' );

/** @type {Object<string,{saved:Object,draft:Object}>} Survives an unmount. */
const cache = {};

/**
 * The module's stored settings, as localized on page load.
 *
 * @param {string} moduleKey Module key.
 * @return {Object} Stored branch, or an empty object.
 */
function stored( moduleKey ) {
	const branch = window.shaped_gallery_admin?.settings?.[ moduleKey ];
	return branch && 'object' === typeof branch ? branch : {};
}

/**
 * Seed both copies the first time the module's panel opens.
 *
 * A persisted module seeds from the option (defaults filling any key the server
 * has not stored yet); an unpersisted one seeds from the shipped defaults alone.
 *
 * @param {string}  moduleKey Module key, e.g. 'lightbox'.
 * @param {Object}  defaults  The module's shipped option values.
 * @param {boolean} persist   Whether the module has a server-side branch.
 * @return {{saved:Object,draft:Object}} Initial state.
 */
function seed( moduleKey, defaults, persist ) {
	if ( ! cache[ moduleKey ] ) {
		const initial = persist ? { ...defaults, ...stored( moduleKey ) } : defaults;
		cache[ moduleKey ] = { saved: initial, draft: initial };
	}
	return cache[ moduleKey ];
}

/**
 * @param {string}  moduleKey Module key, e.g. 'lightbox'.
 * @param {Object}  defaults  The module's shipped option values.
 * @param {boolean} [persist] Whether Save writes to the server.
 * @return {Object} `{ draft, isDirty, isSaving, status, set, commit, revert }`.
 */
export default function useModuleDraft( moduleKey, defaults, persist = false ) {
	const initial = seed( moduleKey, defaults, persist );
	const [ saved, setSaved ] = useState( initial.saved );
	const [ draft, setDraft ] = useState( initial.draft );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ status, setStatus ] = useState( null );
	const timer = useRef( null );

	// Serialised compare, not a key-by-key one: several options are nested objects
	// (icon style, the toolbar, the custom icon), and every value here is plain JSON.
	const isDirty = useMemo(
		() => JSON.stringify( draft ) !== JSON.stringify( saved ),
		[ draft, saved ]
	);

	/**
	 * The ONE way status is written, so a pending auto-dismiss can never outlive the
	 * message it was scheduled for — every writer cancels the previous timer first.
	 * Without that, editing an option seconds after a save would blank the error the
	 * NEXT save just produced.
	 *
	 * @param {?Object} next Status object, or null to clear.
	 */
	const report = useCallback( ( next ) => {
		if ( timer.current ) {
			clearTimeout( timer.current );
			timer.current = null;
		}

		setStatus( next );

		if ( 'success' === next?.type ) {
			timer.current = setTimeout( () => {
				timer.current = null;
				setStatus( null );
			}, SUCCESS_TIMEOUT );
		}
	}, [] );

	// Closing the drawer unmounts this; a timer still holding a `setStatus` would
	// then fire against a dead component.
	useEffect(
		() => () => {
			if ( timer.current ) {
				clearTimeout( timer.current );
			}
		},
		[]
	);

	/** Write one option into the draft. */
	const set = useCallback(
		( key, value ) => {
			report( null );
			setDraft( ( previous ) => {
				const next = { ...previous, [ key ]: value };
				cache[ moduleKey ] = { saved: cache[ moduleKey ]?.saved ?? next, draft: next };
				return next;
			} );
		},
		[ moduleKey, report ]
	);

	/**
	 * Accept the draft as the panel's new baseline, persisting it when the module
	 * has somewhere to persist to.
	 *
	 * Saving never closes the panel (that is the close button's job alone), so the
	 * outcome has to be visible in the panel itself: a message beside the button,
	 * and a Save that falls back to disabled because `saved` now equals `draft`.
	 * Either message is cleared by the next `set()`, which is also what re-enables
	 * Save.
	 *
	 * Only a module that really persisted says so — an unpersisted one commits its
	 * baseline and reports nothing, because "Settings saved." would be a claim about
	 * a write that never left the browser. Its disabled Save is the honest cue.
	 *
	 * @return {Promise<boolean>} Whether the write succeeded.
	 */
	const commit = useCallback( async () => {
		if ( ! persist ) {
			cache[ moduleKey ] = { saved: draft, draft };
			setSaved( draft );
			report( null );
			return true;
		}

		setIsSaving( true );
		report( null );

		try {
			const response = await apiFetch( {
				path: '/wp/v2/settings',
				method: 'POST',
				data: { [ OPTION ]: { [ moduleKey ]: draft } },
			} );

			// The server's copy wins: a value its sanitizer clamped or rejected must
			// be what the panel shows, not what was chosen.
			const confirmed = {
				...defaults,
				...( response?.[ OPTION ]?.[ moduleKey ] || {} ),
			};
			cache[ moduleKey ] = { saved: confirmed, draft: confirmed };
			setSaved( confirmed );
			setDraft( confirmed );
			report( { type: 'success', message: savedMessage() } );
			return true;
		} catch ( error ) {
			// The draft is left alone, so the panel stays dirty and Save stays enabled:
			// a failed write must be retryable without the user re-choosing anything.
			report( {
				type: 'error',
				message: error?.message || __( 'Could not save these settings.', 'easy-lightbox-wp' ),
			} );
			return false;
		} finally {
			setIsSaving( false );
		}
	}, [ draft, defaults, moduleKey, persist, report ] );

	/** Discard the draft, back to the last committed values. */
	const revert = useCallback( () => {
		cache[ moduleKey ] = { saved, draft: saved };
		setDraft( saved );
		report( null );
	}, [ saved, moduleKey, report ] );

	return { draft, isDirty, isSaving, status, set, commit, revert };
}

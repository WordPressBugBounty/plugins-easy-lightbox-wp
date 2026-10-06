/**
 * The Settings screen's draft state, and the one place it is written.
 *
 * Every panel holds two copies of the option: `saved` (what the server last
 * confirmed) and `draft` (what the user has typed). "Dirty" is the difference
 * between them, which is what gates Save and Reset — the same shape the sibling
 * plugin's Settings panels use.
 *
 * Persisted through core's `/wp/v2/settings`, not a route of our own: the option is
 * registered with `show_in_rest`, and that endpoint already enforces
 * `manage_options` on the write. The server's response is treated as authoritative
 * rather than the submitted draft, so a value the sanitizer clamped or rejected
 * shows up in the form immediately.
 *
 * The cache below is module-level on purpose. Selecting another section unmounts
 * the panel, and without it an unsaved draft would silently revert to the
 * page-load snapshot when the user came back.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

const OPTION = 'shaped_gallery_settings';

/**
 * How long a success message stays on screen, in ms.
 *
 * Matches the module drawer's own timeout ({@see modulePanels/useModuleDraft}), for
 * the same reason: success confirms something that already finished, and the
 * disabled Save behind it keeps saying so for as long as it stays true. An error is
 * NOT on a timer — it describes work still to be done, with its retry button right
 * beside it.
 */
const SUCCESS_TIMEOUT = 2500;

/**
 * The shape the screen writes. Mirrors Settings::defaults() in PHP — the server
 * still decides what is valid, this only keeps every control mounted before the
 * first save.
 *
 * @type {Object}
 */
export const SETTINGS_DEFAULTS = {
	cleanupOnDeletion: false,
	cacheTimeout: 24,
	browserCaching: true,
	debugPerformance: false,
	retinaImages: true,
};

/** @type {?Object} Survives a panel unmount; see the note above. */
let cache = null;

/**
 * The patch that restores a panel's own rows to the plugin's shipped defaults.
 *
 * Scoped to `keys`, and that scoping is the whole point rather than tidiness: several
 * panels can share ONE draft (see the cache above), so an unscoped "restore everything"
 * from one panel would blank rows another panel owns and never mentions.
 *
 * A key with no shipped default is skipped rather than written as `undefined`, which
 * would look like a change and enable Save for a value nothing can restore. `clearCache`
 * is excluded for free — it is an action row, so it never appears in `keys`.
 *
 * @param {string[]} keys     The settings keys this panel renders.
 * @param {Object}   defaults Shipped defaults from PHP (`Settings::screen_defaults()`).
 * @return {Object} `{ key: defaultValue }` for every key that has one.
 */
export function defaultsPatch( keys, defaults ) {
	const source = { ...SETTINGS_DEFAULTS, ...( defaults || {} ) };

	return Object.fromEntries(
		( keys || [] )
			.filter( ( key ) => undefined !== source[ key ] )
			.map( ( key ) => [ key, source[ key ] ] )
	);
}

/**
 * Whether a draft already matches a patch, i.e. whether applying it would change
 * anything.
 *
 * What gates "Reset to Default", and it is compared against the DEFAULTS rather than
 * against what was last saved. Gating it on `isDirty` like Save — which is what the
 * shared actions row does by default — made the button unreachable in exactly the case
 * it exists for: a site that has saved a non-default value and has no unsaved edits.
 *
 * @param {Object} draft Current draft.
 * @param {Object} patch Patch from defaultsPatch().
 * @return {boolean} True when the draft already equals the patch.
 */
export function matchesPatch( draft, patch ) {
	return Object.keys( patch ).every( ( key ) => draft[ key ] === patch[ key ] );
}

/**
 * Seed both copies from the localized option the first time a panel mounts.
 *
 * @param {Object} settings Localized `shaped_gallery_admin.settings`.
 * @return {{saved: Object, draft: Object}} Initial state.
 */
function seed( settings ) {
	if ( cache ) {
		return cache;
	}
	const merged = { ...SETTINGS_DEFAULTS, ...( settings || {} ) };
	cache = { saved: merged, draft: merged };
	return cache;
}

/**
 * Whether two settings objects differ on any of the given keys.
 *
 * @param {Object}   a    First.
 * @param {Object}   b    Second.
 * @param {string[]} keys Keys to compare.
 * @return {boolean} True when they differ.
 */
function differs( a, b, keys ) {
	return keys.some( ( key ) => a[ key ] !== b[ key ] );
}

/**
 * `ownKeys` is the per-panel write isolation §6.9 asks for: when several panels share
 * ONE draft (see the cache note above), a panel that writes every key also writes the
 * other panels' values — from its own page-load snapshot. Omitting it keeps the old
 * write-everything behaviour, so a caller that passes nothing is unaffected.
 *
 * @param {Object}   settings  Localized settings, used only to seed the first mount.
 * @param {string[]} [ownKeys] The settings keys this panel owns.
 * @return {Object} `{ draft, isDirty, isSaving, status, set, apply, save, reset }`.
 */
export default function useSettings( settings, ownKeys ) {
	const initial = seed( settings );
	const [ saved, setSaved ] = useState( initial.saved );
	const [ draft, setDraft ] = useState( initial.draft );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ status, setStatus ] = useState( null );
	const timer = useRef( null );

	const keys = useMemo(
		() => ( Array.isArray( ownKeys ) && ownKeys.length ? ownKeys : Object.keys( SETTINGS_DEFAULTS ) ),
		[ ownKeys ]
	);

	const isDirty = useMemo( () => differs( draft, saved, keys ), [ draft, saved, keys ] );

	/**
	 * The ONE way status is written, so a pending auto-dismiss can never outlive the
	 * message it was scheduled for — every writer cancels the previous timer first.
	 * Without that, typing in a field seconds after a save would blank the error the
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

	// Selecting another section unmounts this panel; a timer still holding a
	// `setStatus` would then fire against a dead component.
	useEffect(
		() => () => {
			if ( timer.current ) {
				clearTimeout( timer.current );
			}
		},
		[]
	);

	/** Write one key into the draft. */
	const set = useCallback( ( key, value ) => {
		report( null );
		setDraft( ( previous ) => {
			const next = { ...previous, [ key ]: value };
			cache = { saved: cache?.saved || next, draft: next };
			return next;
		} );
	}, [ report ] );

	/**
	 * Merge several keys into the draft in ONE update.
	 *
	 * Not a loop of `set()` calls: four sequential state updates would each schedule a
	 * render and each write the module-level cache from a stale closure, so the last one
	 * would win and the first three would be lost.
	 */
	const apply = useCallback(
		( patch ) => {
			report( null );
			setDraft( ( previous ) => {
				const next = { ...previous, ...patch };
				cache = { saved: cache?.saved || next, draft: next };
				return next;
			} );
		},
		[ report ]
	);

	const save = useCallback( async () => {
		setIsSaving( true );
		report( null );

		try {
			// ONLY this PANEL's own keys. The option also carries the Modules grid's
			// switches and each wired module's settings — and, if another panel shares
			// this draft, its fields too. All of them are edited elsewhere and would
			// otherwise be written back as they were at page load.
			// `Settings::sanitize()` merges a partial write over what is stored, which
			// is exactly what makes this safe.
			const mine = Object.fromEntries( keys.map( ( key ) => [ key, draft[ key ] ] ) );

			const response = await apiFetch( {
				path: '/wp/v2/settings',
				method: 'POST',
				data: { [ OPTION ]: mine },
			} );

			// The server's copy wins: a clamped timeout or a rejected script must be
			// what the form shows, not what was typed.
			const confirmed = { ...SETTINGS_DEFAULTS, ...( response?.[ OPTION ] || {} ) };

			/*
			 * `saved` takes the server's whole answer — it is the record of what is
			 * stored, and the response is authoritative for every key including the ones
			 * this panel did not send.
			 *
			 * `draft` takes it only for the keys this panel OWNS. The other panel may
			 * hold an unsaved edit in the shared draft, and replacing it wholesale would
			 * silently discard that edit on a save the user made somewhere else.
			 */
			const mineConfirmed = Object.fromEntries( keys.map( ( key ) => [ key, confirmed[ key ] ] ) );
			const nextDraft     = { ...draft, ...mineConfirmed };

			cache = { saved: confirmed, draft: nextDraft };
			setSaved( confirmed );
			setDraft( nextDraft );
			report( { type: 'success', message: __( 'Settings saved.', 'easy-lightbox-wp' ) } );
		} catch ( error ) {
			report( {
				type: 'error',
				message: error?.message || __( 'Could not save the settings.', 'easy-lightbox-wp' ),
			} );
		} finally {
			setIsSaving( false );
		}
	}, [ draft, keys, report ] );

	/** Discard THIS panel's draft edits, back to what the server last confirmed. */
	const reset = useCallback( () => {
		const restored = { ...draft, ...Object.fromEntries( keys.map( ( key ) => [ key, saved[ key ] ] ) ) };
		cache = { saved, draft: restored };
		setDraft( restored );
		report( null );
	}, [ draft, keys, saved, report ] );

	return { draft, isDirty, isSaving, status, set, apply, save, reset };
}

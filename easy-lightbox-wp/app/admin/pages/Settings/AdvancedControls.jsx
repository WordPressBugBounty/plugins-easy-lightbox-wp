/**
 * Advanced Controls panel (Figma node 523:18707).
 *
 * A divider-separated list of rows, each one a title + description on the left and
 * a single control on the right. Copy and row ORDER come from PHP
 * (`DashboardConfig::settings_page()`); the control each row carries is decided
 * here, by `CONTROLS` — the same split the section rail uses one level up, so a
 * filter can reword or reorder a row but never conjure a control for a key the
 * panel does not know.
 *
 * Each row's `key` is also the settings key it writes, so the rows and the option
 * cannot drift: a row whose key is not in the settings shape has no control to
 * render and is dropped.
 *
 * `Clean-up Data on Deletion` is the one row that is gated behind a dialog, and only
 * in the ON direction. It stores nothing destructive by itself — `uninstall.php` is
 * what eventually reads it — but it is the switch that decides whether deleting the
 * plugin also deletes the site's galleries, so arming it is a deliberate act and
 * cancelling leaves the box exactly as it was. Turning it back OFF is the safe
 * direction and asks nothing.
 *
 * The dialog seeds the DRAFT rather than writing the option: every other control on
 * this panel is persisted by the one Save button below, and a row that quietly wrote
 * itself to the server would be the only place on the screen where a click was already
 * final. So the confirmation is about intent, and Save is still what stores it.
 *
 * It renders INSIDE the row it belongs to — {@link ConfirmPopover} anchors under the
 * checkbox — rather than as a centred modal over the screen. The question is about one
 * row, so answering it should not mean losing the row: the box, its description and the
 * consequence all stay in one glance, and dismissing the panel leaves the eye where it
 * already was.
 *
 * `Clear Cache` is the one row that is not a value: it POSTs to `/cache/purge` and
 * holds nothing, so it is excluded from the draft by the `isValueRow` check below and
 * cannot make the panel dirty. Its looping, status timer and unmount cleanup come from
 * the shared {@link BatchAction} control, because this is an interaction against a
 * server that works in batches (§6.7).
 *
 * **Reset to Default means what it says.** It writes the plugin's shipped values for
 * THIS panel's rows into the draft, and Save then persists them — the same two-step every
 * other control on the screen follows, so a mis-click is undone by navigating away rather
 * than by another write. Three things make it correct rather than merely present:
 *
 * - It is scoped to the rows this panel renders. Advanced Controls and Additional
 *   CSS & JS share one draft, so an unscoped restore here would blank an administrator's
 *   Custom CSS and JS from a button that never mentions them.
 * - The values come from PHP (`Settings::screen_defaults()`), not from the JS mirror
 *   that keeps controls mounted before the first save. Treating the mirror as
 *   authoritative would mean a default changed server-side kept restoring the old one.
 * - It is enabled by comparison with the DEFAULTS, not with what was last saved. The
 *   shared actions row gates Reset on `isDirty` by default, which left this button
 *   disabled in exactly the case it exists for: a saved non-default value and no
 *   unsaved edits — i.e. every site that had ever pressed Save.
 */
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { BatchAction, CheckboxControl, Toggle } from '@shaped-gallery/components';
import { useConfig } from '../../ConfigContext';
import ConfirmPopover from './ConfirmPopover';
import SettingsActions from './SettingsActions';
import useSettings, {
	SETTINGS_DEFAULTS,
	defaultsPatch,
	matchesPatch,
} from './useSettings';

/**
 * What each row renders. A row keyed to a settings key reads and writes it; an
 * `action` row is a button and holds no value.
 *
 * @type {Object<string,{type:string,min?:number,max?:number}>}
 */
/**
 * A number field's value, as a number.
 *
 * `event.target.value` is a string, and the setting is registered as an integer —
 * a string would be coerced server-side but would also make the draft look dirty
 * against an identical stored number ('24' !== 24). Empty stays empty so the field
 * can be cleared; the sanitizer folds it up to the minimum on save.
 *
 * @param {string} value Raw input value.
 * @return {(number|string)} Integer, or '' for an empty field.
 */
function toNumber( value ) {
	if ( '' === value ) {
		return '';
	}
	const parsed = Math.trunc( Number( value ) );
	return Number.isFinite( parsed ) ? parsed : '';
}

/** The cache-flush route. Batched server-side, so one click may take several calls. */
const PURGE_PATH = '/shaped-gallery/v1/cache/purge';

/** Names the confirmation dialog for assistive technology (`aria-labelledby`). */
const CONFIRM_TITLE_ID = 'sp-shaped-gallery-settings-confirm-title';

const CONTROLS = {
	cleanupOnDeletion: { type: 'checkbox', confirmOn: true },
	cacheTimeout: { type: 'number', min: 1, max: 720 },
	browserCaching: { type: 'toggle' },
	clearCache: { type: 'action' },
	debugPerformance: { type: 'toggle' },
	retinaImages: { type: 'toggle' },
};

/**
 * @return {JSX.Element} Panel.
 */
export default function AdvancedControls() {
	const { settingsPage, settings, defaults } = useConfig();
	const advanced = settingsPage.advanced || {};
	const rows = ( advanced.rows || [] ).filter( ( row ) => !! CONTROLS[ row?.key ] );

	/*
	 * The panel's key set, derived from the rows actually RENDERED so there is no second
	 * declaration to keep in step: a row's `key` already is its settings key, and the
	 * `clearCache` action row is excluded for free by having no settings home.
	 *
	 * It does two jobs — what Reset restores, and what Save is allowed to write — and
	 * they have to be the same list, or the button would restore a value the panel then
	 * refused to persist.
	 */
	const ownKeys = useMemo(
		() => rows.filter( ( row ) => row.key in SETTINGS_DEFAULTS ).map( ( row ) => row.key ),
		[ rows ]
	);

	const resetPatch = useMemo( () => defaultsPatch( ownKeys, defaults ), [ ownKeys, defaults ] );

	const { draft, isDirty, isSaving, status, set, apply, save } = useSettings(
		settings,
		ownKeys
	);

	const isDefault = matchesPatch( draft, resetPatch );

	/*
	 * The settings key a confirmation dialog is currently open for, or null.
	 *
	 * A key rather than a boolean so the dialog belongs to the PANEL and not to one
	 * row: a second row that ever needs arming gets it by adding `confirmOn` to its
	 * entry in CONTROLS, with no second piece of state and no second dialog.
	 */
	const [ confirming, setConfirming ] = useState( null );
	const confirmCopy = advanced.confirm || {};

	/**
	 * A checkbox row's change.
	 *
	 * The value is written straight through EXCEPT when the row is marked `confirmOn`
	 * and this change would move it to that value — then nothing is written and the
	 * dialog opens instead. That asymmetry is the point: arming a destructive setting
	 * asks, disarming it does not.
	 *
	 * @param {string}  key  Settings key.
	 * @param {boolean} next Requested value.
	 */
	const requestChange = ( key, next ) => {
		if ( next === CONTROLS[ key ]?.confirmOn ) {
			setConfirming( key );
			return;
		}
		set( key, next );
	};

	/** Apply the change the open dialog is asking about, then close it. */
	const acceptConfirm = () => {
		if ( confirming ) {
			set( confirming, CONTROLS[ confirming ].confirmOn );
		}
		setConfirming( null );
	};

	return (
		<div className="sp-shaped-gallery-settings__panel sp-shaped-gallery-settings__panel--rows">
			{ rows.map( ( row ) => {
				const control = CONTROLS[ row.key ];
				const titleId = `sp-shaped-gallery-settings-row-${ row.key }`;
				const isValueRow = row.key in SETTINGS_DEFAULTS;

				return (
					<div className="sp-shaped-gallery-settings__row" key={ row.key }>
						<div className="sp-shaped-gallery-settings__row-text">
							<h3 className="sp-shaped-gallery-settings__row-title" id={ titleId }>
								{ row.title }
							</h3>
							{ row.description && (
								<p className="sp-shaped-gallery-settings__row-desc">
									{ row.description }
								</p>
							) }
						</div>

						<div
							className={ `sp-shaped-gallery-settings__row-control${
								confirming === row.key ? ' has-confirm' : ''
							}` }
						>
							{ 'number' === control.type && isValueRow && (
								<>
									<input
										className="sp-shaped-gallery-settings__field"
										type="number"
										inputMode="numeric"
										min={ control.min }
										max={ control.max }
										value={ draft[ row.key ] }
										disabled={ isSaving }
										aria-labelledby={ titleId }
										onChange={ ( event ) =>
											set( row.key, toNumber( event.target.value ) )
										}
									/>
									{ row.unit && (
										<span className="sp-shaped-gallery-settings__field-unit">
											{ row.unit }
										</span>
									) }
								</>
							) }

							{ 'checkbox' === control.type && isValueRow && (
								<>
									{ /*
									 * `labelledBy` rather than a hidden label: the row's
									 * own <h3> above already says these words, so pointing
									 * the box at it names the control without putting the
									 * same text on the page twice.
									 */ }
									<CheckboxControl
										labelledBy={ titleId }
										checked={ !! draft[ row.key ] }
										disabled={ isSaving }
										onChange={ ( next ) => requestChange( row.key, next ) }
									/>

									{ confirming === row.key && (
										<ConfirmPopover
											titleId={ CONFIRM_TITLE_ID }
											title={
												confirmCopy.title ||
												__( 'Are you sure?', 'easy-lightbox-wp' )
											}
											message={
												confirmCopy.message ||
												__(
													'Deleting the plugin will permanently remove all ShapedGallery data, including galleries, settings and caches. Nothing is removed now, and this cannot be undone.',
													'easy-lightbox-wp'
												)
											}
											confirmLabel={
												confirmCopy.confirm ||
												__( 'Enable Clean-up', 'easy-lightbox-wp' )
											}
											cancelLabel={
												confirmCopy.cancel ||
												__( 'Cancel', 'easy-lightbox-wp' )
											}
											onConfirm={ acceptConfirm }
											onCancel={ () => setConfirming( null ) }
										/>
									) }
								</>
							) }

							{ 'toggle' === control.type && isValueRow && (
								<Toggle
									label={ row.title }
									hideLabel
									checked={ !! draft[ row.key ] }
									onChange={ ( next ) => set( row.key, next ) }
								/>
							) }

							{ 'action' === control.type && row.action && (
								<BatchAction
									path={ PURGE_PATH }
									label={ row.action }
									busyLabel={
										row.busyLabel ||
										__( 'Clearing…', 'easy-lightbox-wp' )
									}
									doneLabel={ __(
										'Gallery cache cleared.',
										'easy-lightbox-wp'
									) }
									errorLabel={ __(
										'Could not clear the gallery cache.',
										'easy-lightbox-wp'
									) }
									wrapperClass="sp-shaped-gallery-settings__action-row"
									className="sp-shaped-gallery-settings__button sp-shaped-gallery-settings__button--accent sp-shaped-gallery-settings__button--compact"
									statusClass="sp-shaped-gallery-settings__action-status"
								/>
							) }
						</div>
					</div>
				);
			} ) }

			<SettingsActions
				onSave={ save }
				onReset={ () => apply( resetPatch ) }
				isDirty={ isDirty }
				isSaving={ isSaving }
				status={ status }
				resetLabel={ advanced.resetLabel || __( 'Reset to Default', 'easy-lightbox-wp' ) }
				resetDisabled={ isDefault }
			/>
		</div>
	);
}

/**
 * The Save / Reset pair every editable Settings section ends with.
 *
 * Save is gated on the draft being dirty, which is what makes the screen honest: a
 * Save that is always enabled says nothing about whether there is anything to save.
 *
 * Reset defaults to the same gate — right for a "Reset Changes" button, which by
 * definition has nothing to do when there are none. A panel whose button restores
 * shipped DEFAULTS answers a different question ("does this differ from default?") and
 * passes `resetDisabled` to say so: gating that on `isDirty` made it unreachable in the
 * exact case it exists for, a site holding a saved non-default value with no unsaved
 * edits.
 *
 * The result is announced through a live region rather than only recoloured, so
 * the outcome of a save is not conveyed by appearance alone (§14).
 */
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}   props
 * @param {Function} props.onSave          Save handler.
 * @param {Function} props.onReset         Reset handler.
 * @param {boolean}  props.isDirty         Whether the draft differs from what is stored.
 * @param {boolean}  props.isSaving        Whether a write is in flight.
 * @param {?Object}  [props.status]        `{ type, message }` from the last attempt.
 * @param {string}   [props.saveLabel]     Override for the Save label.
 * @param {string}   [props.resetLabel]    Override for the Reset label.
 * @param {boolean}  [props.resetDisabled] Override for whether Reset is disabled.
 *                                         Defaults to Save's own gate.
 * @return {JSX.Element} Actions row.
 */
export default function SettingsActions( {
	onSave,
	onReset,
	isDirty,
	isSaving,
	status,
	saveLabel,
	resetLabel,
	resetDisabled,
} ) {
	const resetOff =
		undefined === resetDisabled ? ! isDirty || isSaving : resetDisabled || isSaving;

	return (
		<div className="sp-shaped-gallery-settings__actions">
			<button
				type="button"
				className="sp-shaped-gallery-settings__button sp-shaped-gallery-settings__button--accent"
				onClick={ onSave }
				disabled={ ! isDirty || isSaving }
			>
				{ isSaving
					? __( 'Saving…', 'easy-lightbox-wp' )
					: saveLabel || __( 'Save Changes', 'easy-lightbox-wp' ) }
			</button>

			<button
				type="button"
				className="sp-shaped-gallery-settings__button sp-shaped-gallery-settings__button--muted"
				onClick={ onReset }
				disabled={ resetOff }
			>
				{ resetLabel || __( 'Reset Changes', 'easy-lightbox-wp' ) }
			</button>

			<p
				className={ `sp-shaped-gallery-settings__status${
					status ? ` is-${ status.type }` : ''
				}` }
				role="status"
				aria-live="polite"
			>
				{ status?.message }
			</p>
		</div>
	);
}

/**
 * The Modules grid's on/off switches.
 *
 * Thin wrapper over the shared `useSectionToggles` (the `modules` branch, plus this
 * section's toast copy and error text) — see that hook for the save/rollback
 * contract.
 *
 * The toast is fired from `onToggled`, which the hook calls only once the server has
 * CONFIRMED the flip: "Modules has been saved." next to a switch that is about to
 * roll back is a claim about a write that never landed.
 */
import { __ } from '@wordpress/i18n';
import useSectionToggles from '../useSectionToggles';
import { toastSuccessMsg } from '../../../utils/toast';

/**
 * @param {Object<string,boolean>} shipped Module key => shipped enabled state.
 * @return {Object} `{ enabled, status, isSaving, toggle }`.
 */
export default function useModuleToggles( shipped ) {
	return useSectionToggles( 'modules', shipped, {
		onToggled: () => toastSuccessMsg( __( 'Modules has been saved.', 'easy-lightbox-wp' ) ),
		errorMessage: __( 'Could not update the module. Please try again.', 'easy-lightbox-wp' ),
	} );
}

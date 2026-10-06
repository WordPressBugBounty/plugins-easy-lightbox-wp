/**
 * The panel a module's gear opens (Figma node 1274:103585) — a right-edge drawer:
 * a grey title bar carrying the module's mark, name and close, a scrolling options
 * body, and a footer with the module's own Reset / Save pair.
 *
 * Built on the shared `Modal` primitive rather than a hand-rolled overlay (§6.7): it
 * already owns Escape, the focus trap, focus restore, the body scroll lock and the
 * backdrop click, and it renders inline rather than in a portal, so the dashboard's
 * custom properties still reach it. Only the geometry is this screen's — the drawer
 * look is one class on that same panel, and the close button Modal already renders
 * is positioned into the title bar instead of a second X being added beside it.
 *
 * The shell owns the CHROME and the draft; the module's own component owns the rows.
 * That is what keeps a second module panel to one registry entry (see `index.js`).
 *
 * Save commits the draft; Reset discards it. Whether Save also writes through to
 * `shaped_gallery_settings` is the registry's `persist` flag — see `useModuleDraft`
 * for which modules have somewhere to persist to, and why the rest do not yet.
 *
 * **Save does not close the drawer**, on either outcome. Closing is the close
 * button's (or Escape's / the backdrop's) job alone, so a save is never also a
 * dismissal: a failed write keeps the draft on screen to retry, and a successful
 * one leaves the user where they were, free to keep editing. That makes the footer
 * the only place the outcome can be reported, which is what the status line and the
 * Save button's own three states — enabled / “Saving…” / disabled — are for.
 */
import { __ } from '@wordpress/i18n';
import { Modal } from '@shaped-gallery/components';
import { MODULE_PANELS } from './registry';
import useModuleDraft from './useModuleDraft';

/**
 * @param {Object}   props
 * @param {Object}   props.module  The localized module item (`key`, `name`).
 * @param {Object}   [props.panel] The localized panel copy for that module.
 * @param {Function} props.onClose Close handler.
 * @return {(JSX.Element|null)} Drawer, or null for a module with no panel.
 */
export default function ModulePanel( { module, panel = {}, onClose } ) {
	const entry = MODULE_PANELS[ module?.key ];
	const { draft, isDirty, isSaving, status, set, commit, revert } = useModuleDraft(
		module?.key || '',
		entry?.defaults || {},
		!! entry?.persist
	);

	if ( ! entry ) {
		return null;
	}

	const { Icon, Options } = entry;
	const titleId = `sp-shaped-gallery-module-panel-title-${ module.key }`;

	// Guarded rather than only `disabled`: Enter on a focused control could re-fire
	// this mid-write, and a second POST would race the first one's confirmation.
	const save = () => {
		if ( isDirty && ! isSaving ) {
			commit();
		}
	};

	return (
		<Modal
			opened
			onClose={ onClose }
			className="sp-shaped-gallery-module-panel"
			labelledBy={ titleId }
		>
			<div className="sp-shaped-gallery-module-panel__head">
				<span className="sp-shaped-gallery-module-panel__mark">
					<Icon />
				</span>
				<h2 className="sp-shaped-gallery-module-panel__title" id={ titleId }>
					{ module.name }
				</h2>
			</div>

			<div className="sp-shaped-gallery-module-panel__body">
				<Options panel={ panel } draft={ draft } set={ set } />
			</div>

			<div className="sp-shaped-gallery-module-panel__foot">
				{ !! status && (
					<p
						className={ `sp-shaped-gallery-module-panel__status is-${ status.type }` }
						role={ 'error' === status.type ? 'alert' : 'status' }
					>
						{ status.message }
					</p>
				) }
				<button
					type="button"
					className="sp-shaped-gallery-settings__button sp-shaped-gallery-settings__button--muted sp-shaped-gallery-settings__button--lg"
					onClick={ revert }
					disabled={ ! isDirty || isSaving }
				>
					{ panel.resetLabel || __( 'Reset Changes', 'easy-lightbox-wp' ) }
				</button>
				<button
					type="button"
					className="sp-shaped-gallery-settings__button sp-shaped-gallery-settings__button--accent sp-shaped-gallery-settings__button--lg"
					onClick={ save }
					disabled={ ! isDirty || isSaving }
				>
					{ isSaving
						? __( 'Saving…', 'easy-lightbox-wp' )
						: panel.saveLabel || __( 'Save Changes', 'easy-lightbox-wp' ) }
				</button>
			</div>
		</Modal>
	);
}

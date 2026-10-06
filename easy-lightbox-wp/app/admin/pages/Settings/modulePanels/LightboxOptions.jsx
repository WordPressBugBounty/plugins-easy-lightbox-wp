/**
 * Lightbox module options (Figma node 1274:103585).
 *
 * The global counterpart to the block's Image Click Action panel: one titled group
 * of label-left / control-right rows, divider-separated, above the panel's Save /
 * Reset footer.
 *
 * Copy comes from PHP and the group is drawn by `ModuleOptionGroups`; this file is
 * the Lightbox-specific half — `CONTROLS`, which control each row carries. Both
 * rows are ordinary switches, so the renderers are the shared `SHARED_RENDERERS`
 * and this panel adds none of its own.
 *
 * Every row writes one key of the module draft (`useModuleDraft`), which the panel's
 * Save then persists to the `lightbox` branch of `shaped_gallery_settings`.
 */
import ModuleOptionGroups from './ModuleOptionGroups';
import { SHARED_RENDERERS } from './rowControls';

/**
 * The values the panel opens on — the state the design draws each control in.
 *
 * Mirrors `Modules\Lightbox::defaults()`; the server must agree or the first Save
 * would appear to change a setting the user never touched.
 *
 * @type {Object}
 */
export const LIGHTBOX_DEFAULTS = {
	closeOnOutsideClick: true,
	itemCounter: true,
};

/**
 * What each row renders. `type` picks the renderer from `SHARED_RENDERERS`. A row
 * key absent from this map is not rendered at all.
 *
 * @type {Object<string,{type:string}>}
 */
const CONTROLS = {
	closeOnOutsideClick: { type: 'toggle' },
	itemCounter: { type: 'toggle' },
};

/**
 * @param {Object}   props
 * @param {Object}   props.panel Localized panel copy (`groups`).
 * @param {Object}   props.draft Current draft.
 * @param {Function} props.set   Draft writer.
 * @return {JSX.Element} Options body.
 */
export default function LightboxOptions( { panel, draft, set } ) {
	return (
		<ModuleOptionGroups
			panel={ panel }
			controls={ CONTROLS }
			renderers={ SHARED_RENDERERS }
			draft={ draft }
			set={ set }
			defaults={ LIGHTBOX_DEFAULTS }
		/>
	);
}

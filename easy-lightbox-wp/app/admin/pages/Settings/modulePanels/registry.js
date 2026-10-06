/**
 * Module panels — the registry, and the only thing that decides which module's
 * gear opens something.
 *
 * Same contract as `SECTIONS` in `sections.js` and `ROUTES` in `routes.js`: the
 * openable set is fixed by which panels EXIST here, not by the localized copy, so a
 * filter that adds a module (or copy for a panel that was never built) can never
 * open an empty drawer. A module with no entry keeps the inert gear it has today.
 *
 * Each entry supplies the title-bar glyph, the options body and the values that body
 * opens on.
 */
import { LightboxModuleIcon } from '../icons';
import LightboxOptions, { LIGHTBOX_DEFAULTS } from './LightboxOptions';

/**
 * `persist` marks a module whose options have a branch of `shaped_gallery_settings`
 * with a sanitizer of their own — Save then writes through to the server. Without it
 * the panel is still fully usable, it just keeps its values in the browser (see
 * `useModuleDraft`).
 *
 * The shipped panel persists, and has a runtime reading its branch: the viewer.
 *
 * @type {Object<string,{Icon:Function,Options:Function,defaults:Object,persist?:boolean}>}
 */
export const MODULE_PANELS = {
	lightbox: {
		Icon: LightboxModuleIcon,
		Options: LightboxOptions,
		defaults: LIGHTBOX_DEFAULTS,
		persist: true,
	},
};

/**
 * Whether a module has a settings panel behind its gear.
 *
 * @param {string} key Module key.
 * @return {boolean} True when opening the gear shows something.
 */
export function hasModulePanel( key ) {
	return !! MODULE_PANELS[ key ];
}

/**
 * Settings sections — the registry, and the sub-route helpers that read it.
 *
 * Same contract as `app/admin/routes.js` one level up: the renderable set is fixed
 * by which panels exist, NOT by the localized copy, so a filtered-in section can
 * never select a panel with nothing behind it. Copy and ordering still come from
 * PHP (`DashboardConfig::settings_page()`); this file supplies the icon, the panel
 * and the fallback label.
 *
 * Sub-routes live in the hash as `#settings/<section>`. `parseHash()` in routes.js
 * splits on `/`, so the top-level router still resolves those to `settings`.
 */
import { __ } from '@wordpress/i18n';
import {
	AdvancedControlsIcon,
	IntegrationsIcon,
	ModulesIcon,
} from './icons';
import AdvancedControls from './AdvancedControls';
import Integrations from './Integrations';
import Modules from './Modules';

export const DEFAULT_SECTION = 'advanced-controls';

/**
 * Renderable sections, keyed by sub-route.
 *
 * `label` is the fallback only — PHP's copy wins when it ships a match.
 *
 * @type {Object<string,{label:string,Icon:Function,Panel:Function}>}
 */
export const SECTIONS = {
	[ DEFAULT_SECTION ]: {
		label: __( 'Advanced Controls', 'easy-lightbox-wp' ),
		Icon: AdvancedControlsIcon,
		Panel: AdvancedControls,
	},
	integrations: {
		label: __( 'Integrations', 'easy-lightbox-wp' ),
		Icon: IntegrationsIcon,
		Panel: Integrations,
	},
	modules: {
		label: __( 'Modules', 'easy-lightbox-wp' ),
		Icon: ModulesIcon,
		Panel: Modules,
	},
};

/**
 * The section key inside a location hash.
 *
 * @param {string} hash Location hash, with or without the leading '#'.
 * @return {string} A key from SECTIONS.
 */
export function parseSectionHash( hash = '' ) {
	const key = String( hash ).replace( /^#/, '' ).split( '/' )[ 1 ] || '';
	return SECTIONS[ key ] ? key : DEFAULT_SECTION;
}

/**
 * The rail items to render: PHP's order and labels, filtered to sections that
 * actually have a panel, with the registry supplying icon and panel.
 *
 * @param {Array<Object>} sections Localized `settingsPage.sections`.
 * @return {Array<Object>} `{ key, label, Icon, Panel }` in render order.
 */
export function resolveSections( sections = [] ) {
	const source = sections.length
		? sections
		: Object.keys( SECTIONS ).map( ( key ) => ( { key } ) );

	return source
		.filter( ( section ) => !! SECTIONS[ section?.key ] )
		.map( ( section ) => ( {
			...SECTIONS[ section.key ],
			key: section.key,
			label: section.label || SECTIONS[ section.key ].label,
		} ) );
}

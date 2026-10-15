/**
 * Modules panel.
 *
 * The same card grid as Integrations — Figma reuses one component for both — so it
 * renders through the shared `ModuleCard`. What differs is the mark (each module's
 * own full-bleed glyph, from `./icons`, rather than a brand logo on a CSS tint) and
 * the footer gear that modules with their own options carry.
 *
 * Copy and order come from PHP; `MODULES` here owns the two structural facts the
 * copy cannot state: the state the design draws each switch in, and whether the
 * module has an options screen to put a gear in front of.
 *
 * A gear whose module has a panel built (`hasModulePanel`, i.e. Lightbox) opens that
 * panel as a right-edge drawer; the rest stay inert, as every gear was before.
 *
 * The switches are REAL: each one writes the `modules` branch of
 * `shaped_gallery_settings` (see `useModuleToggles`), and the plugin's own gates read
 * it back through `ModuleRegistry::is_enabled()`.
 *
 * Under them, ShapedGallery Pro's modules as WP Carousel Free lists its own: a short
 * banner with an upgrade button, then each Pro module as the same card with a "PRO"
 * badge where the switch would be (`DashboardConfig::pro_modules()`). Those cards
 * have no switch and no gear, so they cannot reach `useModuleToggles` and open
 * nothing; the banner's upgrade button is their one live control.
 */
import { useState } from '@wordpress/element';
import { ProBadge, Toggle } from '@shaped-gallery/components';
import { ProCrownIcon } from '@shaped-gallery/icons';
import { useConfig } from '../../ConfigContext';
import ModuleCard from './ModuleCard';
import { ModulePanel, hasModulePanel, useModuleToggles } from './modulePanels';
import {
	ImageCustomUrlModuleMark,
	ImageProtectionModuleMark,
	LightboxModuleMark,
	ReadyPatternsModuleMark,
	WatermarkModuleMark,
} from './icons';

/**
 * `initial` mirrors `ModuleRegistry::MODULES` in PHP — the state a fresh install
 * draws each switch in, used only until the option has been written. `Mark` is the
 * card's tile glyph — each one is full-bleed art carrying its own background, so
 * `markClass` stays only for modules the design leaves without one.
 *
 * @type {Object<string,{initial:boolean,hasSettings:boolean,Mark:Function}>}
 */
const MODULES = {
	lightbox: { initial: true, hasSettings: true, Mark: LightboxModuleMark },
	'image-custom-url': { initial: true, hasSettings: false, Mark: ImageCustomUrlModuleMark },
	'ready-patterns': { initial: true, hasSettings: false, Mark: ReadyPatternsModuleMark },
};

/**
 * ShapedGallery Pro's modules this screen advertises — the tile glyph per key. Like
 * `MODULES`, a key PHP sends that is not here is not drawn, so a filter cannot
 * conjure a card with no art.
 *
 * @type {Object<string,{Mark:Function}>}
 */
const PRO_MODULES = {
	watermark: { Mark: WatermarkModuleMark },
	'image-protection': { Mark: ImageProtectionModuleMark },
};

const INITIAL_VALUES = Object.fromEntries(
	Object.entries( MODULES ).map( ( [ key, module ] ) => [ key, module.initial ] )
);

const TITLE_ID = 'sp-shaped-gallery-settings-modules-title';
const PRO_TITLE_ID = 'sp-shaped-gallery-settings-modules-pro-title';

/**
 * @return {JSX.Element} Panel.
 */
export default function Modules() {
	const { settingsPage } = useConfig();
	const modules = settingsPage.modules || {};
	const { enabled, status, toggle } = useModuleToggles( INITIAL_VALUES );
	// Which module's panel is open, by key. One at a time: it is a modal drawer.
	const [ openKey, setOpenKey ] = useState( '' );

	const items = ( modules.items || [] ).filter( ( item ) => !! MODULES[ item?.key ] );
	const openModule = items.find( ( item ) => item.key === openKey );

	const pro = modules.pro || {};
	const proItems = ( pro.items || [] ).filter( ( item ) => !! PRO_MODULES[ item?.key ] );

	return (
		<div className="sp-shaped-gallery-settings__panel sp-shaped-gallery-settings__panel--section">
			<div className="sp-shaped-gallery-settings__section-head">
				<h2 className="sp-shaped-gallery-settings__section-title" id={ TITLE_ID }>
					{ modules.title }
				</h2>
				{ modules.description && (
					<p className="sp-shaped-gallery-settings__section-desc">
						{ modules.description }
					</p>
				) }
				{ !! status && (
					<p
						className={ `sp-shaped-gallery-settings__status is-${ status.type }` }
						role="alert"
					>
						{ status.message }
					</p>
				) }
			</div>

			<ul className="sp-shaped-gallery-settings__modules" aria-labelledby={ TITLE_ID }>
				{ items.map( ( item ) => {
					const { Mark } = MODULES[ item.key ];

					return (
						<ModuleCard
							key={ item.key }
							name={ item.name }
							description={ item.description }
							markClass={ `is-${ item.key }` }
							mark={ <Mark /> }
							docsLabel={ modules.docsLabel }
							docsUrl={ item.url }
							docsAria={ item.docsAria }
							settingsAria={
								MODULES[ item.key ].hasSettings ? item.settingsAria : ''
							}
							onSettings={
								hasModulePanel( item.key )
									? () => setOpenKey( item.key )
									: undefined
							}
							toggle={
								<Toggle
									label={ item.name }
									hideLabel
									checked={ !! enabled[ item.key ] }
									onChange={ ( next ) => toggle( item.key, next ) }
								/>
							}
						/>
					);
				} ) }
			</ul>

			{ !! proItems.length && (
				<section className="sp-shaped-gallery-settings__pro" aria-labelledby={ PRO_TITLE_ID }>
					<div className="sp-shaped-gallery-settings__pro-banner">
						<div className="sp-shaped-gallery-settings__pro-copy">
							<h3 className="sp-shaped-gallery-settings__pro-title" id={ PRO_TITLE_ID }>
								{ pro.title }
							</h3>
							{ !! pro.description && (
								<p className="sp-shaped-gallery-settings__pro-desc">{ pro.description }</p>
							) }
						</div>
						{ !! pro.upgradeUrl && (
							<a
								className="sp-shaped-gallery-settings__pro-cta"
								href={ pro.upgradeUrl }
								target="_blank"
								rel="noopener noreferrer"
							>
								<ProCrownIcon size={ 16 } />
								{ pro.upgradeLabel }
							</a>
						) }
					</div>

					<ul className="sp-shaped-gallery-settings__modules" aria-labelledby={ PRO_TITLE_ID }>
						{ proItems.map( ( item ) => {
							const { Mark } = PRO_MODULES[ item.key ];

							return (
								<ModuleCard
									key={ item.key }
									name={ item.name }
									description={ item.description }
									markClass={ `is-${ item.key }` }
									mark={ <Mark /> }
									docsLabel={ modules.docsLabel }
									docsUrl={ item.url }
									docsAria={ item.docsAria }
									toggle={ <ProBadge label={ pro.badge || undefined } isInline /> }
								/>
							);
						} ) }
					</ul>
				</section>
			) }

			{ !! openModule && (
				<ModulePanel
					module={ openModule }
					panel={ ( modules.panels || {} )[ openModule.key ] || {} }
					onClose={ () => setOpenKey( '' ) }
				/>
			) }
		</div>
	);
}

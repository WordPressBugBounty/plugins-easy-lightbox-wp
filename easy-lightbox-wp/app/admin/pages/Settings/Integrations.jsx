/**
 * Integrations panel (Figma node 523:18875).
 *
 * A section heading over a card grid, one card per page builder: brand tile, name,
 * switch, description and a Docs link. Same split as the other sections — PHP owns
 * the copy, the order and the docs URL; `BUILDERS` here owns which keys the panel
 * can actually draw a mark for, so a filter cannot list a builder the bundle has no
 * logo for and get an empty tile.
 *
 * The switches are REAL: each one writes the `integrations` branch of
 * `shaped_gallery_settings` (see `useSectionToggles`) — same no-Save-button, save-on-flip
 * contract as the Modules grid. No page-builder compatibility layer reads the value
 * back yet; that is a separate, later change.
 */
import { __ } from '@wordpress/i18n';
import { Toggle } from '@shaped-gallery/components';
import { useConfig } from '../../ConfigContext';
import ModuleCard from './ModuleCard';
import useSectionToggles from './useSectionToggles';
import { toastSuccessMsg } from '../../utils/toast';
import {
	BeaverGlyph,
	BRICKS_LOGO,
	DiviGlyph,
	ElementorGlyph,
	OxygenGlyph,
	WPBakeryGlyph,
} from './brand-icons';

/**
 * Per-builder mark and starting state. The tile's brand colour is a CSS modifier
 * (`is-<key>`) rather than an inline style, so the palette stays in the stylesheet
 * with every other colour on the screen.
 *
 * Bricks is the exception the design forces: its mark is a full-bleed raster that
 * carries its own background, so it renders as an <img> and its tile paints nothing.
 *
 * @type {Object<string,{Glyph?:Function,image?:string,initial:boolean}>}
 */
const BUILDERS = {
	elementor: { Glyph: ElementorGlyph, initial: true },
	divi: { Glyph: DiviGlyph, initial: false },
	wpbakery: { Glyph: WPBakeryGlyph, initial: false },
	oxygen: { Glyph: OxygenGlyph, initial: false },
	beaver: { Glyph: BeaverGlyph, initial: false },
	bricks: { image: BRICKS_LOGO, initial: false },
};

const INITIAL_VALUES = Object.fromEntries(
	Object.entries( BUILDERS ).map( ( [ key, builder ] ) => [ key, builder.initial ] )
);

const TITLE_ID = 'sp-shaped-gallery-settings-integrations-title';

/**
 * @return {JSX.Element} Panel.
 */
export default function Integrations() {
	const { settingsPage } = useConfig();
	const integrations = settingsPage.integrations || {};
	const { enabled, status, toggle } = useSectionToggles( 'integrations', INITIAL_VALUES, {
		onToggled: () => toastSuccessMsg( __( 'Integration has been saved.', 'easy-lightbox-wp' ) ),
		errorMessage: __( 'Could not update the integration. Please try again.', 'easy-lightbox-wp' ),
	} );

	const items = ( integrations.items || [] ).filter( ( item ) => !! BUILDERS[ item?.key ] );

	return (
		<div className="sp-shaped-gallery-settings__panel sp-shaped-gallery-settings__panel--section">
			<div className="sp-shaped-gallery-settings__section-head">
				<h2 className="sp-shaped-gallery-settings__section-title" id={ TITLE_ID }>
					{ integrations.title }
				</h2>
				{ integrations.description && (
					<p className="sp-shaped-gallery-settings__section-desc">
						{ integrations.description }
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
					const { Glyph, image } = BUILDERS[ item.key ];

					return (
						<ModuleCard
							key={ item.key }
							name={ item.name }
							description={ item.description }
							markClass={ `is-${ item.key }` }
							mark={
								image ? (
									<img src={ image } alt="" width="24" height="24" />
								) : (
									<Glyph />
								)
							}
							docsLabel={ integrations.docsLabel }
							docsUrl={ item.url }
							docsAria={ item.docsAria }
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
		</div>
	);
}

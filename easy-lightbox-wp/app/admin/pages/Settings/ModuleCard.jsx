/**
 * The card the Integrations and Modules sections are both built from.
 *
 * Figma draws one "Module List" component and uses it on both screens, so this is
 * one component here too: mark, name, switch, clamped description, and a footer
 * carrying a Docs link and — on Modules only — a settings gear.
 *
 * The mark is a tile the caller paints with `markClass` and may fill with `mark`.
 * Most callers' glyphs are full-bleed art carrying their own background (every
 * module, plus Bricks among the integrations); `markClass` only still matters for
 * the handful of integrations whose brand glyph is a small mark on a CSS-tinted
 * tile, so it stays a class rather than an inline style.
 */
import { ModuleSettingsIcon } from './icons';
import { DocsIcon } from './brand-icons';

/**
 * @param {Object}   props
 * @param {string}   props.name           Module or integration name.
 * @param {string}   [props.description]  Body copy (clamped to three lines).
 * @param {string}   props.markClass      Modifier that paints the 24px tile.
 * @param {Node}     [props.mark]         Glyph rendered inside the tile.
 * @param {Node}     props.toggle         The switch, wired by the caller that owns the state.
 * @param {string}   [props.docsLabel]    Docs link label.
 * @param {string}   [props.docsUrl]      Docs URL; the link is dropped without one.
 * @param {string}   [props.docsAria]     Accessible name for the Docs link.
 * @param {string}   [props.settingsAria] Accessible name for the gear; no gear without it.
 * @param {Function} [props.onSettings]   Gear handler. Without one the gear is still
 *                                        drawn but inert — a module can carry the
 *                                        affordance before its panel exists.
 * @return {JSX.Element} Card.
 */
export default function ModuleCard( {
	name,
	description,
	markClass,
	mark,
	toggle,
	docsLabel,
	docsUrl,
	docsAria,
	settingsAria,
	onSettings,
} ) {
	return (
		<li className="sp-shaped-gallery-settings__module">
			<div className="sp-shaped-gallery-settings__module-head">
				<span className={ `sp-shaped-gallery-settings__module-mark ${ markClass }`.trim() }>
					{ mark }
				</span>
				<h3 className="sp-shaped-gallery-settings__module-name">{ name }</h3>
				{ toggle }
			</div>

			{ description && (
				<p className="sp-shaped-gallery-settings__module-desc">{ description }</p>
			) }

			<div className="sp-shaped-gallery-settings__module-foot">
				{ docsUrl && (
					<a
						className="sp-shaped-gallery-settings__module-docs"
						href={ docsUrl }
						target="_blank"
						rel="noreferrer"
						aria-label={ docsAria || undefined }
					>
						<DocsIcon />
						{ docsLabel }
					</a>
				) }
				{ settingsAria && (
					<button
						type="button"
						className="sp-shaped-gallery-settings__module-settings"
						aria-label={ settingsAria }
						onClick={ onSettings }
					>
						<ModuleSettingsIcon />
					</button>
				) }
			</div>
		</li>
	);
}

/**
 * About Us — an intro card over a cross-sell grid.
 *
 * Entirely data-driven from the localized config, so a white-label build re-skins
 * it through `shaped_gallery_dashboard_config` without touching the bundle.
 *
 * Two things the copy shape is doing deliberately. The heading is split into a
 * plain run and a highlighted tail, because the design marks only the last words
 * with a tinted underline. And each intro paragraph arrives as
 * `{ prefix, strong, rest }` rather than as a string with markup in it, so React
 * still escapes every part — see DashboardConfig::about().
 */
import { __ } from '@wordpress/i18n';
import { useConfig } from '../../ConfigContext';
import { ArrowUpRightIcon } from './icons';
import { RenoProductCategoryGlyph } from './plugin-logos';

const INTRO_ID = 'sp-shaped-gallery-dash-about-title';
const PLUGINS_ID = 'sp-shaped-gallery-dash-about-plugins-title';

/**
 * Marks that ship in the bundle, by plugin id.
 *
 * Only for a product whose mark the company's site does not publish as a standalone
 * icon; it takes precedence over the `logo` URL in the localized config. Every other
 * product carries a `logo` URL instead, and a product with neither renders no tile
 * at all rather than a placeholder — an initial in a coloured square looks like a
 * logo without being one.
 *
 * @type {Object<string,{Glyph: Function}>}
 */
const LOGOS = {
	woocategory: { Glyph: RenoProductCategoryGlyph },
};

/**
 * The mark to draw for a product, or null when it has none.
 *
 * @param {Object} plugin Localized plugin entry.
 * @return {?JSX.Element} Mark.
 */
function logoFor( plugin ) {
	const bundled = LOGOS[ plugin.id ];

	if ( bundled?.Glyph ) {
		const { Glyph } = bundled;
		return <Glyph />;
	}

	return plugin.logo ? <img src={ plugin.logo } alt="" width="48" height="48" loading="lazy" /> : null;
}

/**
 * @return {JSX.Element} Page.
 */
export default function AboutUs() {
	const { about } = useConfig();
	const plugins = about.plugins || [];
	const paragraphs = about.paragraphs || [];
	const image = about.image || {};

	return (
		<div className="sp-shaped-gallery-dash-page sp-shaped-gallery-about">
			<h1 className="sp-shaped-gallery-dash-sr">{ __( 'About Us', 'easy-lightbox-wp' ) }</h1>

			<section className="sp-shaped-gallery-about__intro" aria-labelledby={ INTRO_ID }>
				<div className="sp-shaped-gallery-about__text">
					<h2 className="sp-shaped-gallery-about__heading" id={ INTRO_ID }>
						{ about.heading }{ ' ' }
						{ about.headingHighlight && (
							<span className="sp-shaped-gallery-about__heading-mark">
								{ about.headingHighlight }
							</span>
						) }
					</h2>

					{ paragraphs.map( ( paragraph, index ) => (
						// eslint-disable-next-line react/no-array-index-key
						<p className="sp-shaped-gallery-about__para" key={ index }>
							{ paragraph.prefix }
							<strong>{ paragraph.strong }</strong>
							{ paragraph.rest }
						</p>
					) ) }

					<div className="sp-shaped-gallery-about__actions">
						{ about.primaryCta?.label && (
							<a
								className="sp-shaped-gallery-about__cta sp-shaped-gallery-about__cta--primary"
								href={ about.primaryCta.url }
							>
								{ about.primaryCta.label }
							</a>
						) }
						{ about.secondaryCta?.label && (
							<a
								className="sp-shaped-gallery-about__cta sp-shaped-gallery-about__cta--secondary"
								href={ about.secondaryCta.url }
								target="_blank"
								rel="noreferrer"
							>
								{ about.secondaryCta.label }
								<ArrowUpRightIcon />
							</a>
						) }
					</div>
				</div>

				{ image.url && (
					<figure className="sp-shaped-gallery-about__figure">
						<img
							className="sp-shaped-gallery-about__photo"
							src={ image.url }
							alt={ image.alt || '' }
							loading="lazy"
							decoding="async"
						/>
						{ image.caption && (
							<figcaption className="sp-shaped-gallery-about__caption">
								{ image.caption }
							</figcaption>
						) }
					</figure>
				) }
			</section>

			{ !! plugins.length && (
				<section
					className="sp-shaped-gallery-about__promo"
					aria-labelledby={ PLUGINS_ID }
				>
					<div className="sp-shaped-gallery-about__promo-head">
						<h2 className="sp-shaped-gallery-about__promo-title" id={ PLUGINS_ID }>
							{ about.pluginsTitle }
						</h2>
						{ about.pluginsSubtitle && (
							<p className="sp-shaped-gallery-about__promo-desc">
								{ about.pluginsSubtitle }
							</p>
						) }
					</div>

					<ul className="sp-shaped-gallery-about__grid">
						{ plugins.map( ( plugin ) => {
							const logo = logoFor( plugin );

							return (
								<li
									className="sp-shaped-gallery-about__plugin"
									key={ plugin.id || plugin.url }
								>
									<a
										className="sp-shaped-gallery-about__plugin-link"
										href={ plugin.url }
										target="_blank"
										rel="noreferrer"
									>
										{ logo && (
											<span className="sp-shaped-gallery-about__plugin-logo">
												{ logo }
											</span>
										) }
										<span className="sp-shaped-gallery-about__plugin-text">
											<span className="sp-shaped-gallery-about__plugin-name">
												{ plugin.name }
											</span>
											<span className="sp-shaped-gallery-about__plugin-desc">
												{ plugin.description }
											</span>
										</span>
										<span className="sp-shaped-gallery-about__plugin-go">
											<ArrowUpRightIcon />
										</span>
									</a>
								</li>
							);
						} ) }
					</ul>
				</section>
			) }
		</div>
	);
}

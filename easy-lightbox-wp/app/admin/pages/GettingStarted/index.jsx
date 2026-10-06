/**
 * Dashboard — the landing route, and deliberately just one card.
 *
 * The design reduced this screen to a single block-first banner: the plugin's job
 * here is to state what the block does and offer the two ways to start, not to be a
 * link directory. The layout showcase, the video tutorials and the whole right rail
 * (Ready Patterns promo, Documentation, Community, Important Links) were removed with
 * it — the outbound links they carried all live in the header's Help Center, which is
 * where the design puts them.
 *
 * Both CTAs open a new PAGE in the block editor — never the `shaped_gallery` post
 * type, whose product is a shortcode and which this card's own copy ("no shortcode
 * needed") promises to avoid. The shortcode flow lives on Saved Galleries. They
 * differ only in what greets you on that page:
 *
 * - "Create New Gallery" → the page arrives with one empty gallery block already in
 *   its content, and empty is what paints the layout picker (app/blocks/gallery/edit.jsx).
 * - "Use Ready Patterns" → the same page with nothing seeded, plus the arg that
 *   auto-opens the pattern library, which inserts a block of its own.
 *
 * Neither URL is built here — both are resolved by `GalleryEditor`, which owns the
 * seeding arg and the capability check, so this file cannot drift from it (§18). An
 * empty URL means the destination is unavailable and hides its own button.
 */
import { __ } from '@wordpress/i18n';
import { PatternsIcon, PlusIcon } from '@shaped-gallery/icons';
import { useConfig } from '../../ConfigContext';
import DashBanner from '../../components/DashBanner';

/**
 * @return {JSX.Element} Page.
 */
export default function GettingStarted() {
	const { hero } = useConfig();

	return (
		<div className="sp-shaped-gallery-dash-page">
			<h1 className="sp-shaped-gallery-dash-sr">{ __( 'Dashboard', 'easy-lightbox-wp' ) }</h1>

			<DashBanner
				heading={ hero.heading || __( 'Build Beautiful Galleries in Minutes', 'easy-lightbox-wp' ) }
				description={ hero.description }
				artUrl={ hero.artUrl }
				artAlt={ hero.artAlt }
			>
				{ hero.ctaUrl && (
					<a
						className="sp-shaped-gallery-dash-cta sp-shaped-gallery-dash-cta--primary"
						href={ hero.ctaUrl }
					>
						<span className="sp-shaped-gallery-dash-cta__icon" aria-hidden="true">
							<PlusIcon />
						</span>
						{ hero.ctaLabel || __( 'Create New Gallery', 'easy-lightbox-wp' ) }
					</a>
				) }

				{ hero.patternsUrl && (
					<a
						className="sp-shaped-gallery-dash-cta sp-shaped-gallery-dash-cta--secondary"
						href={ hero.patternsUrl }
					>
						<span className="sp-shaped-gallery-dash-cta__icon" aria-hidden="true">
							<PatternsIcon />
						</span>
						{ hero.patternsLabel || __( 'Use Ready Patterns', 'easy-lightbox-wp' ) }
					</a>
				) }
			</DashBanner>
		</div>
	);
}

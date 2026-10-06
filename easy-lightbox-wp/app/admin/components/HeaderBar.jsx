/**
 * HeaderBar — the full-bleed dashboard chrome: brand, version, nav, help menu.
 *
 * The brand is not a heading: each route owns the page's single `h1`, so the
 * screen name changes with the route instead of every route claiming
 * "ShapedGallery". The version pill is a plain `span` reading "V1.2.0" — there is
 * no changelog drawer to open, and a button with no target is a fake affordance.
 * It carries no icon: the version-history clock read as a changelog link.
 */
import { __, _x, sprintf } from '@wordpress/i18n';
import { ShapedGalleryDashboardLogoIcon } from '@shaped-gallery/icons';
import { useConfig } from '../ConfigContext';
import { resolveTabs } from '../routes';
import TabNav from './TabNav';
import HelpCenter from './HelpCenter';

/**
 * @param {Object}   props
 * @param {string}   props.route      Active route key.
 * @param {Function} props.onNavigate Route change handler.
 * @return {JSX.Element} Header.
 */
export default function HeaderBar( { route, onNavigate } ) {
	const config = useConfig();
	const tabs = resolveTabs( config );
	const brand = config.brand || __( 'ShapedGallery', 'easy-lightbox-wp' );

	return (
		<header className="sp-shaped-gallery-dash__header">
			<div className="sp-shaped-gallery-dash__header-inner">
				<div className="sp-shaped-gallery-dash__brand">
					<span className="sp-shaped-gallery-dash__logo" role="img" aria-label={ brand }>
						<ShapedGalleryDashboardLogoIcon />
					</span>

					{ config.version && (
						<span className="sp-shaped-gallery-dash__version">
							<span aria-hidden="true">
								{ sprintf(
									/* translators: %s: plugin version number, shown in the header pill as e.g. "V1.2.0". */
									_x( 'V%s', 'short version label', 'easy-lightbox-wp' ),
									config.version
								) }
							</span>
							<span className="sp-shaped-gallery-dash-sr">
								{ sprintf(
									/* translators: %s: plugin version number. */
									__( 'Version %s', 'easy-lightbox-wp' ),
									config.version
								) }
							</span>
						</span>
					) }
				</div>

				<TabNav items={ tabs } activeRoute={ route } onNavigate={ onNavigate } />

				<div className="sp-shaped-gallery-dash__header-end">
					<HelpCenter helpCenter={ config.helpCenter } />
				</div>
			</div>
		</header>
	);
}

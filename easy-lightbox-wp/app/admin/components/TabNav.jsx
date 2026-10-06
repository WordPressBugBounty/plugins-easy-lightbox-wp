/**
 * TabNav — the dashboard's primary navigation.
 *
 * A `nav` + `aria-current="page"`, deliberately NOT an ARIA tablist: one entry
 * ("Manage Layouts") leaves the SPA entirely, and a `role="tab"` must control a
 * `tabpanel`. Rendering every entry as a real anchor also keeps ⌘-click,
 * middle-click and "copy link address" working, which `<button>` tabs break.
 *
 * The active underline is a CSS `::after`, not a measured sliding indicator: the
 * design shows a static bar, and measurement would need resize and webfont
 * re-measure handling for no visible gain.
 */
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}   props
 * @param {Array}    props.items       Resolved tabs (see resolveTabs()).
 * @param {string}   props.activeRoute Current route key.
 * @param {Function} props.onNavigate  Called with a route key for in-SPA tabs.
 * @return {JSX.Element} Nav.
 */
export default function TabNav( { items, activeRoute, onNavigate } ) {
	return (
		<nav className="sp-shaped-gallery-dash-nav" aria-label={ __( 'ShapedGallery', 'easy-lightbox-wp' ) }>
			<ul className="sp-shaped-gallery-dash-nav__list">
				{ items.map( ( tab ) => {
					const isLink = 'link' === tab.type;
					const isActive = ! isLink && tab.key === activeRoute;

					return (
						<li key={ tab.key } className="sp-shaped-gallery-dash-nav__item">
							<a
								className={ `sp-shaped-gallery-dash-nav__link${
									isActive ? ' is-active' : ''
								}` }
								href={ isLink ? tab.url : `#${ tab.key }` }
								aria-current={ isActive ? 'page' : undefined }
								onClick={
									isLink
										? undefined
										: ( event ) => {
												event.preventDefault();
												onNavigate( tab.key );
										  }
								}
							>
								{ tab.label }
							</a>
						</li>
					);
				} ) }
			</ul>
		</nav>
	);
}

/**
 * TabNav — the dashboard's primary navigation.
 *
 * A `nav` + `aria-current="page"`, deliberately NOT an ARIA tablist: one entry
 * ("Manage Layouts") leaves the SPA entirely, and a `role="tab"` must control a
 * `tabpanel`. Rendering every entry as a real anchor also keeps ⌘-click,
 * middle-click and "copy link address" working, which `<button>` tabs break.
 *
 * The active underline is ONE bar that slides between tabs, as the sibling
 * dashboard (WP Carousel Free) does — a bar drawn on each active link can only
 * jump. It is measured, so it differs from that one in two places: it is placed
 * in a layout effect, before the first paint, so it does not slide in from the
 * left on load; and a ResizeObserver on the nav re-measures when the labels
 * change width (the webfont arriving, a translation), not only on window resize.
 */
import { __ } from '@wordpress/i18n';
import { useLayoutEffect, useRef, useState } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {Array}    props.items       Resolved tabs (see resolveTabs()).
 * @param {string}   props.activeRoute Current route key.
 * @param {Function} props.onNavigate  Called with a route key for in-SPA tabs.
 * @return {JSX.Element} Nav.
 */
export default function TabNav( { items, activeRoute, onNavigate } ) {
	const navRef = useRef( null );
	const linksRef = useRef( {} );
	// `null` until there is an active tab to underline. The bar is not rendered
	// then, so it first appears already in place rather than animating there.
	const [ bar, setBar ] = useState( null );
	const tabKeys = items.map( ( tab ) => tab.key ).join( ' ' );

	useLayoutEffect( () => {
		const nav = navRef.current;
		if ( ! nav ) {
			return undefined;
		}

		const place = () => {
			const link = linksRef.current[ activeRoute ];
			if ( ! link ) {
				setBar( null );
				return;
			}

			const navBox = nav.getBoundingClientRect();
			const linkBox = link.getBoundingClientRect();
			setBar( { left: linkBox.left - navBox.left, width: linkBox.width } );
		};

		place();

		if ( 'function' !== typeof window.ResizeObserver ) {
			window.addEventListener( 'resize', place );
			return () => window.removeEventListener( 'resize', place );
		}

		const observer = new window.ResizeObserver( place );
		observer.observe( nav );
		return () => observer.disconnect();
	}, [ activeRoute, tabKeys ] );

	return (
		<nav
			ref={ navRef }
			className="sp-shaped-gallery-dash-nav"
			aria-label={ __( 'ShapedGallery', 'easy-lightbox-wp' ) }
		>
			<ul className="sp-shaped-gallery-dash-nav__list">
				{ items.map( ( tab ) => {
					const isLink = 'link' === tab.type;
					const isActive = ! isLink && tab.key === activeRoute;

					return (
						<li key={ tab.key } className="sp-shaped-gallery-dash-nav__item">
							<a
								ref={ ( node ) => {
									if ( isLink ) {
										return;
									}
									linksRef.current[ tab.key ] = node;
								} }
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
			{ bar && (
				<span
					className="sp-shaped-gallery-dash-nav__indicator"
					style={ { left: bar.left, width: bar.width } }
					aria-hidden="true"
				/>
			) }
		</nav>
	);
}

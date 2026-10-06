/**
 * Dashboard shell: header chrome + hash router over the four routes.
 *
 * PHP redirects the Manage / Settings / About Us submenu slugs to this page plus a hash, so
 * `location.hash` is the authoritative route; the mount node's `data-route` is only
 * the fallback for a request that arrived without one.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { Toaster } from 'react-hot-toast';
import { ConfigProvider } from './ConfigContext';
import { resolveConfig } from './config';
import { DEFAULT_ROUTE, ROUTES, parseHash, resolveRoute } from './routes';
import { syncSidebarActive } from './sidebar-sync';
import HeaderBar from './components/HeaderBar';
import FooterBar from './components/FooterBar';
import SupportBubble from './components/SupportBubble';
import GettingStarted from './pages/GettingStarted';
import ManageGalleries from './pages/ManageGalleries';
import Settings from './pages/Settings';
import AboutUs from './pages/AboutUs';

const PAGES = {
	[ DEFAULT_ROUTE ]: GettingStarted,
	manage: ManageGalleries,
	settings: Settings,
	'about-us': AboutUs,
};

/**
 * @param {Object} props
 * @param {string} props.route  Server-supplied route (mount node's data-route).
 * @param {Object} props.config Raw `window.shaped_gallery_admin`.
 * @return {JSX.Element} Dashboard.
 */
export default function Render( { route: dataRoute, config: rawConfig } ) {
	const config = useMemo( () => resolveConfig( rawConfig ), [ rawConfig ] );

	// Lazy initialiser: a deep link resolves on the FIRST paint, so there is no
	// flash of the wrong route.
	const [ route, setRoute ] = useState( () =>
		resolveRoute( window.location.hash, dataRoute )
	);

	const mainRef = useRef( null );
	const didNavigateRef = useRef( false );

	const navigate = useCallback( ( key ) => {
		if ( ! ROUTES.has( key ) ) {
			return;
		}
		// Paint first, then update the hash: the hashchange listener is idempotent,
		// so a swallowed event cannot leave the UI stuck.
		setRoute( key );
		if ( parseHash( window.location.hash ) !== key ) {
			window.location.hash = key;
		}
	}, [] );

	// Browser back / forward, and sidebar links that only change the fragment.
	useEffect( () => {
		const onHashChange = () =>
			setRoute( ( previous ) => resolveRoute( window.location.hash, previous ) );

		window.addEventListener( 'hashchange', onHashChange );
		return () => window.removeEventListener( 'hashchange', onHashChange );
	}, [] );

	// Make a bare sub-page URL shareable. replaceState, not `location.hash =`,
	// which would push a history entry and re-fire hashchange on first paint.
	useEffect( () => {
		if ( parseHash( window.location.hash ) !== route ) {
			window.history.replaceState( null, '', `#${ route }` );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	// Route change: reset scroll, move focus to the new screen (announcing it), and
	// re-light the matching WP sidebar item. Focus is not stolen on first paint.
	useEffect( () => {
		syncSidebarActive( route, config.sidebarMenu );

		if ( ! didNavigateRef.current ) {
			didNavigateRef.current = true;
			return;
		}

		window.scrollTo( { top: 0 } );
		mainRef.current?.focus();
	}, [ route, config.sidebarMenu ] );

	const Page = PAGES[ route ] || GettingStarted;

	return (
		<ConfigProvider value={ config }>
			<div className="sp-shaped-gallery-dash">
				<Toaster
					position="top-right"
					reverseOrder={ false }
					containerClassName="sp-shaped-gallery-dash-toaster"
				/>
				<HeaderBar route={ route } onNavigate={ navigate } />

				<main className="sp-shaped-gallery-dash__body" ref={ mainRef } tabIndex={ -1 }>
					<Page />
				</main>

				<FooterBar />
				<SupportBubble />
			</div>
		</ConfigProvider>
	);
}

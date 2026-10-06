/**
 * Dashboard routing — pure functions, no DOM, no React.
 *
 * The dashboard is one admin page hosting four hash routes. PHP redirects the
 * `shaped-gallery` / `…-settings` / `…-about-us` submenu slugs to this page plus a
 * fragment, so the hash is the authoritative statement of "which sub-page am I on".
 *
 * The route set is fixed by which page components exist — it is deliberately NOT
 * derived from the localized tab list, so a filtered-in tab can never point at a
 * route with nothing to render.
 */
import { __ } from '@wordpress/i18n';

export const DEFAULT_ROUTE = 'getting-started';

/**
 * Renderable routes.
 *
 * @type {Set<string>}
 */
export const ROUTES = new Set( [ DEFAULT_ROUTE, 'manage', 'settings', 'about-us' ] );

/**
 * Nav fallback, used when PHP ships no `tabs`. Mirrors DashboardConfig::tabs();
 * `link` tabs leave the SPA and need a `url` to survive resolveTabs().
 *
 * @type {Array<Object>}
 */
export const DEFAULT_TABS = [
	{ key: DEFAULT_ROUTE, label: __( 'Dashboard', 'easy-lightbox-wp' ), type: 'route' },
	{ key: 'manage', label: __( 'Saved Galleries', 'easy-lightbox-wp' ), type: 'route' },
	{ key: 'settings', label: __( 'Settings', 'easy-lightbox-wp' ), type: 'route' },
	{ key: 'about-us', label: __( 'About Us', 'easy-lightbox-wp' ), type: 'route' },
];

/**
 * The route key inside a location hash.
 *
 * Splits on `/?=&` as well as `#` so a sub-route (`#settings/modules`)
 * resolves to its parent instead of falling through to the default.
 *
 * @param {string} hash Location hash, with or without the leading '#'.
 * @return {string} Bare route key ('' when the hash is empty).
 */
export function parseHash( hash = '' ) {
	return String( hash ).replace( /^#/, '' ).split( /[/?=&]/ )[ 0 ].trim();
}

/**
 * Resolve the route to render: a valid hash wins, then the server's `data-route`,
 * then the default. An unknown hash is ignored rather than redirected.
 *
 * @param {string} hash     Location hash.
 * @param {string} fallback Server-supplied route (mount node's data-route).
 * @return {string} A key from ROUTES.
 */
export function resolveRoute( hash, fallback = DEFAULT_ROUTE ) {
	const key = parseHash( hash );
	if ( ROUTES.has( key ) ) {
		return key;
	}
	return ROUTES.has( fallback ) ? fallback : DEFAULT_ROUTE;
}

/**
 * Nav items for the header: route tabs pass through, link tabs need a resolved
 * href (a tab with no URL is dropped rather than rendered as `href=""`).
 *
 * @param {Object} config Resolved dashboard config.
 * @return {Array<Object>} Renderable tabs.
 */
export function resolveTabs( config = {} ) {
	const tabs = config.tabs && config.tabs.length ? config.tabs : DEFAULT_TABS;
	const manageUrl = config.urls?.manage || '';

	return tabs
		.map( ( tab ) =>
			'link' === tab.type ? { ...tab, url: tab.url || manageUrl } : tab
		)
		.filter( ( tab ) =>
			'link' === tab.type ? !! tab.url : ROUTES.has( tab.key )
		);
}

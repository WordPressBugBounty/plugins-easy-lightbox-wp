/**
 * Keep the WordPress admin sidebar highlight in step with the SPA's hash route.
 *
 * Core marks the submenu whose slug matches `$_GET['page']`; after the route
 * redirect that is always the host page, so "Getting Started" would stay lit while
 * the user reads Settings. The fragment never reaches PHP, so no `submenu_file`
 * filter can fix this — the sidebar lives outside React's tree, which makes
 * imperative DOM the only option here (§12's no-direct-DOM rule targets the editor).
 */

/**
 * Highlight the sidebar item matching a route.
 *
 * A route with no submenu of its own leaves the current highlight alone rather
 * than clearing every `.current` and leaving the sidebar with nothing lit.
 *
 * @param {string} route       Active route key.
 * @param {Object} sidebarMenu Localized `{ menuId, pageSlugs }`.
 * @return {void}
 */
export function syncSidebarActive( route, sidebarMenu = {} ) {
	const { menuId, pageSlugs } = sidebarMenu;
	const slug = pageSlugs?.[ route ];
	if ( ! menuId || ! slug ) {
		return;
	}

	const menu = document.getElementById( menuId );
	if ( ! menu ) {
		return;
	}

	// Scoped to `.wp-submenu`, not `li a`: `menu` IS an `<li>`, and the `li a`
	// descendant combinator matches an ancestor `<li>` anywhere up the tree —
	// including `menu` itself — so it also matches the top-level anchor. Since
	// `remove_submenu_page()` promotes the Dashboard route's slug to be the
	// top-level link's own href too (Menu::register_menu()'s first-submenu
	// quirk), that stray match came FIRST and `find()` re-lit the top-level
	// item instead of the "Dashboard" submenu row it was meant to find.
	//
	// Exact `page=` match, not a substring one: the Manage route's slug
	// (`shaped-gallery`) is a prefix of every other slug on this menu, so
	// `[href*="page=shaped-gallery"]` would light whichever item happens to come first.
	const link = Array.from( menu.querySelectorAll( '.wp-submenu a[href*="page="]' ) ).find(
		( node ) => slug === new URLSearchParams( node.search || '' ).get( 'page' )
	);
	if ( ! link ) {
		return;
	}

	menu.querySelectorAll( '.current' ).forEach( ( node ) =>
		node.classList.remove( 'current' )
	);

	link.closest( 'li' )?.classList.add( 'current' );
	link.classList.add( 'current' );
}

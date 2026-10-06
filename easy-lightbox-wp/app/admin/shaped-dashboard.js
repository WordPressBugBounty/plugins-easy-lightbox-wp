/**
 * Entry: mount the admin dashboard (Getting Started / Settings / About Us).
 *
 * The single read of `window.shaped_gallery_admin` happens here; every component
 * below reads the resolved config through ConfigContext instead of the global.
 */
import { createRoot, render } from '@wordpress/element';
import Render from './Render';
import { DEFAULT_ROUTE } from './routes';
import './admin.scss';

document.addEventListener( 'DOMContentLoaded', () => {
	const node = document.getElementById( 'sp-shaped-gallery-admin-dashboard' );
	if ( ! node ) {
		return;
	}
	const route = node.getAttribute( 'data-route' ) || DEFAULT_ROUTE;
	const config = window.shaped_gallery_admin || {};
	const app = <Render route={ route } config={ config } />;

	if ( typeof createRoot === 'function' ) {
		createRoot( node ).render( app );
	} else {
		render( app, node );
	}
} );

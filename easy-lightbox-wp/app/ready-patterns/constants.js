/**
 * Ready Patterns — shared constants.
 *
 * Every endpoint is one of THIS site's own routes (`shaped-gallery/v1/patterns…`).
 * The provider host appears nowhere in this bundle on purpose: the outbound call
 * is made by PHP (see `src/Patterns/PatternLibrary.php`), so a site can repoint
 * it with a constant, the provider needs no CORS header for us, and a plain-HTTP
 * admin talking to an HTTPS provider is not a mixed-content failure.
 */

export const ENDPOINTS = {
	PATTERNS: '/shaped-gallery/v1/patterns',
	REFRESH: '/shaped-gallery/v1/patterns/refresh',
	IMPORT: '/shaped-gallery/v1/patterns/import',
	FAVORITES: '/shaped-gallery/v1/patterns/favorites',
};

/** Root class names the toolbar button and the mounted modal use. */
export const CSS = {
	MODAL_ROOT: 'sp-shaped-patterns-root',
	BODY_OPEN: 'sp-shaped-patterns-open',
	TOOLBAR_BUTTON: 'sp-shaped-patterns-toolbar-button',
};

/**
 * Auto-open: the dashboard's "Start with Ready Patterns" card links straight
 * into a new gallery with this arg, and the library opens itself once the
 * editor chrome exists.
 */
export const AUTO_OPEN = {
	QUERY_ARG: 'shapedpatterns',
	POLL_INTERVAL: 200,
	MAX_ATTEMPTS: 50,
	EDITOR_READY_SELECTOR:
		'.edit-post-header-toolbar, .editor-header__toolbar, .edit-site-header-edit-mode__start',
};

/** Toolbar sort keys. */
export const SORT = {
	DEFAULT: 'default',
	POPULAR: 'popular',
	LATEST: 'latest',
};

/**
 * Grid density options, in the order the toolbar draws them.
 *
 * Two, matching the reference library — the card is a fixed 3:2 box inside a
 * 20px frame, and a fourth column shrinks it below the width at which a
 * screenshot of a gallery is still readable.
 */
export const COLUMN_OPTIONS = [ '2', '3' ];

/**
 * Header-button injection is debounced against Gutenberg's DOM churn.
 *
 * There is deliberately no companion "give up after N ms" bound. The toolbar is
 * remounted during the editor's life, not just mounted once, so the watcher in
 * `index.js` has to stay connected for the whole session — a deadline on it is
 * the silent "no button" it exists to prevent, only later.
 */
export const RENDER_DEBOUNCE = 200;

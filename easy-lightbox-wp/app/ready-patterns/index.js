/**
 * Ready Patterns — mount points.
 *
 * **One way in**, and that is the whole reason this file is as careful as it is.
 *
 * A button in the editor header, last in the document-tools row — after the
 * inserter, undo/redo and Document Overview, where every other plugin's header
 * button lands. This is the reference implementation's placement and the one the
 * dashboard's "Start with Ready Patterns" card links to, and there is no public
 * Slot for the post-editor header — so it is appended to the toolbar node from a
 * `registerPlugin` render. That is a knowing exception to CLAUDE.md's "no direct
 * DOM in the editor": the referenced implementation outranks that rule here, and
 * every plugin that puts a button there does it this way. It stays contained —
 * ONE node and ONE React root, created once and re-parented, never rebuilt.
 *
 * The gallery block's toolbar is not a second way in — {@see app/blocks/gallery/edit.jsx}
 * draws no launch control. So there is no fallback: if this button is missing,
 * the library is unreachable and nothing in the editor says so — `getPlugin()`
 * still reports the plugin registered and the console is clean. That is the
 * failure every decision below is written against.
 *
 * The dashboard's deep link is the one path that does not go through the button:
 * {@see maybeAutoOpen} polls for the editor chrome and opens the modal itself.
 */
import { debounce } from '@wordpress/compose';
import { createRoot, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { ShapedMarkMono } from '@shaped-gallery/icons';
import Library from './Library';
import { AUTO_OPEN, CSS, RENDER_DEBOUNCE } from './constants';
import './editor.scss';

let modalNode = null;
let modalRoot = null;

/*
 * The header button's node and its root. Module scope rather than per-render:
 * the node outlives any single `ReadyPatternsPlugin` render, and re-parenting
 * the one we already have is what makes {@see ensureHeaderButton} cheap enough
 * to run whenever Gutenberg rebuilds the header.
 */
let buttonNode = null;
let buttonRoot = null;

/**
 * Whether the module is switched on for this site.
 *
 * Absent means the payload never printed, and the render-side gate is what
 * actually enforces "off" — so a missing flag defaults OPEN, exactly as the
 * block panels' module reads do (§6.9).
 *
 * @return {boolean} Whether to draw the entry points.
 */
export function isEnabled() {
	return !! ( window.shaped_gallery_data?.readyPatternsEnabled ?? true );
}

/**
 * Tear the library down.
 *
 * @return {void}
 */
export function closeLibrary() {
	if ( modalRoot ) {
		modalRoot.unmount();
		modalRoot = null;
	}
	if ( modalNode ) {
		modalNode.remove();
		modalNode = null;
	}
	document.body.classList.remove( CSS.BODY_OPEN );
}

/**
 * Mount the library into a node of its own on `document.body`.
 *
 * Outside the editor's React tree on purpose: the header button has no React
 * parent to render into, and the block toolbar's parent is inside the canvas
 * iframe — a modal rendered there would be clipped by it.
 *
 * @param {string} initialLayout Layout slug to preselect, or `all`.
 * @return {void}
 */
export function openLibrary( initialLayout = 'all' ) {
	if ( modalNode || ! isEnabled() ) {
		return;
	}

	modalNode = document.createElement( 'div' );
	modalNode.className = CSS.MODAL_ROOT;
	document.body.appendChild( modalNode );
	document.body.classList.add( CSS.BODY_OPEN );

	modalRoot = createRoot( modalNode );
	modalRoot.render( <Library onClose={ closeLibrary } initialLayout={ initialLayout } /> );
}

/**
 * Drop the auto-open arg so a reload does not reopen the library.
 *
 * @return {void}
 */
function clearAutoOpenArg() {
	if ( ! window.history?.replaceState ) {
		return;
	}
	const url = new URL( window.location.href );
	url.searchParams.delete( AUTO_OPEN.QUERY_ARG );
	window.history.replaceState( {}, '', url.toString() );
}

/**
 * Open the library on load when the editor was reached from the dashboard card.
 *
 * @return {void}
 */
function maybeAutoOpen() {
	const params = new URLSearchParams( window.location.search );
	if ( 'true' !== params.get( AUTO_OPEN.QUERY_ARG ) ) {
		return;
	}
	clearAutoOpenArg();

	let attempts = 0;
	const timer = setInterval( () => {
		attempts += 1;
		if ( document.querySelector( AUTO_OPEN.EDITOR_READY_SELECTOR ) ) {
			clearInterval( timer );
			openLibrary();
			return;
		}
		if ( attempts >= AUTO_OPEN.MAX_ATTEMPTS ) {
			clearInterval( timer );
		}
	}, AUTO_OPEN.POLL_INTERVAL );
}

/**
 * Make sure the header button is sitting in the toolbar that is on screen now.
 *
 * Idempotent and re-entrant, because it is called again every time the button
 * stops being connected — see {@see ReadyPatternsPlugin}.
 *
 * The node and its root are built ONCE and then MOVED. `appendChild()` relocates
 * a node that already exists, and a React root is bound to its container element
 * rather than to that element's position, so the button survives the move with
 * its handlers intact. Rebuilding instead would mean a second `createRoot()` on
 * every header rebuild, each one leaking the root before it.
 *
 * @param {HTMLElement} toolbar Toolbar node.
 * @return {void}
 */
function ensureHeaderButton( toolbar ) {
	if ( buttonNode && buttonNode.parentElement === toolbar ) {
		return;
	}

	if ( ! buttonNode ) {
		buttonNode = document.createElement( 'div' );
		buttonNode.className = CSS.TOOLBAR_BUTTON;

		buttonRoot = createRoot( buttonNode );
		buttonRoot.render(
			<button
				type="button"
				className="sp-shaped-patterns__launch"
				onClick={ () => openLibrary() }
			>
				<ShapedMarkMono />
				{ __( 'Ready Patterns Library', 'easy-lightbox-wp' ) }
			</button>
		);
	}

	toolbar.appendChild( buttonNode );
}

/**
 * Drop the header button and its root.
 *
 * The `unmount()` is deferred by a tick on purpose: this runs from an effect
 * cleanup, i.e. inside React's commit phase, and synchronously unmounting a
 * SECOND root from there is the case React warns about. Detaching the node is
 * safe immediately, so the button is gone from the screen either way.
 *
 * @return {void}
 */
function teardownHeaderButton() {
	const root = buttonRoot;

	buttonNode?.remove();
	buttonNode = null;
	buttonRoot = null;

	if ( root ) {
		window.setTimeout( () => root.unmount(), 0 );
	}
}

/**
 * The `registerPlugin` render: keeps the header button present, then auto-opens.
 *
 * Returns null — it draws nothing in React's tree; the button is appended to the
 * editor's own toolbar node (see this file's header).
 *
 * @return {null} Nothing.
 */
function ReadyPatternsPlugin() {
	useEffect( () => {
		if ( ! isEnabled() ) {
			return undefined;
		}

		const draw = debounce( () => {
			/*
			 * The DOCUMENT TOOLS node, not its `.editor-header__toolbar` parent.
			 * `querySelector` with a comma resolves in DOCUMENT order, not selector
			 * order, so asking for the parent first handed back the wrapper — and a
			 * button appended there sat wherever React last re-appended the tools
			 * subtree, which in practice was to the LEFT of the inserter. Appending
			 * inside the tools row puts it right after Document Overview and keeps
			 * it there.
			 */
			const toolbar = document.querySelector(
				'.editor-document-tools, .edit-post-header-toolbar'
			);
			if ( toolbar ) {
				ensureHeaderButton( toolbar );
			}
		}, RENDER_DEBOUNCE );

		/*
		 * Watch the DOM, and keep watching. Both halves are the fix.
		 *
		 * Watching the DOM rather than the data store, because store ticks and
		 * toolbar mount are independent: the ticks arrive in a burst during init
		 * and stop, and a trailing-edge debounce hung off them fires before the
		 * toolbar exists on a cold load. A MutationObserver fires on the thing
		 * actually being waited for.
		 *
		 * Keeping it connected, because the toolbar is not mounted once. This
		 * observer used to disconnect itself at the first successful append, which
		 * read as tidy and was the bug: Gutenberg REMOUNTS `.editor-document-tools`
		 * while the editor settles, React discards the old element, and the button
		 * appended into it goes with it — after the watcher had already stood down.
		 * The button was built correctly, placed correctly, and then deleted, with
		 * nothing left alive to put it back. Measured on WordPress 7.1.2: the
		 * append succeeded, and by 5s after navigation the toolbar was on screen
		 * with no button in it and no observer watching. Intermittent, because it
		 * is a race — it won often enough to look like it worked.
		 *
		 * There is no timeout either, for the same reason: a deadline on a watcher
		 * that has to outlive the whole editor session is the same silent failure
		 * with a longer fuse.
		 *
		 * Cost in the steady state is one `isConnected` read per mutation batch,
		 * which is O(1) and short-circuits before the debounce is even scheduled.
		 * The expensive path — a `querySelector` on the document — only runs while
		 * the button is actually missing.
		 */
		const observer = new window.MutationObserver( () => {
			if ( buttonNode?.isConnected ) {
				return;
			}
			draw();
		} );
		observer.observe( document.body, { childList: true, subtree: true } );

		// The editor may already be mounted by the time this runs, in which case no
		// further mutation is guaranteed to arrive.
		draw();

		maybeAutoOpen();

		return () => {
			observer.disconnect();
			draw.cancel?.();
			teardownHeaderButton();
		};
	}, [] );

	return null;
}

registerPlugin( 'shaped-gallery-ready-patterns', { render: ReadyPatternsPlugin } );

/**
 * Settings — a vertical section rail beside one panel card (Figma node 523:18540).
 *
 * The rail is a `tablist`, not a nav: the panels swap in place inside this screen
 * rather than navigating anywhere, so arrow-key roving focus is the expected
 * behaviour. The selected section is still mirrored into the hash as
 * `#settings/<section>` so a panel is linkable and survives a reload.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useConfig } from '../../ConfigContext';
import { ChevronRightIcon } from './icons';
import { parseSectionHash, resolveSections } from './sections';

const TAB_ID = ( key ) => `sp-shaped-gallery-settings-tab-${ key }`;
const PANEL_ID = ( key ) => `sp-shaped-gallery-settings-panel-${ key }`;

/**
 * @return {JSX.Element} Page.
 */
export default function Settings() {
	const { settingsPage } = useConfig();
	// Memoised: the rail feeds an effect's dep list, and a fresh array every render
	// would re-run it (and so re-steal focus) on every keystroke elsewhere.
	const sections = useMemo(
		() => resolveSections( settingsPage.sections ),
		[ settingsPage.sections ]
	);

	// Lazy initialiser: a deep link resolves on the first paint, no flash of the
	// default section.
	const [ active, setActive ] = useState( () => parseSectionHash( window.location.hash ) );
	const tabsRef = useRef( [] );
	const didSelectRef = useRef( false );

	const select = useCallback( ( key ) => {
		setActive( key );
		window.location.hash = `settings/${ key }`;
	}, [] );

	// Back / forward, and any link that only rewrites the fragment.
	useEffect( () => {
		const onHashChange = () => setActive( parseSectionHash( window.location.hash ) );
		window.addEventListener( 'hashchange', onHashChange );
		return () => window.removeEventListener( 'hashchange', onHashChange );
	}, [] );

	// Make a bare `#settings` shareable as the section it actually shows.
	// replaceState, not `location.hash =`, which would push a history entry.
	useEffect( () => {
		if ( parseSectionHash( window.location.hash ) === active ) {
			window.history.replaceState( null, '', `#settings/${ active }` );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	// Roving focus follows the selection, but only once the user has driven it —
	// arriving on the screen must not steal focus from the shell.
	useEffect( () => {
		if ( ! didSelectRef.current ) {
			return;
		}
		const index = sections.findIndex( ( section ) => section.key === active );
		tabsRef.current[ index ]?.focus();
	}, [ active, sections ] );

	const onKeyDown = ( event ) => {
		const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[ event.key ];
		const index = sections.findIndex( ( section ) => section.key === active );

		let next = null;
		if ( step ) {
			next = sections[ ( index + step + sections.length ) % sections.length ];
		} else if ( 'Home' === event.key ) {
			next = sections[ 0 ];
		} else if ( 'End' === event.key ) {
			next = sections[ sections.length - 1 ];
		}

		if ( ! next ) {
			return;
		}
		event.preventDefault();
		didSelectRef.current = true;
		select( next.key );
	};

	const current = sections.find( ( section ) => section.key === active ) || sections[ 0 ];
	const Panel = current?.Panel;

	return (
		<div className="sp-shaped-gallery-dash-page sp-shaped-gallery-settings">
			<h1 className="sp-shaped-gallery-dash-sr">
				{ settingsPage.title || __( 'Settings', 'easy-lightbox-wp' ) }
			</h1>

			<div className="sp-shaped-gallery-settings__layout">
				<div
					className="sp-shaped-gallery-settings__rail"
					role="tablist"
					aria-orientation="vertical"
					aria-label={ settingsPage.navLabel || __( 'Settings sections', 'easy-lightbox-wp' ) }
				>
					{ sections.map( ( { key, label, Icon }, index ) => {
						const isActive = key === active;
						return (
							<button
								key={ key }
								type="button"
								id={ TAB_ID( key ) }
								role="tab"
								ref={ ( node ) => {
									tabsRef.current[ index ] = node;
								} }
								className={ `sp-shaped-gallery-settings__tab${
									isActive ? ' is-active' : ''
								}` }
								aria-selected={ isActive }
								aria-controls={ PANEL_ID( key ) }
								tabIndex={ isActive ? 0 : -1 }
								onClick={ () => {
									didSelectRef.current = true;
									select( key );
								} }
								onKeyDown={ onKeyDown }
							>
								<span className="sp-shaped-gallery-settings__tab-label">
									<span className="sp-shaped-gallery-settings__tab-icon">
										<Icon />
									</span>
									{ label }
								</span>
								{ isActive && (
									<span className="sp-shaped-gallery-settings__tab-caret">
										<ChevronRightIcon />
									</span>
								) }
							</button>
						);
					} ) }
				</div>

				{ current && (
					<div
						className="sp-shaped-gallery-settings__content"
						id={ PANEL_ID( current.key ) }
						role="tabpanel"
						aria-labelledby={ TAB_ID( current.key ) }
						tabIndex={ 0 }
					>
						<Panel section={ current } />
					</div>
				) }
			</div>
		</div>
	);
}

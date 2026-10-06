/**
 * Ready Patterns — the live preview drawer.
 *
 * The header is the Figma spec's TopBar, and its three groups each answer a
 * different question. LEFT is where you are: Back, the pattern's name, and the
 * prev/next pair with its "n of m" position. CENTRE is which width you are
 * looking at — the device tabs, bottom-flush so the active one opens into the
 * stage below. RIGHT is what you can do about it: Insert, and the X.
 *
 * Back and X are deliberately NOT the same control. Back returns to the grid
 * (which is also what Escape does); X dismisses the whole library, because a
 * user who is done previewing is usually done choosing, and making them go back
 * to the grid first to reach a second X is a step for nothing.
 *
 * The stage frames the pattern's own permalink on the serving site, which the
 * provider renders with no theme chrome for exactly this purpose. Device
 * switching resizes the iframe and scales it with a CSS transform, so there is no
 * measurement pass and no resize observer — the stage box is a fixed size by
 * design.
 *
 * The iframe is sandboxed WITHOUT `allow-same-origin`: the framed page is a
 * third-party origin rendering markup this site did not author, and it has no
 * business reaching the editor it is displayed inside.
 */
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	ChevronLeftIcon,
	CloseIcon,
	DesktopIcon,
	DownloadIcon,
	MobileIcon,
	TabletIcon,
} from './icons';
import LockedCta from './LockedCta';
import { isLocked } from './tier';

/**
 * Preview device widths. The iframe renders at this width, then scales down with
 * a CSS transform to fit the fixed stage box.
 */
const DEVICES = [
	{ key: 'desktop', width: 1440, Icon: DesktopIcon },
	{ key: 'tablet', width: 834, Icon: TabletIcon },
	{ key: 'mobile', width: 390, Icon: MobileIcon },
];

/*
 * Fixed stage box the scaled preview is fitted into. Fixed on purpose: scaling is
 * a plain CSS transform, so there is no measurement pass / resize observer.
 * The width is the drawer's own, spent: 1320 − 48 (body padding) − 2 (stage
 * borders) − 13 (the stage's left inset). It grew when Insert moved up into the
 * header and took the 280px meta column with it.
 */
const STAGE_WIDTH = 1256;
const STAGE_HEIGHT = 560;

/**
 * @param {string} key Device key.
 * @return {string} Translated label.
 */
function deviceLabel( key ) {
	if ( 'tablet' === key ) {
		return __( 'Tablet', 'easy-lightbox-wp' );
	}
	if ( 'mobile' === key ) {
		return __( 'Mobile', 'easy-lightbox-wp' );
	}
	return __( 'Desktop', 'easy-lightbox-wp' );
}

/**
 * @param {Object}   props
 * @param {Object}   props.pattern        Manifest row being previewed.
 * @param {Function} props.onClose        Leave the preview, back to the grid.
 * @param {Function} props.onCloseLibrary Dismiss the library altogether.
 * @param {Function} props.onInsert       Insert handler.
 * @param {boolean}  props.isInserting    Whether this pattern's import is running.
 * @param {number}   props.index          Zero-based position in the visible list.
 * @param {number}   props.total          Length of the visible list.
 * @param {Function} props.onPrev         Step to the previous visible pattern.
 * @param {Function} props.onNext         Step to the next visible pattern.
 * @return {JSX.Element} Drawer.
 */
export default function PreviewDrawer( {
	pattern,
	onClose,
	onCloseLibrary,
	onInsert,
	isInserting,
	index = 0,
	total = 0,
	onPrev,
	onNext,
} ) {
	const locked = isLocked( pattern );
	const [ device, setDevice ] = useState( DEVICES[ 0 ].key );
	const [ isFrameLoading, setIsFrameLoading ] = useState( true );
	const backRef = useRef( null );
	const drawerRef = useRef( null );

	// Back, not the X: opening focuses the way OUT of the preview, not the way out
	// of the library.
	useEffect( () => {
		backRef.current?.focus();
	}, [] );

	/*
	 * Escape on the CAPTURE phase, and stopped here. The library modal behind this
	 * one closes on Escape too (it is the shared Modal primitive), so without the
	 * capture-phase intercept one keypress would dismiss both — closing the whole
	 * library when the user only meant to leave the preview.
	 *
	 * The arrow keys ride the same listener: the stage is a cross-origin iframe, so
	 * keystrokes over the preview itself never reach this document, and without a
	 * document-level binding the shortcut would only work while a header control
	 * happens to hold focus. Modified presses are left alone — those are the
	 * browser's (back/forward, word-wise motion), not ours.
	 */
	useEffect( () => {
		const onKeyDown = ( event ) => {
			if ( 'Escape' === event.key ) {
				event.preventDefault();
				event.stopPropagation();
				onClose();
				return;
			}

			if ( 'ArrowLeft' !== event.key && 'ArrowRight' !== event.key ) {
				return;
			}
			if ( event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			if ( 'ArrowLeft' === event.key ) {
				onPrev?.();
			} else {
				onNext?.();
			}
		};
		document.addEventListener( 'keydown', onKeyDown, true );
		return () => document.removeEventListener( 'keydown', onKeyDown, true );
	}, [ onClose, onPrev, onNext ] );

	// A new pattern swaps the src — show the loader again. Device switching only
	// resizes the frame, so it must NOT reset this.
	const previewUrl = pattern?.url || '';
	useEffect( () => {
		setIsFrameLoading( true );
	}, [ previewUrl ] );

	// Mouse-down, not click: releasing a text selection that began inside the
	// drawer must not count as clicking the dimmed area.
	const onBackdropMouseDown = ( event ) => {
		if ( drawerRef.current && ! drawerRef.current.contains( event.target ) ) {
			onClose();
		}
	};

	const active = DEVICES.find( ( entry ) => entry.key === device ) || DEVICES[ 0 ];
	const scale = Math.min( 1, STAGE_WIDTH / active.width );
	const name = decodeEntities( pattern?.name || '' );
	const thumb = pattern?.image || '';

	// One pattern is not a sequence: the pair and its counter would both be noise.
	const hasNav = 1 < total && 0 <= index;

	return (
		<div className="sp-shaped-patterns__drawer-backdrop" onMouseDown={ onBackdropMouseDown }>
			<section
				className="sp-shaped-patterns__drawer"
				ref={ drawerRef }
				role="dialog"
				aria-modal="true"
				aria-labelledby="sp-shaped-patterns-drawer-title"
			>
				<header className="sp-shaped-patterns__drawer-header">
					<div className="sp-shaped-patterns__drawer-header-left">
						<button
							type="button"
							className="sp-shaped-patterns__drawer-back"
							onClick={ onClose }
							ref={ backRef }
						>
							<ChevronLeftIcon />
							{ __( 'Back', 'easy-lightbox-wp' ) }
						</button>

						<h2
							className="sp-shaped-patterns__drawer-title"
							id="sp-shaped-patterns-drawer-title"
							title={ name }
						>
							{ name }
						</h2>

						{ hasNav && (
							<div className="sp-shaped-patterns__drawer-nav">
								<div className="sp-shaped-patterns__drawer-nav-group">
									<button
										type="button"
										className="sp-shaped-patterns__drawer-nav-btn"
										aria-label={ __( 'Previous pattern', 'easy-lightbox-wp' ) }
										title={ __( 'Previous pattern', 'easy-lightbox-wp' ) }
										onClick={ () => onPrev?.() }
									>
										<ArrowLeftIcon />
									</button>
									<button
										type="button"
										className="sp-shaped-patterns__drawer-nav-btn"
										aria-label={ __( 'Next pattern', 'easy-lightbox-wp' ) }
										title={ __( 'Next pattern', 'easy-lightbox-wp' ) }
										onClick={ () => onNext?.() }
									>
										<ArrowRightIcon />
									</button>
								</div>

								{ /* Live, because stepping changes it without moving focus. */ }
								<span
									className="sp-shaped-patterns__drawer-nav-count"
									aria-live="polite"
								>
									{ sprintf(
										/* translators: 1: position of the previewed pattern, 2: number of patterns shown. */
										__( '%1$d of %2$d', 'easy-lightbox-wp' ),
										index + 1,
										total
									) }
								</span>
							</div>
						) }
					</div>

					<div
						className="sp-shaped-patterns__drawer-devices"
						role="group"
						aria-label={ __( 'Preview width', 'easy-lightbox-wp' ) }
					>
						{ DEVICES.map( ( entry ) => {
							const { Icon } = entry;
							return (
								<button
									key={ entry.key }
									type="button"
									className={ `sp-shaped-patterns__drawer-device${
										entry.key === device ? ' is-active' : ''
									}` }
									aria-pressed={ entry.key === device }
									aria-label={ deviceLabel( entry.key ) }
									title={ deviceLabel( entry.key ) }
									onClick={ () => setDevice( entry.key ) }
								>
									<Icon />
								</button>
							);
						} ) }
					</div>

					{ /*
					   Previewing a premium pattern is deliberately allowed — seeing what
					   Pro buys is the point of shipping locked rows at all — so this slot
					   is reachable for a pattern this build cannot insert, and makes the
					   same swap the card does.
					 */ }
					<div className="sp-shaped-patterns__drawer-header-right">
						{ locked ? (
							<LockedCta label={ __( 'Get Pro to use this pattern', 'easy-lightbox-wp' ) } />
						) : (
							<button
								type="button"
								className={ `sp-shaped-patterns__insert-btn${
									isInserting ? ' is-busy' : ''
								}` }
								onClick={ () => onInsert( pattern ) }
								disabled={ isInserting }
							>
								{ isInserting
									? __( 'Inserting…', 'easy-lightbox-wp' )
									: __( 'Insert', 'easy-lightbox-wp' ) }
								{ isInserting ? (
									<span className="dashicons dashicons-update sp-shaped-patterns__spin" />
								) : (
									<DownloadIcon />
								) }
							</button>
						) }

						<button
							type="button"
							className="sp-shaped-patterns__drawer-close"
							aria-label={ __( 'Close the pattern library', 'easy-lightbox-wp' ) }
							onClick={ onCloseLibrary || onClose }
						>
							<CloseIcon />
						</button>
					</div>
				</header>

				<div className="sp-shaped-patterns__drawer-body">
					<div className="sp-shaped-patterns__drawer-stage">
						{ previewUrl ? (
							<iframe
								className={ `sp-shaped-patterns__drawer-frame${
									isFrameLoading ? ' is-loading' : ''
								}` }
								title={
									name
										? sprintf(
												/* translators: %s: pattern name. */
												__( 'Preview of %s', 'easy-lightbox-wp' ),
												name
										  )
										: __( 'Pattern preview', 'easy-lightbox-wp' )
								}
								src={ previewUrl }
								sandbox="allow-scripts allow-forms allow-popups"
								onLoad={ () => setIsFrameLoading( false ) }
								style={ {
									width: `${ active.width }px`,
									height: `${ Math.round( STAGE_HEIGHT / scale ) }px`,
									transform: `scale(${ scale })`,
								} }
							/>
						) : (
							<div className="sp-shaped-patterns__drawer-thumb">
								{ thumb ? (
									<img src={ thumb } alt="" />
								) : (
									<p>
										{ __(
											'No preview is available for this pattern.',
											'easy-lightbox-wp'
										) }
									</p>
								) }
							</div>
						) }

						{ previewUrl && isFrameLoading && (
							<div className="sp-shaped-patterns__drawer-loader" aria-hidden="true">
								<span className="sp-shaped-patterns__drawer-loader-spinner" />
								<span className="sp-shaped-patterns__drawer-loader-text">
									{ __( 'Loading preview…', 'easy-lightbox-wp' ) }
								</span>
							</div>
						) }
					</div>
				</div>
			</section>
		</div>
	);
}

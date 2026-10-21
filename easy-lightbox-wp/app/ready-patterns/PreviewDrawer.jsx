/**
 * Ready Patterns — the live preview drawer.
 *
 * Modelled on WP Carousel Free's pattern preview, which is the reference for its
 * structure, its behaviour and where it sits; its look — and how it sizes the
 * three widths — is the live library's (shapedgallery.com/patterns), so the
 * preview in the editor reads as the one on the site:
 *
 * - It opens INSIDE the library panel, docked to the panel's right edge, rather
 *   than as a full-height sheet over the whole screen — the library stays visible
 *   (dimmed) beside it, so the preview reads as a step within the library.
 * - The header answers one question per group. LEFT is the pattern's name. CENTRE
 *   is which width you are looking at — the device tabs, bottom-flush so the
 *   active one opens into the stage below. RIGHT is what you can do about it:
 *   Insert (or Upgrade to Pro, for a pattern this build cannot insert) and the X.
 * - The X closes the PREVIEW, back to the grid — the same as Escape and a click
 *   on the dimmed library. The library has its own X, uncovered the moment this
 *   one closes, so one control never means two things.
 * - The footer steps through the visible list: where you are ("Patterns n of m")
 *   on the left, Prev / Next on the right. The ends are dead ends, not wraps — see
 *   `stepIndex()`.
 *
 * The stage frames the pattern's own permalink on the serving site, which the
 * provider renders with no theme chrome for exactly this purpose — and with its
 * own padding, so the stage adds none. Desktop fills the stage 1:1; tablet and
 * mobile sit centred at their own width, and are scaled with a CSS transform only
 * when the MEASURED stage is too narrow to hold them. The panel follows the
 * viewport, so a fixed stage either overflowed it on a short screen or left dead
 * space under the preview on a tall one.
 *
 * The iframe is sandboxed WITHOUT `allow-same-origin`: the framed page is a
 * third-party origin rendering markup this site did not author, and it has no
 * business reaching the editor it is displayed inside.
 */
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useLayoutEffect, useRef, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	CloseIcon,
	DesktopIcon,
	DownloadIcon,
	MobileIcon,
	TabletIcon,
} from './icons';
import LockedCta from './LockedCta';
import { isLocked } from './tier';

/**
 * Preview device widths, as the live library sizes them. Desktop has none: it
 * renders at the stage's own width, 1:1, so the pattern is shown crisp and at the
 * size a visitor would see it rather than shrunk from a nominal 1440. Tablet and
 * mobile render at their width, centred.
 */
const DEVICES = [
	{ key: 'desktop', width: 0, Icon: DesktopIcon },
	{ key: 'tablet', width: 780, Icon: TabletIcon },
	{ key: 'mobile', width: 360, Icon: MobileIcon },
];

/** How long the preloader waits on a frame that may never fire `load`. */
const FRAME_LOAD_TIMEOUT_MS = 15000;

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
 * @param {Object}   props.pattern     Manifest row being previewed.
 * @param {Function} props.onClose     Leave the preview, back to the grid.
 * @param {Function} props.onInsert    Insert handler.
 * @param {boolean}  props.isInserting Whether this pattern's import is running.
 * @param {number}   props.index       Zero-based position in the visible list, or -1
 *                                     once a facet change has filtered it out.
 * @param {number}   props.total       Length of the visible list.
 * @param {Function} props.onPrev      Step to the previous visible pattern.
 * @param {Function} props.onNext      Step to the next visible pattern.
 * @return {JSX.Element} Drawer.
 */
export default function PreviewDrawer( {
	pattern,
	onClose,
	onInsert,
	isInserting,
	index = -1,
	total = 0,
	onPrev,
	onNext,
} ) {
	const locked = isLocked( pattern );
	const [ device, setDevice ] = useState( DEVICES[ 0 ].key );
	const [ isFrameLoading, setIsFrameLoading ] = useState( true );
	// The stage's measured content box — the frame is scaled to fit it.
	const [ stage, setStage ] = useState( { width: 0, height: 0 } );
	const closeRef = useRef( null );
	const stageRef = useRef( null );
	const drawerRef = useRef( null );

	// The X is the way out of the preview, so it is where focus lands.
	useEffect( () => {
		closeRef.current?.focus();
	}, [] );

	/*
	 * Escape on the CAPTURE phase, and stopped here. The library modal behind this
	 * one closes on Escape too (it is the shared Modal primitive), so without the
	 * capture-phase intercept one keypress would dismiss both — closing the whole
	 * library when the user only meant to leave the preview.
	 *
	 * The arrow keys ride the same listener: the stage is a cross-origin iframe, so
	 * keystrokes over the preview itself never reach this document, and without a
	 * document-level binding the shortcut would only work while a footer control
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

	/*
	 * Measured from a LAYOUT effect so the first observation lands before paint —
	 * from a passive effect the stage is unmeasured for a frame, and a fixed width
	 * the stage cannot hold draws unscaled and clipped until it does. The drawer
	 * lives in the editor's own document, not the canvas iframe, so this window's
	 * ResizeObserver is the right one.
	 */
	useLayoutEffect( () => {
		const node = stageRef.current;
		if ( ! node || 'undefined' === typeof ResizeObserver ) {
			return undefined;
		}

		const observer = new ResizeObserver( ( [ entry ] ) => {
			const { width, height } = entry.contentRect;
			setStage( { width: Math.round( width ), height: Math.round( height ) } );
		} );
		observer.observe( node );

		return () => observer.disconnect();
	}, [] );

	/*
	 * A new pattern swaps the src — show the loader again. Device switching only
	 * resizes the frame, so it must NOT reset this.
	 *
	 * A cross-origin frame that never loads fires no event at all: an offline site
	 * or a blocked pattern host would otherwise leave the loader spinning for good,
	 * so it gives up and shows whatever the frame managed to render.
	 */
	const previewUrl = pattern?.url || '';
	useEffect( () => {
		if ( ! previewUrl ) {
			return undefined;
		}

		setIsFrameLoading( true );
		const timer = setTimeout( () => setIsFrameLoading( false ), FRAME_LOAD_TIMEOUT_MS );

		return () => clearTimeout( timer );
	}, [ previewUrl ] );

	// Mouse-down, not click: releasing a text selection that began inside the
	// drawer must not count as clicking the dimmed area.
	const onBackdropMouseDown = ( event ) => {
		if ( drawerRef.current && ! drawerRef.current.contains( event.target ) ) {
			onClose();
		}
	};

	const active = DEVICES.find( ( entry ) => entry.key === device ) || DEVICES[ 0 ];
	const scale = active.width && stage.width ? Math.min( 1, stage.width / active.width ) : 1;
	/*
	 * Unscaled, the frame takes the stage's height straight from CSS. Scaled, it is
	 * laid out taller by the inverse of the scale, so the transform brings it back
	 * to exactly the stage's height instead of leaving a band of empty stage below.
	 */
	const frameStyle = active.width
		? {
				width: `${ active.width }px`,
				height: 1 > scale ? `${ Math.round( stage.height / scale ) }px` : '100%',
				transform: 1 > scale ? `scale(${ scale })` : undefined,
		  }
		: { width: '100%', height: '100%' };
	const name = decodeEntities( pattern?.name || '' );
	const thumb = pattern?.image || '';

	/*
	 * The count only means anything while the previewed pattern is still in the
	 * visible list — a facet change underneath the drawer can filter it out.
	 *
	 * A dead end is `aria-disabled`, never `disabled`: a control that turns
	 * `disabled` while it holds focus drops that focus on the floor, which is what
	 * pressing Next onto the last pattern would do. `aria-disabled` keeps it in the
	 * tab order and announced as unavailable; the click is refused here instead.
	 */
	const isListed = 0 <= index;
	const canPrev = 0 < index;
	const canNext = isListed && index < total - 1;

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
					{ /* Stepping swaps this text without moving focus, so it announces
					     itself rather than the step passing silently. */ }
					<h2
						className="sp-shaped-patterns__drawer-title"
						id="sp-shaped-patterns-drawer-title"
						title={ name }
						aria-live="polite"
					>
						{ name }
					</h2>

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
							<LockedCta upgrade label={ __( 'Upgrade to Pro', 'easy-lightbox-wp' ) } />
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
							aria-label={ __( 'Close preview', 'easy-lightbox-wp' ) }
							title={ __( 'Close preview', 'easy-lightbox-wp' ) }
							onClick={ onClose }
							ref={ closeRef }
						>
							<CloseIcon />
						</button>
					</div>
				</header>

				<div className="sp-shaped-patterns__drawer-body">
					<div className="sp-shaped-patterns__drawer-stage" ref={ stageRef }>
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
								onError={ () => setIsFrameLoading( false ) }
								style={ frameStyle }
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

						{ /* A spinner on a dark veil, as the live library draws it. Decorative: the
						     frame's own title names what is loading. */ }
						{ previewUrl && isFrameLoading && (
							<div className="sp-shaped-patterns__drawer-loader" aria-hidden="true">
								<span className="sp-shaped-patterns__drawer-loader-spinner" />
							</div>
						) }
					</div>
				</div>

				{ isListed && (
					<footer className="sp-shaped-patterns__drawer-footer">
						<span className="sp-shaped-patterns__drawer-footer-count">
							{ sprintf(
								/* translators: 1: position of the previewed pattern, 2: number of patterns shown. */
								__( 'Patterns %1$d of %2$d', 'easy-lightbox-wp' ),
								index + 1,
								total
							) }
						</span>

						<div
							className="sp-shaped-patterns__drawer-footer-nav"
							role="group"
							aria-label={ __( 'Browse patterns', 'easy-lightbox-wp' ) }
						>
							<button
								type="button"
								className="sp-shaped-patterns__drawer-page"
								aria-label={ __( 'Previous pattern', 'easy-lightbox-wp' ) }
								aria-disabled={ ! canPrev }
								onClick={ () => canPrev && onPrev?.() }
							>
								<ChevronLeftIcon />
								{ __( 'Prev', 'easy-lightbox-wp' ) }
							</button>
							<button
								type="button"
								className="sp-shaped-patterns__drawer-page"
								aria-label={ __( 'Next pattern', 'easy-lightbox-wp' ) }
								aria-disabled={ ! canNext }
								onClick={ () => canNext && onNext?.() }
							>
								{ __( 'Next', 'easy-lightbox-wp' ) }
								<ChevronRightIcon />
							</button>
						</div>
					</footer>
				) }
			</section>
		</div>
	);
}

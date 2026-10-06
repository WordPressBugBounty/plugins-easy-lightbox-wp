/**
 * Pointer gestures on the viewer's stage: zoom, pan and swipe-to-page.
 *
 * One module because they are one state machine — a swipe and a pan are the same
 * drag until you know the zoom level, and pinch changes both. Splitting them
 * would mean two handlers racing for the same pointer stream.
 *
 * Built on Pointer Events, so mouse, touch and pen are one code path (no
 * `touchstart`/`mousedown` duplication and no synthetic-click delay). The
 * controller is created once per overlay and told which slide is current; it
 * never reads gallery state itself.
 */

/** Zoom bounds and the step the toolbar buttons and double-click use. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.5;

/** Horizontal travel (px) that counts as a swipe rather than a stray drag. */
const SWIPE_THRESHOLD = 50;

/** Travel (px) beyond which a pointer sequence is a drag, not a click. */
const DRAG_SLOP = 6;

/**
 * Clamp a number into a range.
 *
 * @param {number} value Value.
 * @param {number} min   Lower bound.
 * @param {number} max   Upper bound.
 * @return {number} Clamped value.
 */
function clamp( value, min, max ) {
	return Math.min( max, Math.max( min, value ) );
}

/**
 * Create the gesture controller for a stage element.
 *
 * @param {HTMLElement} stage             The element the media lives in.
 * @param {Object}      handlers
 * @param {Function}    handlers.onStep   `(delta) => void` — page by ±1.
 * @param {Function}    handlers.onZoom   `(zoom) => void` — zoom level changed.
 * @param {Function}    handlers.canZoom  `() => boolean` — is the current slide zoomable.
 * @param {Function}    handlers.canSwipe `() => boolean` — may a swipe page the viewer.
 * @return {Object} `{ zoom, setZoom, reset, destroy }`.
 */
export function createGestures( stage, { onStep, onZoom, canZoom, canSwipe } ) {
	const state = {
		zoom: ZOOM_MIN,
		pan: { x: 0, y: 0 },
		// Active pointers, keyed by pointerId — two of them means a pinch.
		pointers: new Map(),
		start: null,
		pinch: null,
		moved: false,
	};

	/** The media element currently on the stage. */
	const media = () => stage.firstElementChild;

	/**
	 * How far the media may be panned before its edge would come inside the
	 * stage. Without this the visitor can throw a zoomed image off screen and be
	 * left looking at nothing, with no way back but closing the viewer.
	 *
	 * @return {{x:number,y:number}} Maximum absolute offset per axis.
	 */
	function panBounds() {
		const el = media();
		if ( ! el ) {
			return { x: 0, y: 0 };
		}
		const box = stage.getBoundingClientRect();
		// offsetWidth is the UNSCALED size; the rendered size is that times zoom.
		const width = ( el.offsetWidth || box.width ) * state.zoom;
		const height = ( el.offsetHeight || box.height ) * state.zoom;
		return {
			x: Math.max( 0, ( width - box.width ) / 2 ),
			y: Math.max( 0, ( height - box.height ) / 2 ),
		};
	}

	/**
	 * Push the current zoom and pan onto the media element.
	 *
	 * @return {void}
	 */
	function render() {
		const el = media();
		if ( ! el ) {
			return;
		}
		const bounds = panBounds();
		state.pan = {
			x: clamp( state.pan.x, -bounds.x, bounds.x ),
			y: clamp( state.pan.y, -bounds.y, bounds.y ),
		};
		el.style.transform = `translate(${ state.pan.x }px, ${ state.pan.y }px) scale(${ state.zoom })`;
	}

	/**
	 * Set the zoom level, clamped. Zooming back to 1× recentres, because a pan
	 * offset on an unzoomed image is meaningless and would look like a bug.
	 *
	 * @param {number}  next     Requested level.
	 * @param {boolean} [silent] Skip the change callback (used by `reset`).
	 * @return {void}
	 */
	function setZoom( next, silent = false ) {
		const zoom = clamp( Math.round( next * 100 ) / 100, ZOOM_MIN, ZOOM_MAX );
		const changed = zoom !== state.zoom;
		state.zoom = zoom;
		if ( ZOOM_MIN === zoom ) {
			state.pan = { x: 0, y: 0 };
		}
		render();
		if ( changed && ! silent ) {
			onZoom( zoom );
		}
	}

	/**
	 * Return to 1× with no pan — called on every slide change, because carrying
	 * zoom across would leave the next image cropped for no reason the visitor
	 * asked for.
	 *
	 * @return {void}
	 */
	function reset() {
		state.zoom = ZOOM_MIN;
		state.pan = { x: 0, y: 0 };
		state.pointers.clear();
		state.start = null;
		state.pinch = null;
		render();
		onZoom( ZOOM_MIN );
	}

	/** Distance between the two active pointers. */
	function pinchDistance() {
		const [ a, b ] = [ ...state.pointers.values() ];
		return Math.hypot( a.x - b.x, a.y - b.y );
	}

	/**
	 * @param {PointerEvent} event Event.
	 * @return {void}
	 */
	function onPointerDown( event ) {
		// Let the browser have secondary buttons and any click on a real control.
		if ( event.button > 0 || event.target.closest( 'button, a[href], video, iframe' ) ) {
			return;
		}

		state.pointers.set( event.pointerId, { x: event.clientX, y: event.clientY } );
		state.moved = false;

		if ( 2 === state.pointers.size && canZoom() ) {
			state.pinch = { distance: pinchDistance(), zoom: state.zoom };
			state.start = null;
			return;
		}

		if ( 1 === state.pointers.size ) {
			state.start = {
				x: event.clientX,
				y: event.clientY,
				pan: { ...state.pan },
				zoomed: state.zoom > ZOOM_MIN,
			};
			stage.setPointerCapture?.( event.pointerId );
		}
	}

	/**
	 * @param {PointerEvent} event Event.
	 * @return {void}
	 */
	function onPointerMove( event ) {
		if ( ! state.pointers.has( event.pointerId ) ) {
			return;
		}
		state.pointers.set( event.pointerId, { x: event.clientX, y: event.clientY } );

		// Pinch wins over drag whenever two pointers are down.
		if ( state.pinch && 2 === state.pointers.size ) {
			const ratio = pinchDistance() / ( state.pinch.distance || 1 );
			setZoom( state.pinch.zoom * ratio );
			state.moved = true;
			return;
		}

		if ( ! state.start ) {
			return;
		}

		const dx = event.clientX - state.start.x;
		const dy = event.clientY - state.start.y;

		if ( ! state.moved && Math.hypot( dx, dy ) > DRAG_SLOP ) {
			state.moved = true;
		}

		// Zoomed in: the drag pans. Otherwise it is a candidate swipe, which is
		// resolved on release so a hesitant drag does not page the viewer.
		if ( state.start.zoomed ) {
			state.pan = { x: state.start.pan.x + dx, y: state.start.pan.y + dy };
			render();
			stage.classList.add( 'is-panning' );
		}
	}

	/**
	 * @param {PointerEvent} event Event.
	 * @return {void}
	 */
	function onPointerUp( event ) {
		const start = state.start;
		state.pointers.delete( event.pointerId );
		stage.classList.remove( 'is-panning' );

		if ( state.pointers.size < 2 ) {
			state.pinch = null;
		}
		if ( ! start ) {
			return;
		}
		state.start = null;

		// A swipe only pages when the image is NOT zoomed — otherwise the same
		// gesture is how the visitor looks around it.
		if ( ! start.zoomed && state.moved && canSwipe() ) {
			const dx = event.clientX - start.x;
			const dy = event.clientY - start.y;
			if ( Math.abs( dx ) > SWIPE_THRESHOLD && Math.abs( dx ) > Math.abs( dy ) ) {
				onStep( dx < 0 ? 1 : -1 );
			}
		}
	}

	/**
	 * @param {WheelEvent} event Event.
	 * @return {void}
	 */
	function onWheel( event ) {
		if ( ! canZoom() ) {
			return;
		}
		event.preventDefault();
		setZoom( state.zoom + ( event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP ) );
	}

	/**
	 * Double-click / double-tap toggles between fit and a useful zoom — the
	 * gesture every image viewer has, and the reason a single step-in button is
	 * not enough.
	 *
	 * @return {void}
	 */
	function onDoubleClick() {
		if ( ! canZoom() ) {
			return;
		}
		setZoom( state.zoom > ZOOM_MIN ? ZOOM_MIN : 2 );
	}

	stage.addEventListener( 'pointerdown', onPointerDown );
	stage.addEventListener( 'pointermove', onPointerMove );
	stage.addEventListener( 'pointerup', onPointerUp );
	stage.addEventListener( 'pointercancel', onPointerUp );
	stage.addEventListener( 'wheel', onWheel, { passive: false } );
	stage.addEventListener( 'dblclick', onDoubleClick );

	return {
		/** @return {number} Current zoom level. */
		get zoom() {
			return state.zoom;
		},
		setZoom,
		reset,
		/** Re-apply the transform, e.g. after the stage resized. */
		render,
		/** Detach every listener. Only needed if an overlay is ever discarded. */
		destroy() {
			stage.removeEventListener( 'pointerdown', onPointerDown );
			stage.removeEventListener( 'pointermove', onPointerMove );
			stage.removeEventListener( 'pointerup', onPointerUp );
			stage.removeEventListener( 'pointercancel', onPointerUp );
			stage.removeEventListener( 'wheel', onWheel );
			stage.removeEventListener( 'dblclick', onDoubleClick );
		},
	};
}

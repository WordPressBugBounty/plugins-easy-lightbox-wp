/**
 * Frontend gallery runtime.
 *
 * - Justified & Masonry: measure container width and apply pixel-accurate
 *   geometry using the SHARED layout-math module (same code as the editor
 *   preview), re-running on resize via ResizeObserver.
 *
 * The lightbox is deliberately ABSENT: it is its own bundle (`./lightbox`) that
 * self-initialises and is enqueued only when a gallery actually clicks through to
 * it, so this runtime neither imports nor knows about it. Nothing here should
 * reintroduce that dependency — it is what keeps the viewer and its stylesheet
 * off pages whose galleries never open one.
 *
 * Grid needs no JS (pure CSS Grid).
 */
import { computeJustified, computeMasonry } from '@shaped-gallery/lib/layout-math';
import { contentHeight, contentWidth, itemFrame, itemInsetY, itemMargin } from '@shaped-gallery/lib/measure';
import { pickResponsive } from '@shaped-gallery/lib/responsive';
import { initPagination } from './pagination';
import { initMedia } from './media';

/** Default justified target row height when the mode is "Auto". */
const DEFAULT_ROW_HEIGHT = 280;

/**
 * Read responsive column count from data-cols JSON for the current viewport.
 *
 * @param {HTMLElement} box Gallery container.
 * @return {number} Column count.
 */
function columnsFor( box ) {
	return pickResponsive( box.dataset.cols, 4 );
}

/**
 * The tiles a measured layout should pack.
 *
 * Excludes `[hidden]` figures so a filtered-out tile takes no part in the row /
 * column geometry — without this the Image Filter & Search runtime would leave
 * holes where hidden tiles still occupied their slot.
 *
 * @param {HTMLElement} box Gallery container.
 * @return {HTMLElement[]} Visible item figures, in DOM order.
 */
function visibleItems( box ) {
	return Array.from( box.querySelectorAll( '.sp-shaped-gallery__item:not([hidden])' ) );
}

/**
 * Does this gallery draw Classic content blocks?
 *
 * The gate on the extra measure pass masonry needs. A gallery whose Content
 * Display Style is Overlay — or that shows no title and no description at all —
 * has nothing in flow beside the media, so its tiles are still exactly the height
 * the geometry computes and the reflow stays a single write pass with no forced
 * layout, precisely as before this existed.
 *
 * @param {HTMLElement} box Gallery container.
 * @return {boolean} Whether any tile has an in-flow content block.
 */
function hasClassicContent( box ) {
	return null !== box.querySelector( '.sp-shaped-gallery__content.is-classic' );
}

/**
 * Give one tile the media band the geometry computed for it.
 *
 * The band goes on the tile's FRAME and the tile itself is left auto-height, so a
 * Classic content block adds to the tile instead of taking from the image. The
 * frame is inset-adjusted because the geometry describes the tile's outer box: with
 * the tile auto-heighting, its border and padding are now OUTSIDE the band rather
 * than inside it, so a bordered gallery would otherwise grow by `2 × border-width`
 * a tile — enough, on justified, to stop a row filling its container.
 *
 * Markup without a frame (a page cached by something outside this plugin) falls
 * back to the pre-frame behaviour: the height goes on the tile. Classic is squeezed
 * there exactly as it used to be, but nothing else changes — the layout is degraded,
 * not broken (§19).
 *
 * @param {HTMLElement}  fig    Tile figure.
 * @param {?HTMLElement} frame  The tile's media frame, or null.
 * @param {number}       outer  Outer (margin-box) height the geometry produced.
 * @param {Object}       margin Tile margin bundle.
 * @param {number}       insetY Tile border + padding, top plus bottom.
 * @return {void}
 */
function applyBand( fig, frame, outer, margin, insetY ) {
	if ( frame ) {
		frame.style.height = Math.max( 0, outer - margin.top - margin.bottom - insetY ) + 'px';
		fig.style.height = '';
		return;
	}
	fig.style.height = Math.max( 0, outer - margin.top - margin.bottom ) + 'px';
}

/**
 * Lay out a single justified gallery.
 *
 * @param {HTMLElement} box Container.
 */
function layoutJustified( box ) {
	const figs = visibleItems( box );
	const dims = figs.map( ( f ) => ( { w: +f.dataset.w || 4, h: +f.dataset.h || 3 } ) );
	// data-row is already the mode-resolved target (SSR applies auto→default).
	const target = parseInt( box.dataset.row, 10 ) || DEFAULT_ROW_HEIGHT;
	const gh = pickResponsive( box.dataset.gapH, 20 );
	const gv = pickResponsive( box.dataset.gapV, 20 );
	// Pin the flex gaps to the exact values fed to the geometry so each row fills
	// the container precisely at every breakpoint (the no-JS CSS var is desktop
	// only; this makes the row math and the rendered gap agree on tablet/mobile).
	box.style.columnGap = gh + 'px';
	box.style.rowGap = gv + 'px';
	const boxes = computeJustified( dims, contentWidth( box ), target, gh );
	/*
	 * The geometry describes each tile's OUTER box, because that is what has to sum
	 * to the container. `box-sizing: border-box` means `width` excludes the margin,
	 * so the margin has to come off the written size or every row overflows by
	 * `(left + right) × tiles` — one pixel is enough to wrap a row's last tile and
	 * the gallery silently stops being justified (§19).
	 */
	const m = itemMargin( figs[ 0 ] );
	const insetY = itemInsetY( figs[ 0 ] );
	/*
	 * Only the WIDTH is written on the tile. The height belongs to the frame, and the
	 * tile is left to size itself, because that is what lets the flex line equalise
	 * the row: every tile in the line stretches to the tallest, so a row of Classic
	 * captions of different depths still ends on one straight edge and the next row
	 * starts flush. Justified needs no height measurement of its own for this — the
	 * layout constrains widths, and widths are untouched by anything below the media.
	 */
	boxes.forEach( ( b, i ) => {
		const fig = figs[ i ];
		if ( ! fig ) {
			return;
		}
		fig.style.width = Math.max( 0, b.width - m.left - m.right ) + 'px';
		fig.style.flex = '0 0 auto';
		applyBand( fig, itemFrame( fig ), b.height, m, insetY );
	} );
}

/**
 * Lay out a single masonry gallery.
 *
 * @param {HTMLElement} box Container.
 */
function layoutMasonry( box ) {
	const figs = visibleItems( box );
	const dims = figs.map( ( f ) => ( { w: +f.dataset.w || 4, h: +f.dataset.h || 3 } ) );
	const cols = columnsFor( box );
	// Resolve both gaps per viewport (matches the editor's device-resolved gaps).
	// Horizontal gap spaces the columns (and sizes colWidth so they fill exactly);
	// vertical gap spaces the stacked tiles.
	const gapV = pickResponsive( box.dataset.gapV, 20 );
	const gapH = pickResponsive( box.dataset.gapH, gapV );
	const colWidth = ( contentWidth( box ) - gapH * ( cols - 1 ) ) / cols;

	box.style.position = 'relative';
	box.style.columnCount = 'unset';
	/*
	 * Read AFTER `is-measured` is on the container (reflow() sets it), so the CSS
	 * columns fallback's own bottom margin is already out of the way and this sees
	 * only the user's Margin.
	 *
	 * The margin is kept, not zeroed — zeroing is what made the control do nothing
	 * here. For an absolutely positioned box `left`/`top` place the MARGIN edge, so
	 * leaving the margin in place and taking it off the width/height puts the tile's
	 * outer box exactly on the `p` rectangle computeMasonry produced: the column
	 * still lands on its track and the margin reads as the gutter.
	 */
	const m = itemMargin( figs[ 0 ] );
	const insetY = itemInsetY( figs[ 0 ] );
	const frames = figs.map( ( f ) => itemFrame( f ) );

	/*
	 * Masonry is the one layout that has to be TOLD how tall a Classic content block
	 * comes out, because it packs its columns from heights: a tile whose real height
	 * is `media + content` but whose packed height is only `media` places every tile
	 * after it in that column on top of the one before. Nothing can compute the answer
	 * — how many lines a title and description wrap to at a given width is a question
	 * only a laid-out browser answers — so it is measured.
	 *
	 * Writes first, then reads, so the whole gallery costs ONE forced layout rather
	 * than one per tile. The width is what a caption's height depends on, so it is
	 * written from `Math.floor(colWidth)`: the narrowest any real column can round to,
	 * which makes the measured height the tallest the caption can be. Erring tall
	 * leaves at most a hairline of slack between two tiles; erring short would overlap
	 * them.
	 *
	 * Skipped entirely for a gallery with no in-flow content — the common case, and
	 * the reason an Overlay or caption-less masonry reflow is exactly as cheap as it
	 * was before Classic was measured at all.
	 */
	if ( hasClassicContent( box ) ) {
		const probe = Math.max( 0, Math.floor( colWidth ) );
		figs.forEach( ( f, i ) => {
			f.style.width = Math.max( 0, probe - m.left - m.right ) + 'px';
			f.style.height = '';
			if ( frames[ i ] ) {
				const band = Math.round( ( dims[ i ].h / dims[ i ].w ) * probe );
				frames[ i ].style.height = Math.max( 0, band - m.top - m.bottom - insetY ) + 'px';
			}
		} );
		// Read phase — no writes in here, or each one invalidates the layout again.
		figs.forEach( ( f, i ) => {
			dims[ i ].extra = frames[ i ] ? contentHeight( f ) : 0;
		} );
	}

	const { positions, height } = computeMasonry( dims, cols, colWidth, gapH, gapV );

	figs.forEach( ( f, i ) => {
		const p = positions[ i ];
		if ( ! p ) {
			return;
		}
		f.style.position = 'absolute';
		f.style.left = p.left + 'px';
		f.style.top = p.top + 'px';
		f.style.width = Math.max( 0, p.width - m.left - m.right ) + 'px';
		// `p.media` is the band alone; `p.height` is band + content. The tile is left
		// auto so it always FITS its content — the packing reserved the room for it,
		// and if a caption ends up a pixel off what the probe measured the tile grows
		// to cover it instead of clipping the text.
		applyBand( f, frames[ i ], p.media, m, insetY );
	} );
	box.style.height = height + 'px';
}

/**
 * Galleries that asked to be measured while they had no box to measure.
 *
 * Emptied by `flushDeferred()` the next time the viewport changes. A Set because a
 * gallery can defer more than once (hidden on desktop AND on tablet) and must be
 * re-measured once, not once per attempt.
 *
 * @type {Set<HTMLElement>}
 */
const deferred = new Set();

/**
 * Reflow a container according to its layout.
 *
 * @param {HTMLElement} box Container.
 */
function reflow( box ) {
	const layout = box.dataset.layout;
	if ( 'justified' !== layout && 'masonry' !== layout ) {
		return;
	}

	/*
	 * Nothing to measure yet — the gallery is inside a `display:none` ancestor, which
	 * Advanced → Visibility's "Hide on <device>" is the ordinary way to arrange.
	 *
	 * Measuring anyway is not merely useless, it is destructive and it STICKS.
	 * `contentWidth()` returns 0, so masonry writes 1px tiles, pins the container to
	 * the height that implies and drops `column-count` — and `is-measured` below has
	 * by then taken away the CSS-columns fallback that would have kept the gallery
	 * readable without JS. Nothing re-measured it afterwards: ResizeObserver reports
	 * no size change for an element that never had a box to begin with, so crossing
	 * the breakpoint that reveals the gallery does not wake it. The only thing that
	 * did was a late `load` on one of its images — which never fires when the images
	 * are already in cache. A gallery hidden on desktop and revealed by a resize came
	 * back as a row of 1px squares, permanently.
	 *
	 * So defer: leave the layout to CSS, remember the gallery, and re-measure when
	 * the viewport next changes (§19 — degrade visibly, never silently).
	 */
	if ( 0 === contentWidth( box ) ) {
		deferred.add( box );
		return;
	}

	/*
	 * Nothing IN it to measure either. Server-rendered markup always ships its tiles,
	 * so on the front end this is the all-filtered-out case rather than a race — but
	 * the editor hook, which mounts its tiles a render after their container, gets
	 * here routinely and setting `is-measured` for an empty gallery is what took away
	 * masonry's fallback row gap while giving it no geometry in exchange. The guard
	 * lives on both sides so the two keep measuring alike (§18), and deferring rather
	 * than returning outright means a gallery whose tiles arrive later is picked up by
	 * the next viewport change like any other deferred one.
	 */
	if ( 0 === visibleItems( box ).length ) {
		deferred.add( box );
		return;
	}

	deferred.delete( box );

	/*
	 * "The geometry is JS-owned from here." Set BEFORE the layout runs, because the
	 * layout reads the tile margin back and masonry's no-JS fallback rule (a bottom
	 * margin standing in for the row-gap CSS columns lack) would otherwise be part
	 * of that reading. Never removed — once the runtime has measured a gallery it
	 * keeps measuring it.
	 */
	box.classList.add( 'is-measured' );

	if ( 'justified' === layout ) {
		layoutJustified( box );
	} else {
		layoutMasonry( box );
	}
}

/**
 * Reflow, and record how long it took when Debug Performance is watching.
 *
 * `window.shapedGalleryDebug` is printed only for an administrator with the toggle on
 * (`Core\DebugPerformance`), so for every visitor this is one property lookup and the
 * plain call — no `performance` API touched, nothing accumulated, no global created.
 *
 * Only the FIRST reflow of each gallery is measured. Resize and image-load reflows run
 * on the same code with the same inputs; timing them would fill the report with
 * duplicates of the number that already answers "is the layout maths slow here".
 *
 * @param {HTMLElement} box Container.
 */
function measuredReflow( box ) {
	const debug = window.shapedGalleryDebug;

	if ( ! debug || ! debug.reflow ) {
		reflow( box );
		return;
	}

	const started = performance.now();
	reflow( box );
	debug.reflow.push( {
		gallery: box.id || box.dataset.layout || 'gallery',
		layout: box.dataset.layout || '',
		items: box.querySelectorAll( '.sp-shaped-gallery__item' ).length,
		ms: Math.round( ( performance.now() - started ) * 100 ) / 100,
	} );
}

/**
 * Re-measure every gallery that had nothing to measure last time.
 *
 * The wake-up call for a Responsive Visibility gallery: crossing the breakpoint
 * that reveals it is a viewport change, and a viewport change is the one signal
 * that reaches a `display:none` subtree — its own ResizeObserver does not fire,
 * because an element that never had a box has no size change to report.
 *
 * Cheap when nothing deferred (the common case is an empty Set), and it drops
 * galleries that have since left the document so a long-lived page cannot hold
 * detached nodes alive through this Set.
 *
 * @return {void}
 */
function flushDeferred() {
	if ( 0 === deferred.size ) {
		return;
	}

	Array.from( deferred ).forEach( ( box ) => {
		if ( box.isConnected ) {
			reflow( box );
		} else {
			deferred.delete( box );
		}
	} );
}

/**
 * Watch for the viewport changes that can reveal a hidden gallery.
 *
 * One pair of listeners for the page, not one per gallery: the question they
 * answer ("did the viewport change?") is the same for all of them, and the work
 * is skipped outright when nothing is waiting. Coalesced through
 * `requestAnimationFrame` for the same reason each gallery's ResizeObserver is —
 * a drag-resize fires `resize` far faster than a layout can be measured.
 *
 * `orientationchange` is listed alongside `resize` because rotating a phone is
 * precisely the gesture that moves a gallery between the Mobile Portrait and
 * Mobile Landscape bands, and it is the one case where the two events are not
 * reliably interchangeable across browsers.
 *
 * @return {void}
 */
function watchViewport() {
	let raf = null;
	const onChange = () => {
		if ( raf ) {
			cancelAnimationFrame( raf );
		}
		raf = requestAnimationFrame( flushDeferred );
	};

	window.addEventListener( 'resize', onChange );
	window.addEventListener( 'orientationchange', onChange );
}

/* ---------------- Init ---------------- */

/**
 * Initialise every gallery on the page.
 */
function init() {
	const boxes = Array.from( document.querySelectorAll( '.sp-shaped-gallery' ) );

	watchViewport();
	boxes.forEach( ( box ) => {
		// Image & Video behaviours (preloader / inline video) are layout-agnostic,
		// so they are wired first. Each one self-gates on what the renderer emitted.
		initMedia( box );

		measuredReflow( box );

		if ( typeof ResizeObserver !== 'undefined' ) {
			let raf = null;
			const ro = new ResizeObserver( () => {
				if ( raf ) {
					cancelAnimationFrame( raf );
				}
				raf = requestAnimationFrame( () => reflow( box ) );
			} );
			ro.observe( box );
		}

		// Re-run once images load (intrinsic dims may shift first paint).
		box.querySelectorAll( 'img' ).forEach( ( img ) => {
			if ( ! img.complete ) {
				img.addEventListener( 'load', () => reflow( box ), { once: true } );
			}
		} );

		// Ajax Pagination: wire the Load More runtime when the renderer emitted a
		// pagination bar as a sibling of this gallery. `reflow` is handed
		// in so appended items re-lay measured (justified/masonry) layouts; the
		// lightbox bundle's delegated handler already covers new tiles with no
		// rebinding, because it builds its slide set from the DOM at click time.
		const bar = box.parentElement
			? box.parentElement.querySelector( '.sp-shaped-gallery__pagination' )
			: null;
		if ( bar ) {
			initPagination( box, bar, { reflow } );
		}
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

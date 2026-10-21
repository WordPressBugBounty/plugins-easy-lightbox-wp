/**
 * Applies pixel geometry to the measured layouts (justified / masonry) inside a
 * gallery container, using the SAME layout-math the frontend runtime uses so the
 * editor matches the frontend exactly. The Grid layout is a no-op here — it lays
 * out from CSS alone.
 *
 * Shared by the static GalleryPreview and the editable inner-blocks preview so
 * the reflow glue lives in one place (§18: no duplicated editor logic).
 */
import { useEffect, useCallback } from '@wordpress/element';
import { computeJustified, computeMasonry } from '@shaped-gallery/lib/layout-math';
import { contentHeight, contentWidth, itemFrame, itemInsetY, itemMargin } from '@shaped-gallery/lib/measure';
import { effectiveRowHeight } from '@shaped-gallery/lib/style';

/**
 * @param {Object} containerRef          React ref to the `.sp-shaped-gallery` element.
 * @param {Object} options
 * @param {string} options.layout        Active layout id.
 * @param {Array}  options.items         MediaItem[]. Watched, not read: the ratios
 *                                       come off each tile's own `data-w`/`data-h`
 *                                       (see the reflow), but an add / remove /
 *                                       reorder still has to re-measure. Not enough
 *                                       on its own for inner-block tiles, which can
 *                                       mount a commit later — see the
 *                                       MutationObserver in the effect.
 * @param {string} options.rowHeightMode Justified row-height mode ('auto'|'custom').
 * @param {number} options.maxRowHeight  Justified custom target row height.
 * @param {number} options.gh            Horizontal gap (px, resolved for device).
 * @param {number} options.gv            Vertical gap (px, resolved for device).
 * @param {number} options.cols          Column count (masonry).
 * @param {Object} [options.margin]      Per-item Margin bundle — not read directly
 *                                       (it reaches the DOM as a custom property),
 *                                       only watched so a change re-measures.
 * @param {Object} [options.content]     Grouped `content` attribute — watched for
 *                                       the same reason as `margin`: it decides how
 *                                       tall a Classic content block comes out.
 * @param {string} [options.device]      Active editor device — watched because the
 *                                       content custom properties are resolved for
 *                                       it, so it too changes that height.
 */
export function useMeasuredLayout(
	containerRef,
	{ layout, items, rowHeightMode, maxRowHeight, gh, gv, cols, margin, content, device }
) {
	const reflow = useCallback( () => {
		const box = containerRef.current;
		if ( ! box ) {
			return;
		}
		// The same measurement the frontend runtime uses, or the preview and the
		// rendered gallery would disagree despite sharing the geometry (§18).
		const width = contentWidth( box );
		const figs = Array.from( box.querySelectorAll( '.sp-shaped-gallery__item' ) );
		// The media frames, resolved once: every write below targets them rather than
		// the tile, so a Classic content block keeps its own flow height (§ measure.js
		// `itemFrame`). Null for markup that predates the frame — see `applyBand`.
		const frames = figs.map( ( f ) => itemFrame( f ) );
		// Reset inline geometry so CSS layouts (and re-measures) start clean. The
		// frame's height is part of that now: a layout switch (masonry → grid, say)
		// leaves a stale pixel band behind otherwise, and grid's aspect ratio would
		// never get to apply.
		figs.forEach( ( f, i ) => {
			f.style.width = '';
			f.style.height = '';
			f.style.position = '';
			f.style.left = '';
			f.style.top = '';
			f.style.flex = '';
			if ( frames[ i ] ) {
				frames[ i ].style.height = '';
			}
		} );
		box.style.height = '';
		box.style.position = '';
		box.style.columnGap = '';
		box.style.rowGap = '';

		/*
		 * Nothing to measure — the preview is in a collapsed or not-yet-laid-out part
		 * of the canvas. The frontend runtime bails on the same condition and for the
		 * same reason (§18: the two must MEASURE alike, not merely share the math): a
		 * zero-width measurement writes 1px masonry tiles, and `is-measured` below
		 * would take away the CSS fallback that keeps the gallery readable until a
		 * real width arrives. The reset above already left the tiles clean, so
		 * returning here leaves CSS in charge; the effect re-runs on the next
		 * ResizeObserver callback, which in the editor DOES fire — the container is
		 * only ever zero-width, never boxless.
		 */
		/*
		 * NO TILES is the same situation, and not covering it is what made masonry's
		 * vertical gap vanish on every canvas load.
		 *
		 * In the editable preview each tile is an inner block, so the container mounts a
		 * render before its children exist — and Gutenberg adding them re-renders neither
		 * this component nor its parent, so this runs, finds a real width and zero
		 * figures, and used to set `is-measured` anyway. That class is the switch on
		 * masonry's no-JS fallback: the bottom margin standing in for the row gap CSS
		 * multi-column layout does not have. So the gallery lost the CSS gap while never
		 * gaining the JS geometry meant to replace it — neither source, no gap. Editing
		 * the gap appeared to fix it only because the edit changes `gv`, which rebuilds
		 * this callback and re-runs it against a canvas that by then had tiles; a reload
		 * put it straight back.
		 */
		if ( 0 === width || 0 === figs.length ) {
			box.classList.remove( 'is-measured' );
			return;
		}

		/*
		 * Intrinsic ratios come off each tile's own `data-w`/`data-h`, which is exactly
		 * how the frontend runtime reads them (`layoutJustified` / `layoutMasonry`) —
		 * so the two now measure identically as well as sharing the math (§18).
		 *
		 * It used to map `items` by INDEX onto the DOM's figures, which pairs two arrays
		 * that different mechanisms update. In the editable preview a drag-reorder
		 * updates the inner blocks (and therefore the DOM) before `items` catches up, so
		 * for at least one render every tile was sized with another tile's aspect ratio
		 * — a visible jump right after the drop, on the two layouts whose geometry is
		 * measured. Reading per tile cannot mis-pair, and it also makes `figs.length` and
		 * `dims.length` equal by construction.
		 */
		const dims = figs.map( ( f ) => ( {
			w: Number( f.dataset.w ) || 4,
			h: Number( f.dataset.h ) || 3,
		} ) );

		// "The geometry is JS-owned from here", exactly as the frontend runtime's
		// reflow() marks it — masonry's no-JS fallback margin is scoped to the absence
		// of this class, so it has to be on before itemMargin() reads anything.
		box.classList.toggle( 'is-measured', layout === 'justified' || layout === 'masonry' );

		/*
		 * The geometry sizes the FRAME and leaves the tile auto — the same split the
		 * frontend runtime makes, and for the same reason: the tile is also the flow
		 * container for a Classic content block, so pinning it to the media's height
		 * is what squeezed the title and description out of the canvas (§18: the two
		 * must measure alike, not merely share the math).
		 *
		 * The inset comes off the band because the tile's border and padding are now
		 * outside it rather than inside, so an unstyled gallery renders at exactly the
		 * height it did before the frame existed.
		 */
		const applyBand = ( fig, frame, outer, m, insetY ) => {
			if ( frame ) {
				frame.style.height = Math.max( 0, outer - m.top - m.bottom - insetY ) + 'px';
				fig.style.height = '';
				return;
			}
			fig.style.height = Math.max( 0, outer - m.top - m.bottom ) + 'px';
		};

		if ( layout === 'justified' ) {
			// The Image & Video Settings → Margin control targets this same tile box, so
			// both measured layouts subtract it from the size they write. Read inside the
			// branch, like the frontend runtime does: `getComputedStyle` forces a style
			// recalc, and a CSS-Grid layout reaches neither branch and needs neither.
			const m = itemMargin( figs[ 0 ] );
			const insetY = itemInsetY( figs[ 0 ] );
			// Match GeometryVars::effective_row_height(): auto pins to the default
			// target, custom uses the configured height — so preview ⇄ SSR agree.
			const target = effectiveRowHeight( rowHeightMode, maxRowHeight );
			// Pin the flex gaps to the exact values fed to the geometry, as the frontend
			// runtime does — the row maths and the rendered gap must be one number, or a
			// unit the CSS var resolves differently (or a stale breakpoint var) makes the
			// rows overflow and wrap (§18).
			box.style.columnGap = gh + 'px';
			box.style.rowGap = gv + 'px';
			const boxes = computeJustified( dims, width, target, gh );
			// Width on the tile, band on the frame, height left alone: the flex line
			// equalises the row, so a row of uneven captions still ends level.
			boxes.forEach( ( b, i ) => {
				if ( figs[ i ] ) {
					figs[ i ].style.width = Math.max( 0, b.width - m.left - m.right ) + 'px';
					// The stylesheet's no-JS `flex: 1 1 auto` would grow every tile into the
					// row's spare room — a partial last row stretched edge to edge in the
					// canvas while the frontend leaves it at its computed width.
					figs[ i ].style.flex = '0 0 auto';
					applyBand( figs[ i ], frames[ i ], b.height, m, insetY );
				}
			} );
		} else if ( layout === 'masonry' ) {
			const m = itemMargin( figs[ 0 ] );
			const insetY = itemInsetY( figs[ 0 ] );
			// Horizontal gap sizes/spaces the columns; vertical gap spaces the tiles
			// (same argument order the frontend runtime feeds computeMasonry).
			const colWidth = ( width - gh * ( cols - 1 ) ) / cols;

			/*
			 * Masonry packs its columns from heights, so it is the one layout that has to
			 * be told how tall a Classic content block comes out — see the frontend
			 * runtime's `layoutMasonry`, which this mirrors write for write. Probe at
			 * `floor(colWidth)`, the narrowest a real column can round to, so the measured
			 * caption is the tallest it can be and the packing errs towards a hairline of
			 * slack rather than an overlap. Writes are batched ahead of the reads so the
			 * canvas costs one forced layout, and the whole pass is skipped for a gallery
			 * whose content is Overlay or off.
			 */
			if ( box.querySelector( '.sp-shaped-gallery__content.is-classic' ) ) {
				const probe = Math.max( 0, Math.floor( colWidth ) );
				figs.forEach( ( f, i ) => {
					f.style.width = Math.max( 0, probe - m.left - m.right ) + 'px';
					if ( frames[ i ] ) {
						const band = Math.round( ( dims[ i ].h / dims[ i ].w ) * probe );
						frames[ i ].style.height = Math.max( 0, band - m.top - m.bottom - insetY ) + 'px';
					}
				} );
				figs.forEach( ( f, i ) => {
					dims[ i ].extra = frames[ i ] ? contentHeight( f ) : 0;
				} );
			}

			const { positions, height } = computeMasonry( dims, cols, colWidth, gh, gv );
			figs.forEach( ( f, i ) => {
				const p = positions[ i ];
				if ( ! p ) {
					return;
				}
				f.style.position = 'absolute';
				f.style.left = p.left + 'px';
				f.style.top = p.top + 'px';
				f.style.width = Math.max( 0, p.width - m.left - m.right ) + 'px';
				// `p.media` is the band; `p.height` is band + content. The tile stays auto
				// so it always fits the text the packing already reserved room for.
				applyBand( f, frames[ i ], p.media, m, insetY );
			} );
			box.style.position = 'relative';
			box.style.height = height + 'px';
		}
		// `margin` is in the dep list because it changes the box this hook writes but
		// is not otherwise read here — the value reaches the DOM as a custom property
		// on the container, so without it a Margin edit would leave the canvas holding
		// geometry measured against the previous margin until the next resize.
		//
		// `content` and `device` are there for the same reason, and masonry is why it
		// matters: the packing reserves a MEASURED content height per tile, so every
		// Content Settings edit that changes how tall a Classic block comes out —
		// switching the title or the description on, the display style, the tag, the
		// typography, the padding, the gap, the line clamp — invalidates geometry the
		// canvas is still holding. Nothing else brings the hook back: the tiles are
		// absolutely positioned inside a container whose height this hook writes, so
		// the caption growing changes no box the ResizeObserver watches. Enabling the
		// title and description on a measured masonry canvas therefore left every tile
		// packed as if its caption were zero tall, drawn over the tile below it, until
		// the next resize or gap edit. `device` because the content custom properties
		// are resolved for the active device (`contentStyle()`), and gap and column
		// count — the only device-resolved values already watched — can be identical
		// across two breakpoints whose content sizing is not.
	}, [ containerRef, layout, items, rowHeightMode, maxRowHeight, gh, gv, cols, margin, content, device ] );

	useEffect( () => {
		reflow();
		const box = containerRef.current;
		if ( ! box ) {
			return undefined;
		}

		/*
		 * Two things can invalidate the geometry without this component rendering
		 * again, so there are two observers.
		 *
		 * The ResizeObserver covers the container's own width changing.
		 *
		 * The MutationObserver covers the TILE SET changing underneath the hook. In the
		 * editable preview each tile is an inner block, and an `items` change from
		 * outside the canvas (the media modal's Add, Edit Gallery) reaches the editor
		 * through `useBlockSync`, which mints new clientIds for every inner block — so
		 * the block list unmounts every tile and mounts fresh ones, in a LATER commit
		 * than the one that ran this effect. The `items` dependency therefore reflowed
		 * the tiles about to be thrown away, and their replacements arrived with no
		 * inline geometry inside a container still `is-measured` and still pinned to
		 * the old height. On masonry that is CSS multi-column under a fixed height,
		 * which overflows sideways: every column past the pinned height spilled to the
		 * right of the canvas as a horizontal scrollbar. Nothing woke the hook either —
		 * the container's height is the inline one written above, so it did not resize.
		 * The first Add only escaped because a never-measured container has no pinned
		 * height: it grew as the tiles flowed in, and that growth was a resize.
		 *
		 * `childList` on the container alone: tiles are its direct children, and
		 * everything `reflow` writes is a style or a class, never a child, so it cannot
		 * trigger itself. The frontend runtime needs no equivalent — it inserts its own
		 * tiles (Load More) and calls `reflow` after; here Gutenberg does the inserting,
		 * so the DOM is the only witness.
		 */
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver( reflow ) : null;
		const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver( reflow ) : null;
		ro?.observe( box );
		mo?.observe( box, { childList: true } );
		return () => {
			ro?.disconnect();
			mo?.disconnect();
		};
	}, [ reflow, containerRef ] );
}

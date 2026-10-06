/**
 * Pure layout geometry helpers — no DOM, no React. Imported by the frontend
 * reflow script, the editor preview and the Jest unit tests so the algorithm
 * lives in exactly one place.
 */

/**
 * Justified layout: scale each row of images so it exactly fills the container
 * width at (around) the target row height. Flickr/justified-layout style.
 *
 * @param {Array<{w:number,h:number}>} items     Intrinsic dimensions.
 * @param {number}                     container Container width in px.
 * @param {number}                     target    Target row height in px.
 * @param {number}                     gap       Horizontal gap in px.
 * @return {Array<{width:number,height:number,row:number}>} Computed box sizes.
 */
export function computeJustified( items, container, target, gap ) {
	const out = [];
	if ( ! items.length || container <= 0 ) {
		return out;
	}

	let row = [];
	let rowAspect = 0;
	let rowIndex = 0;

	const flush = ( isLast ) => {
		if ( ! row.length ) {
			return;
		}
		const gaps = gap * ( row.length - 1 );
		// Height that makes the summed scaled widths fill (container - gaps).
		let height = ( container - gaps ) / rowAspect;
		// Last row: never upscale beyond the target height.
		if ( isLast && height > target ) {
			height = target;
		}
		const rowHeight = Math.round( height );

		/*
		 * Round the running EDGE, never each width on its own.
		 *
		 * Independently rounded widths each carry up to half a pixel of error, so a
		 * row of them can total a pixel or two more than `container - gaps` even
		 * though the exact widths sum to it precisely. The frontend lays these out
		 * in a `flex-wrap` container, where ONE pixel of overflow ejects the row's
		 * last tile onto the next row — and every following row inherits the
		 * displacement, so the whole gallery stops being justified. It is also
		 * data-dependent (a row whose roundings happen to cancel looks fine), which
		 * is what makes it read as intermittent rather than broken.
		 *
		 * Taking the difference between consecutive rounded edges keeps every width
		 * a whole pixel AND makes them sum to exactly the rounded total.
		 */
		let exactEdge = 0;
		let placed = 0;
		row.forEach( ( it ) => {
			exactEdge += ( it.w / it.h ) * height;
			// `placed` is the true running sum, so if the clamp below ever fires on a
			// degenerate aspect ratio the next tile absorbs the difference instead of
			// the row silently growing.
			const width = Math.max( 1, Math.round( exactEdge ) - placed );
			placed += width;

			out.push( {
				width,
				height: rowHeight,
				row: rowIndex,
			} );
		} );
		rowIndex += 1;
		row = [];
		rowAspect = 0;
	};

	items.forEach( ( it ) => {
		const w = it.w > 0 ? it.w : 4;
		const h = it.h > 0 ? it.h : 3;
		const aspect = w / h;
		row.push( { w, h } );
		rowAspect += aspect;
		// Projected row width at target height; flush once it overflows.
		const projected = rowAspect * target + gap * ( row.length - 1 );
		if ( projected >= container ) {
			flush( false );
		}
	} );
	flush( true );

	return out;
}

/**
 * Masonry layout: place each item in the currently shortest column.
 *
 * The two axes take independent gaps: `gapX` spaces the columns horizontally
 * (and must match the gap `columnWidth` was derived with, so the columns fill
 * the container exactly), while `gapY` spaces stacked tiles vertically. `gapY`
 * defaults to `gapX` so single-gap callers keep their behaviour.
 *
 * An item may carry `extra`: pixels that sit BELOW (or above) the media band and
 * play no part in the aspect scaling — the Classic content block's own height. It
 * is measured from the DOM by the caller (`measure.js`'s `contentHeight()`), never
 * guessed here, because how tall a title and description come out is a question
 * only a laid-out browser can answer. Masonry is the one layout that has to know:
 * it packs columns from heights, so a tile whose real height is `media + content`
 * and whose PACKED height is only `media` puts every tile below it on top of the
 * one before. Justified needs no equivalent — it constrains widths, and a flex
 * line's own cross-size stretch equalises the rest.
 *
 * @param {Array<{w:number,h:number,extra?:number}>} items       Intrinsic dimensions (+ optional non-media height).
 * @param {number}                                   columns     Column count.
 * @param {number}                                   columnWidth Column width in px.
 * @param {number}                                   gapX        Horizontal (column) gap in px.
 * @param {number}                                   [gapY=gapX] Vertical (row) gap in px.
 * @return {{positions:Array<{left:number,top:number,width:number,height:number,media:number,column:number}>,height:number}} Tile positions and total container height.
 */
export function computeMasonry( items, columns, columnWidth, gapX, gapY = gapX ) {
	const cols = Math.max( 1, columns );
	const heights = new Array( cols ).fill( 0 );
	const positions = [];

	/*
	 * Whole-pixel column edges, taken from the running edge.
	 *
	 * `columnWidth` is fractional whenever the container does not divide evenly by
	 * the column count, so rounding IT would multiply the error by the column
	 * index and walk the right-hand column off the container edge. Rounding each
	 * cumulative edge instead — and taking the width as the difference between
	 * consecutive edges — keeps every column a whole pixel and puts the last
	 * column's right edge exactly on the container, because
	 * `(cols-1) * (columnWidth + gapX) + columnWidth` is the container width by
	 * construction.
	 *
	 * Masonry positions absolutely rather than wrapping, so unlike
	 * `computeJustified()` a stray pixel here cannot cascade — it shows up as
	 * fractional widths (soft image edges, hairline seams between columns) and a
	 * final column that misses the edge.
	 */
	const edges = [];
	for ( let c = 0; c < cols; c++ ) {
		const left = Math.round( c * ( columnWidth + gapX ) );
		const right = Math.round( c * ( columnWidth + gapX ) + columnWidth );
		edges.push( { left, width: Math.max( 1, right - left ) } );
	}

	items.forEach( ( it ) => {
		const w = it.w > 0 ? it.w : 4;
		const h = it.h > 0 ? it.h : 3;
		// Shortest column wins.
		let target = 0;
		for ( let c = 1; c < cols; c++ ) {
			if ( heights[ c ] < heights[ target ] ) {
				target = c;
			}
		}
		const column = edges[ target ];
		// Scaled from the column's OWN integer width, so the drawn box keeps the
		// item's aspect ratio rather than the pre-rounding column's.
		const media = Math.max( 1, Math.round( ( h / w ) * column.width ) );
		/*
		 * Content height is ADDED after the scaling, never scaled with it: text does
		 * not have an aspect ratio, and folding it into the ratio would both distort
		 * the image and make the tile's height depend on its own height.
		 *
		 * Rounded UP, not to nearest. A measured height is a used value and routinely
		 * fractional, and the error compounds down a column: rounding to nearest lost
		 * a fifth of a pixel per tile, which showed up as the last tile in a column
		 * hanging a fraction below the container it is absolutely positioned in.
		 * Ceiling can only ever reserve too much, and too much is a hairline of slack
		 * nobody sees — too little is a tile drawn over the one above it.
		 */
		const extra = it.extra > 0 ? Math.ceil( it.extra ) : 0;
		const scaledHeight = media + extra;
		const top = heights[ target ];
		positions.push( {
			left: column.left,
			top,
			width: column.width,
			height: scaledHeight,
			// The media band on its own, so the caller can size the frame without
			// re-deriving a ratio the rounding above has already resolved.
			media,
			column: target,
		} );
		heights[ target ] += scaledHeight + gapY;
	} );

	return {
		positions,
		height: Math.max( 0, ...heights ) - gapY,
	};
}

// Responsive resolution lives in ./responsive (single source, shared with the
// frontend runtime); re-exported here so existing importers keep working.
export { resolveResponsive } from './responsive';

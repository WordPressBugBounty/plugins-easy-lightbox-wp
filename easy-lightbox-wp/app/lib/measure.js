/**
 * The one way a measured layout asks "how wide is my content box?".
 *
 * Separate from `layout-math.js` because that module is deliberately DOM-free
 * (pure geometry, unit-testable without a browser), and separate from each
 * caller because the frontend runtime and the editor preview MUST agree — the
 * whole point of sharing the math is undone if they measure differently (§18).
 */

/**
 * A container's usable inner width, in whole pixels.
 *
 * Not `clientWidth`, for two reasons that both hand the geometry more room than
 * the layout actually has:
 *
 * - it INCLUDES horizontal padding, so a padded container computes columns and
 *   rows wider than the box they are placed in;
 * - it is an integer, rounded from a possibly fractional width — rounding UP by
 *   half a pixel is enough to push a justified row past its flex container and
 *   wrap the row's last tile (see `computeJustified()`).
 *
 * Floored rather than rounded for the same reason: a layout that comes out a
 * pixel narrow is invisible, one that comes out a pixel wide is not.
 *
 * @param {?HTMLElement} el Container element.
 * @return {number} Content width in px, never negative.
 */
export function contentWidth( el ) {
	if ( ! el ) {
		return 0;
	}

	const style = getComputedStyle( el );
	const inner =
		el.getBoundingClientRect().width -
		( parseFloat( style.paddingLeft ) || 0 ) -
		( parseFloat( style.paddingRight ) || 0 ) -
		( parseFloat( style.borderLeftWidth ) || 0 ) -
		( parseFloat( style.borderRightWidth ) || 0 );

	return Math.max( 0, Math.floor( inner ) );
}

/**
 * A tile's resolved margin, per side, in pixels.
 *
 * The two measured layouts size and position `.sp-shaped-gallery__item` themselves,
 * which is the SAME box the Image & Video Settings → Margin control targets — so
 * without reading it back the two fight, and the control looked broken in opposite
 * ways on each layout. Justified computes rows that fill the container exactly, so
 * an unaccounted margin pushed each row past its flex container and ejected the
 * last tile (§19's rounding note, one cause over). Masonry positions absolutely, so
 * the runtime simply zeroed the margin and the control did nothing at all.
 *
 * Both now subtract this from the box they write, which keeps the tile's OUTER size
 * equal to the geometry the shared math produced: the row still lands on the
 * container edge, the column still lands on its track, and the margin shows up as
 * the gutter the user asked for.
 *
 * Read from one tile rather than per tile: the margin is a gallery-wide custom
 * property (`--sp-shaped-gallery-iv-mg`), not a per-item value, so one
 * `getComputedStyle` covers the set and the reflow stays cheap.
 *
 * Lives here, next to `contentWidth()`, for the same two reasons: it touches the
 * DOM (so it cannot go in the deliberately DOM-free `layout-math.js`) and the
 * frontend runtime and the editor hook MUST agree on it (§18).
 *
 * Percentage margins resolve against the containing block's width; browsers return
 * the used pixel value here, so a `%` unit works — but it is resolved once per
 * reflow like every other measurement, not tracked live.
 *
 * @param {?HTMLElement} el A gallery tile (`.sp-shaped-gallery__item`).
 * @return {{top:number,right:number,bottom:number,left:number}} Margins in px.
 */
export function itemMargin( el ) {
	if ( ! el ) {
		return { top: 0, right: 0, bottom: 0, left: 0 };
	}

	const style = getComputedStyle( el );

	return {
		top: parseFloat( style.marginTop ) || 0,
		right: parseFloat( style.marginRight ) || 0,
		bottom: parseFloat( style.marginBottom ) || 0,
		left: parseFloat( style.marginLeft ) || 0,
	};
}

/**
 * A tile's media frame — the box a measured layout actually sizes.
 *
 * `.sp-shaped-gallery__item` cannot be that box once the Classic content block
 * exists: the figure is BOTH the thing the geometry pins to the image's aspect
 * ratio and the flow container the title / description live in, and a box can
 * only be one height. Sizing the figure therefore left the content block with no
 * space at all — it competed with the media for the pinned height (the media is
 * `flex: 1 1 0%`, so it collapsed as the text grew) and was then cut off by the
 * figure's `overflow: hidden`. `.sp-shaped-gallery__frame` splits the two jobs: the
 * frame takes the pixel geometry, the figure auto-heights to frame + content.
 *
 * Returns null for markup that predates the frame (a page cached by something
 * outside this plugin, say). Callers fall back to sizing the figure, which is
 * exactly the pre-frame behaviour — degraded, but not broken (§19).
 *
 * @param {?HTMLElement} el A gallery tile (`.sp-shaped-gallery__item`).
 * @return {?HTMLElement} The tile's media frame, or null.
 */
export function itemFrame( el ) {
	return el ? el.querySelector( ':scope > .sp-shaped-gallery__frame' ) : null;
}

/**
 * A tile's own vertical inset — border + padding, top and bottom.
 *
 * Subtracted from the media band the frame is given, so the figure's OUTER height
 * still comes to exactly the height the geometry produced. Without it a bordered
 * gallery grew by `2 × border-width` per tile the moment the frame took over
 * sizing, which on justified is enough to stop a row filling its container.
 *
 * Read from one tile like `itemMargin()`, and for the same reason: border and
 * padding are gallery-wide custom properties, not per-item values.
 *
 * @param {?HTMLElement} el A gallery tile (`.sp-shaped-gallery__item`).
 * @return {number} Border + padding, top plus bottom, in px.
 */
export function itemInsetY( el ) {
	if ( ! el ) {
		return 0;
	}

	const style = getComputedStyle( el );

	return (
		( parseFloat( style.borderTopWidth ) || 0 ) +
		( parseFloat( style.borderBottomWidth ) || 0 ) +
		( parseFloat( style.paddingTop ) || 0 ) +
		( parseFloat( style.paddingBottom ) || 0 )
	);
}

/**
 * How much flow height a tile's Classic content block takes.
 *
 * The one thing about Classic that cannot be computed: the height of a wrapped
 * title and description at a given width is a browser's answer, not arithmetic.
 * Masonry needs it (it packs columns from heights); justified and grid do not,
 * because a flex line and a grid row equalise their own cross size.
 *
 * Zero for the Overlay style and for a tile with no content block, so a gallery
 * that uses neither pays nothing — and callers are expected to skip this entirely
 * when the container holds no `.is-classic` block at all, which keeps the extra
 * measure pass off every gallery that does not need it.
 *
 * Measured PER TILE rather than once, unlike the margin and the inset: two tiles
 * in the same gallery carry different text, so this is genuinely a per-item value.
 * The rect's height is a border-box height, which is what the flow actually
 * consumes; margins are added because the content block may carry one from a theme.
 *
 * `getBoundingClientRect()` rather than `offsetHeight`, which is the same value
 * ROUNDED to an integer. Text heights are fractional almost by definition (a line
 * height times a font size), and rounding one down hands the caller less room than
 * the block occupies — which on masonry is a tile drawn a fraction into the one
 * above it, repeated down the column.
 *
 * An author who absolutely positions the block from their own stylesheet takes it
 * out of flow, so it contributes nothing — read from the computed position rather
 * than assumed from the class, or the packing would reserve space for a box that
 * is no longer there.
 *
 * @param {?HTMLElement} el A gallery tile (`.sp-shaped-gallery__item`).
 * @return {number} Flow height in px, never negative.
 */
export function contentHeight( el ) {
	const block = el ? el.querySelector( ':scope > .sp-shaped-gallery__content.is-classic' ) : null;
	if ( ! block ) {
		return 0;
	}

	const style = getComputedStyle( block );
	if ( 'absolute' === style.position || 'fixed' === style.position ) {
		return 0;
	}

	const total =
		block.getBoundingClientRect().height +
		( parseFloat( style.marginTop ) || 0 ) +
		( parseFloat( style.marginBottom ) || 0 );

	return Math.max( 0, total );
}

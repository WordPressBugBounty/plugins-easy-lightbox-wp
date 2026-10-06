/**
 * Icon set for the media manager.
 *
 * Generic UI glyphs are re-exported from `@wordpress/icons`; the media-source
 * marks are defined here as inline SVGs (no external assets, no expiring Figma
 * URLs) so the data-driven sidebar registry can reference them by key. Every
 * glyph paints with `currentColor`, so active rows recolor to the accent.
 *
 * Style mirrors the design's Lucide line icons: 24×24, stroke-based, round caps.
 *
 * **Every internal SVG id is namespaced `shaped-*`, and that is load-bearing.** A
 * `url(#id)` reference inside inline SVG resolves against the whole DOCUMENT and
 * takes the first match in tree order, not the nearest one inside its own `<svg>`.
 * Two glyphs here once both shipped `id="a"` — a layout card's clip (a 137×60
 * window) and `RadiusAllIcon`'s (a 12×12 one) — so whenever the inspector had
 * rendered a linked Border Radius control first, the layout card's artwork was
 * clipped to a 12px box and the picker showed an empty tile. Give any new
 * gradient / clip / mask / filter id a `shaped-` prefix naming the glyph it belongs
 * to; a bare letter is a collision waiting for the next icon.
 */
import { SVG, Path, Circle, Rect } from "@wordpress/primitives";

/**
 * Brand ramp — the JS twin of `app/styles/_brand.scss`, which is where the colour
 * is decided and where the rationale and the contrast measurements live (§18).
 *
 * A stylesheet cannot reach a `fill` baked into inline SVG, and the brand marks
 * below must not drift from the chrome around them, so the ramp is mirrored here.
 * This is the ONLY place a brand hex may appear in `app/**` JavaScript: anything
 * else that needs the accent imports from `@shaped-gallery/icons` rather than
 * writing a literal. Keep the values identical to `_brand.scss`.
 */

/** Primary/500 — the brand. @type {string} */
export const BRAND = '#078ddd';

/** Primary/50 — selected-surface tint. @type {string} */
export const BRAND_TINT = '#f0f6ff';

/** Primary/600 — accent TEXT (5.0:1 on white, §14) and hover fill under white labels. @type {string} */
export const BRAND_STRONG = '#0674b5';

/*
 * Artwork — the logo lockups, the Ready Patterns promo panel and the gallery
 * placeholder. Decorative: never a control's state and never behind text. The one
 * label that sits on this artwork uses BRAND_DEEP, a real ramp step (4.6:1 on
 * BRAND_ART_MID).
 */

/** Brand-mark gradient, light stop. @type {string} */
export const BRAND_GRADIENT_LIGHT = '#19baff';

/** Brand-mark gradient, dark stop. @type {string} */
export const BRAND_GRADIENT_DARK = '#0056a1';

/** Placeholder-art fill. @type {string} */
export const BRAND_ART = '#b8dff8';

/** Placeholder-art fill, softer. @type {string} */
export const BRAND_ART_SOFT = '#c9e3f2';

/** Promo-art gradient, saturated stop. @type {string} */
export const BRAND_ART_MID = '#a8daf5';

/** Primary/700 — button hover fills, and label text on the promo artwork. @type {string} */
export const BRAND_DEEP = '#055e92';

/** Brand ink — the wordmark's navy (Figma Logos 1830:388). Artwork only. @type {string} */
export const BRAND_INK = '#0a223c';

/* ------------------------------------------------------------------
 * The brand mark
 * ------------------------------------------------------------------ */

/** Gradient id for the brand mark. See the note on `ShapedMark` before changing it. */
const MARK_GRADIENT_ID = 'shaped-gallery-mark';

/** Gradient id for the mark's lens dot — its own ramp, not the tile's. Same note applies. */
const MARK_DOT_GRADIENT_ID = 'shaped-gallery-mark-dot';

/**
 * The mark's outline, in the 24-unit space every variant shares.
 *
 * Held apart from the components below so the gradient tile and the flat glyph
 * cannot drift (§18). The design draws the button glyph at 18 units, but that is
 * this same artwork at 0.75 scale -- `M14.7949 0` is `19.727 * 0.75`, the inner
 * frame's `M3.20508 2.71973` is `4.273, 3.626 * 0.75`, the play triangle's
 * `M12.3457 11.1787` is `16.46, 14.904 * 0.75` -- so it is one drawing, not two.
 */
const MARK_PATH =
	'M19.727 0A4.273 4.273 0 0 1 24 4.273v15.454A4.273 4.273 0 0 1 19.727 24H4.217A4.274 4.274 0 0 1 0 19.727V4.273A4.274 4.274 0 0 1 4.218 0zM4.273 3.626a.647.647 0 0 0-.647.647v15.454c0 .357.29.647.647.647h5.312l-.002-.216c0-5.84 4.735-10.575 10.575-10.575l.216.002V4.273a.647.647 0 0 0-.647-.647zM16.46 14.904a.73.73 0 0 0-1.093.632v4.108c0 .561.607.912 1.093.631l3.554-2.053a.73.73 0 0 0 0-1.264z';

/**
 * The lens dot, in that same 24-unit space — a separate shape rather than a fourth
 * subpath of `MARK_PATH`, because the two marks paint it differently (the gradient
 * tile gives it its own ramp, the flat glyph takes `currentColor`) and because a
 * cut-out inside the knocked-out interior would need a `fill-rule` the compound
 * path deliberately avoids.
 *
 * Held here for the same reason the outline is: both marks draw it, so neither can
 * drift (§18). The design exports it at 18 units (cx/cy 6.70144, r 1.78058); these
 * are those numbers at the 24/18 scale the shared viewBox uses.
 */
const MARK_DOT = { cx: 8.935, cy: 8.935, r: 2.374 };

/**
 * The dot gradient's vertical span — the design's own `y1`/`y2`, which are exactly
 * `cy ∓ r` above.
 *
 * Written out rather than computed for the same reason `MARK_PATH` is a literal:
 * these are numbers off an export, not a calculation. Computing them also gets
 * `8.935 + 2.374` = 11.309000000000001, and the tidy-up (`.toFixed( 3 )`) is one
 * thing the minifier will not fold — it shipped the noisy literal AND a `Number()`
 * call on every render. Keep in step with `MARK_DOT` by hand; they move together
 * only if the design redraws the dot.
 */
const MARK_DOT_TOP = 6.561;
const MARK_DOT_BOTTOM = 11.309;

/**
 * ShapedGallery brand mark — the plugin's one logo, at whatever size the caller asks.
 *
 * A rounded tile read as a picture frame: the interior is knocked out, a
 * quarter-disc rises from the bottom edge to the right one, and a play triangle is
 * knocked out of that disc. Three subpaths in one compound path, the outer wound
 * opposite the two cut-outs, so the glyph takes a single fill and needs no
 * `fill-rule` — the default nonzero is what shapes it. Painted with the brand-mark
 * gradient, top-light to bottom-dark. A lens dot (`MARK_DOT`) sits in the knocked-out
 * interior, upper-left.
 *
 * **The dot runs its own gradient, not the tile's.** Sampling the tile ramp at the
 * dot's height would give it one near-flat mid-blue; the design instead runs the
 * full light-to-dark stops across the dot's own 4.748 units, so it reads as a lens
 * rather than a hole. That is the whole reason there are two gradient defs here and
 * not one — same two stops, different `y1`/`y2`.
 *
 * This replaced the four-pane grid tile the plugin used while the brand was pink.
 * That artwork existed three times over — the block icon, the dashboard header tile
 * and the picker lockup each drew their own, in two different arrangements and two
 * different gradients — so the mark now lives here alone and those three are size
 * presets of it (§18). `viewBox` is fixed at 24 and the art fills it edge to edge,
 * so any `size` is a clean scale.
 *
 * **On the gradient id.** `app/icons/index.js`'s header warns that a bare `url(#id)`
 * resolves against the whole DOCUMENT and takes the first match in tree order, which
 * is why every id in this file is `shaped-`prefixed. This one id is deliberately shared
 * by every instance rather than made unique per render: the danger that rule guards
 * against is two DIFFERENT defs answering to one id, and here there is a single
 * definition rendered N times, so whichever instance wins is the same gradient. That
 * matters because Gutenberg paints the block icon in the inserter, the breadcrumb and
 * the block card at once — three instances on screen, one correct gradient.
 *
 * @param {Object} props
 * @param {number} [props.size] Rendered edge length in px.
 * @return {JSX.Element} Icon.
 */
export const ShapedMark = ( { size = 24 } ) => (
	<svg width={ size } height={ size } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d={ MARK_PATH }
			fill={ `url(#${ MARK_GRADIENT_ID })` }
		/>
		<circle
			cx={ MARK_DOT.cx }
			cy={ MARK_DOT.cy }
			r={ MARK_DOT.r }
			fill={ `url(#${ MARK_DOT_GRADIENT_ID })` }
		/>
		<defs>
			<linearGradient id={ MARK_GRADIENT_ID } x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse">
				<stop stopColor={ BRAND_GRADIENT_LIGHT } />
				<stop offset="1" stopColor={ BRAND_GRADIENT_DARK } />
			</linearGradient>
			{ /* Spans the dot's own bounds — cy ∓ r — so it runs the whole ramp. */ }
			<linearGradient
				id={ MARK_DOT_GRADIENT_ID }
				x1={ MARK_DOT.cx }
				y1={ MARK_DOT_TOP }
				x2={ MARK_DOT.cx }
				y2={ MARK_DOT_BOTTOM }
				gradientUnits="userSpaceOnUse"
			>
				<stop stopColor={ BRAND_GRADIENT_LIGHT } />
				<stop offset="1" stopColor={ BRAND_GRADIENT_DARK } />
			</linearGradient>
		</defs>
	</svg>
);

/**
 * The brand mark in one flat colour — the Ready Patterns launch button's glyph
 * (Figma 3011:54384).
 *
 * One thing separates it from `ShapedMark`: it fills with `currentColor`, so the
 * button's own `color` paints both shapes and no brand hex is written here (§14).
 * The drawing is the same — `MARK_PATH` and `MARK_DOT` in the shared 24-unit
 * viewBox. (The dot used to be this glyph's alone, which is why the two were once
 * described as differing in shape as well; the gradient tile carries it now, so the
 * fill is the only difference left.) Taking a flat colour means it needs no `defs`,
 * so unlike `ShapedMark` it puts no id into the document at all.
 *
 * @param {Object} props
 * @param {number} [props.size] Rendered edge length in px.
 * @return {JSX.Element} Icon.
 */
export const ShapedMarkMono = ( { size = 18 } ) => (
	<svg width={ size } height={ size } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d={ MARK_PATH } fill="currentColor" />
		<circle cx={ MARK_DOT.cx } cy={ MARK_DOT.cy } r={ MARK_DOT.r } fill="currentColor" />
	</svg>
);

/* Generic UI icons (used by toolbar / controls). */
export { chevronDown, search, check, close, closeSmall, link } from "@wordpress/icons";


/**
 * Shared presentation props for the stroke (line) icons.
 */
const stroke = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
};


/* ------------------------------------------------------------------ *
 * ShapedGallery Layouts — the preset thumbnails (Figma node 236:18966)
 *
 * One artwork per entry in `app/picker/layouts.data.js`, drawn on the picker
 * cards, the Change Layout popover's compact swatches and the Layout Settings
 * source row — §18's one picture of a layout, shown in three places.
 *
 * Geometry is DATA, not exported path blobs. The design frames all three
 * presets on the same 248×157 board with the tile grid inset 36.5 × 20.167, so
 * the board lives once in `layoutPreset()` and a preset is only its tile list.
 *
 * The viewBox stays the 158×100 the card's preview box actually measures, so
 * one unit is one CSS pixel at the canonical size and every number below can be
 * read straight off the rendered card; scale by 248/158 to get back to Figma's
 * frame. That leaves the board inset 23.25 × 12.85, a 3.7 gutter and a 1.86
 * tile radius — shared by all three presets, which is what lines their columns
 * up with each other across the picker.
 * ------------------------------------------------------------------ */

/**
 * Preset/Background — the board behind the tiles. The JS twin of
 * `$sp-shaped-gallery-preset-bg`, which paints that same board as the preview
 * box's CSS background; a stylesheet cannot reach a `fill` baked into inline
 * SVG, so the two must be changed together (§18).
 *
 * @type {string}
 */
const PRESET_BG = '#f9fbfe';

/** Preset/Foreground Lite — every tile. @type {string} */
const PRESET_FG = '#a6b3c3';

/** Tile corner radius, in viewBox units — 8.3% of a tile's height, as designed. @type {number} */
const PRESET_RADIUS = 1.86;

/**
 * Draw one layout preset: the board, then its tiles.
 *
 * Not a component — the registry entries are elements rather than element
 * types, so this is called at module scope and its result is what's exported.
 *
 * @param {Array.<number[]>} tiles `[ x, y, width, height ]` per tile, in viewBox units.
 * @return {JSX.Element} Thumbnail.
 */
const layoutPreset = ( tiles ) => (
	<svg width="158" height="100" viewBox="0 0 158 100" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path className="sp-shaped-gallery-layout-icon-bg" fill={ PRESET_BG } d="M0 0h158v100H0z" />
		{ tiles.map( ( [ x, y, width, height ] ) => (
			<rect
				key={ `${ x }-${ y }` }
				x={ x }
				y={ y }
				width={ width }
				height={ height }
				rx={ PRESET_RADIUS }
				fill={ PRESET_FG }
			/>
		) ) }
	</svg>
);

/** Auto. Justified — rows of equal height, each filled to the width by tiles of their own widths. */
export const LayoutAutoJustified = layoutPreset( [
	[ 23.25, 12.85, 52.98, 22.3 ],
	[ 79.93, 12.85, 27.88, 22.3 ],
	[ 111.51, 12.85, 23.24, 22.3 ],
	[ 23.25, 38.85, 35.32, 22.3 ],
	[ 62.27, 38.85, 30.67, 22.3 ],
	[ 96.64, 38.85, 38.11, 22.3 ],
	[ 23.25, 64.85, 30.67, 22.3 ],
	[ 57.62, 64.85, 47.4, 22.3 ],
	[ 108.72, 64.85, 26.03, 22.3 ],
] );

/** Grid — a uniform 3 × 3; every tile the same box. */
export const LayoutGrid = layoutPreset( [
	[ 23.25, 12.85, 34.7, 22.3 ],
	[ 61.65, 12.85, 34.7, 22.3 ],
	[ 100.05, 12.85, 34.7, 22.3 ],
	[ 23.25, 38.85, 34.7, 22.3 ],
	[ 61.65, 38.85, 34.7, 22.3 ],
	[ 100.05, 38.85, 34.7, 22.3 ],
	[ 23.25, 64.85, 34.7, 22.3 ],
	[ 61.65, 64.85, 34.7, 22.3 ],
	[ 100.05, 64.85, 34.7, 22.3 ],
] );

/**
 * Masonry — columns of equal width, tiles of their own heights. Only the first
 * column reaches the bottom inset: the ragged edge is the whole point of the
 * layout, so squaring it off here would draw a picture of Grid.
 */
export const LayoutMasonry = layoutPreset( [
	[ 23.25, 12.85, 34.7, 28.79 ],
	[ 23.25, 45.34, 34.7, 22.29 ],
	[ 23.25, 71.33, 34.7, 15.82 ],
	[ 61.65, 12.85, 34.7, 16.72 ],
	[ 61.65, 33.27, 34.7, 24.15 ],
	[ 61.65, 61.12, 34.7, 18.58 ],
	[ 100.05, 12.85, 34.7, 25.08 ],
	[ 100.05, 41.63, 34.7, 18.58 ],
	[ 100.05, 63.91, 34.7, 18.58 ],
] );

/* ------------------------------------------------------------------ *
 * Layout picker chrome (Figma 9:23119)
 *
 * The three glyphs that frame the layout cards: the header brand tile, the
 * search field's magnifier and a card's selected badge.
 * ------------------------------------------------------------------ */

/**
 * The brand mark at the size the layout picker's header draws it.
 *
 * Was its own artwork — a rounded square with a 135° pink gradient and a 2×2
 * window knocked out in white (Figma 9:23035). It and `ShapedLogoMark` are now both
 * `ShapedMark`, so the lockup here, the dashboard header tile and the block icon
 * cannot drift apart again.
 *
 * @param {Object} props
 * @param {number} [props.size] Rendered edge length in px.
 * @return {JSX.Element} Icon.
 */
export const PickerLogoMark = ( { size = 40 } ) => <ShapedMark size={ size } />;

/**
 * A selected layout card's badge: a filled disc with the tick knocked out of
 * it, so the tick reads in whatever sits behind the icon. Paints with
 * `currentColor`, which is how the card tints it to the accent.
 *
 * @param {Object} props
 * @param {number} [props.size] Rendered edge length in px.
 * @return {JSX.Element} Icon.
 */
export const CheckCircleIcon = ( { size = 14 } ) => (
	<svg width={ size } height={ size } viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M7.03267 0.000911461L7.02178 0.000607641C7.01434 0.000303827 7.007 0 6.99955 0C4.79764 0 2.6971 1.05638 1.38057 2.8258C0.477405 4.03962 0 5.48322 0 7.00015C0 8.33689 0.378315 9.6363 1.09386 10.7583C1.79028 11.8502 2.77246 12.7271 3.93434 13.2941C4.89427 13.7625 5.9256 14 6.99959 14C7.00673 14 7.01392 13.9997 7.02106 13.9995L7.03195 13.9992C10.8741 13.9818 14 10.842 14 7.00013C13.9998 3.15815 10.8741 0.0182572 7.03273 0.000886736L7.03267 0.000911461ZM11.1752 5.51524L6.78326 9.90723C6.7352 9.95544 6.68153 9.99934 6.62396 10.0374C6.45984 10.1455 6.26914 10.2028 6.07252 10.2028C5.80359 10.2028 5.55081 10.0978 5.36051 9.90709L2.82389 7.37088C2.43191 6.97825 2.43191 6.33956 2.82374 5.94741C3.01398 5.75717 3.26692 5.6523 3.53605 5.6523C3.80498 5.6523 4.05776 5.75696 4.24785 5.94741L6.07253 7.77273L9.7525 4.09215C9.94243 3.90206 10.1952 3.7974 10.4641 3.7974C10.7331 3.7974 10.9859 3.90206 11.1757 4.09236C11.3656 4.28245 11.4703 4.53507 11.4701 4.804C11.4702 5.07263 11.3653 5.32541 11.1751 5.51534L11.1752 5.51524Z"
			fill="currentColor"
		/>
	</svg>
);

/* ------------------------------------------------------------------ *
 * ADD MEDIA FROM
 * ------------------------------------------------------------------ */

/* Traced from the media sidebar's Figma glyphs (node 1272:59731). */

export const imagesIcon = (
	<SVG viewBox="0 0 24 24" {...stroke}>
		<Path d="M21 14.9997L17.914 11.9137C17.5389 11.5388 17.0303 11.3281 16.5 11.3281C15.9697 11.3281 15.4611 11.5388 15.086 11.9137L6 20.9997M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3ZM11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z" />
	</SVG>
);

/**
 * The chain glyph the design uses for the two "External …" sources.
 *
 * Local rather than the `link` re-export above: that one is WP's own filled
 * mark, and next to the other line icons in this sidebar it reads as a
 * different weight of drawing.
 */
export const linkIcon = (
	<SVG viewBox="0 0 24 24" {...stroke}>
		<Path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.4791 3.53087C19.5521 2.60383 18.298 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.46997L11.75 5.17997M14.0002 11.0002C13.5707 10.4261 13.0228 9.95104 12.3936 9.60729C11.7645 9.26353 11.0687 9.05911 10.3535 9.00789C9.63841 8.95667 8.92061 9.05986 8.24885 9.31044C7.5771 9.56103 6.96709 9.95316 6.4602 10.4602L3.4602 13.4602C2.54941 14.4032 2.04544 15.6662 2.05683 16.9772C2.06822 18.2882 2.59407 19.5423 3.52111 20.4693C4.44815 21.3964 5.70221 21.9222 7.01319 21.9336C8.32418 21.945 9.58719 21.441 10.5302 20.5302L12.2402 18.8202" />
	</SVG>
);

export const videoIcon = (
	<SVG viewBox="0 0 24 24" {...stroke}>
		<Circle cx="12" cy="12" r="10" />
		<Path d="M10 8l6 4-6 4V8z" fill="currentColor" />
	</SVG>
);

/*
 * The design's YouTube mark is the solid badge with the play triangle knocked
 * out of it, not a stroked rectangle — so this one paints with `fill` and the
 * shared `stroke` props are deliberately absent. The 20×14.09 artwork is
 * centred in the 24×24 box the other source icons use.
 */
export const youtubeIcon = (
	<SVG viewBox="0 0 24 24" fill="currentColor">
		<Path
			transform="translate(2 4.9554)"
			d="M19.5821 2.20021C19.352 1.33432 18.6743 0.652211 17.8139 0.420842C16.2541 0 10 0 10 0C10 0 3.74589 0 2.18632 0.420631C1.32568 0.652 0.648 1.33411 0.418105 2.2C0 3.76989 0 7.04463 0 7.04463C0 7.04463 0 10.3196 0.417895 11.8893C0.64779 12.7552 1.32547 13.4371 2.18611 13.6686C3.74589 14.0893 10 14.0893 10 14.0893C10 14.0893 16.2543 14.0893 17.8139 13.6686C18.6745 13.4371 19.352 12.7552 19.5821 11.8893C20 10.3194 20 7.04463 20 7.04463C20 7.04463 20 3.76989 19.5821 2.20021ZM7.95453 10.0179V4.07137L13.1819 7.04484L7.95453 10.0179Z"
		/>
	</SVG>
);

/**
 * Map of source-icon keys → icon elements. The media-source registry stays pure
 * data (string keys); presentation (MediaSidebar) resolves the element here.
 *
 * @type {Object<string, JSX.Element>}
 */
export const SOURCE_ICONS = {
	images: imagesIcon,
	video: videoIcon,
	youtube: youtubeIcon,
	link: linkIcon,
};

/**
 * The tick inside a selected media tile's badge.
 */
export const checkTickIcon = (
	<SVG
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={ 3 }
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<Path d="M18 7.375L9.75 15.625L6 11.875" />
	</SVG>
);

/* ------------------------------------------------------------------ *
 * CONTROL ICONS
 *
 * Glyphs consumed by the shared option-panel controls in
 * `@shaped-gallery/components` (device switcher, reset, responsive units,
 * inspector tabs). Ported from the sibling ShapedPlugin control library and
 * normalised to paint with `currentColor` so control chrome recolors to the
 * plugin accent. Each is a function component (used as `<ResetIcon />`).
 * ------------------------------------------------------------------ */

/**
 * Reset-to-default circular arrow, shown beside a changed responsive control.
 *
 * @return {JSX.Element} Icon.
 */
export const ResetIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } fill="none">
		<path
			stroke="currentColor"
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={ 1.5 }
			d="M1.943 3.528a4.751 4.751 0 1 1-.514 3.765m.305-5.156.02 1.605 1.545-.13"
		/>
	</svg>
);

/**
 * Desktop preview glyph for the responsive device switcher.
 *
 * @return {JSX.Element} Icon.
 */
export const DesktopIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 14 } height={ 12 } fill="currentColor">
		<path d="M12.714 0H1.286C.655 0 .143.504.143 1.125v7.5c0 .621.512 1.125 1.143 1.125h4.571l-.38 1.125H3.761a.566.566 0 0 0-.571.563c0 .311.254.562.571.562h6.476c.317 0 .572-.25.572-.563a.566.566 0 0 0-.572-.562H8.524l-.38-1.125h4.57c.631 0 1.143-.504 1.143-1.125v-7.5C13.857.504 13.346 0 12.714 0Zm-.38 8.25H1.667V1.5h10.667v6.75Z" />
	</svg>
);

/**
 * Tablet preview glyph for the responsive device switcher.
 *
 * @return {JSX.Element} Icon.
 */
export const TabletIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } fill="currentColor">
		<path d="M9.428 0H2.571C1.623 0 .857.67.857 1.5v9c0 .83.766 1.5 1.714 1.5h6.857c.949 0 1.715-.67 1.715-1.5v-9c0-.83-.766-1.5-1.715-1.5ZM7.143 11H4.857v-.5h2.286v.5Zm3-1.5H1.857v-8h8.286v8Z" />
	</svg>
);

/**
 * Mobile preview glyph for the responsive device switcher.
 *
 * @return {JSX.Element} Icon.
 */
export const MobileIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 8 } height={ 12 } fill="currentColor">
		<path d="M6.286 0H1.714C1.082 0 .571.67.571 1.5v9c0 .83.51 1.5 1.143 1.5h4.572c.632 0 1.142-.67 1.142-1.5v-9c0-.83-.51-1.5-1.142-1.5ZM4.762 11H3.238v-.5h1.524v.5Zm2-1.5H1.238v-8h5.524v8Z" />
	</svg>
);

/**
 * Info affordance for controls that expose a hover tooltip.
 *
 * @return {JSX.Element} Icon.
 */
export const InfoIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } viewBox="0 0 1200 1200" fill="currentColor">
		<path d="M198 198c-222 222-222 582 0 804s582 222 804 0 222-582 0-804-582-222-804 0zm712.8 712.8c-171.6 171.6-451.2 171.6-622.8 0-171.6-171.6-171.6-451.2 0-622.8s451.2-171.6 622.8 0c172.8 172.8 172.8 451.2 0 622.8zM535.2 357.6c0-48 39.602-86.398 87.602-86.398s86.398 39.602 85.199 87.602c0 48-39.602 87.602-86.398 86.398-48-.004-87.602-39.602-86.402-87.602zm210 499.2c-2.398 7.2-7.2 15.602-12 20.398-31.199 32.398-69.602 50.398-114 51.602-21.602 0-42 0-63.602-3.602-34.801-4.8-79.199-48-72-93.602 4.8-31.199 9.602-62.398 14.398-93.602 9.602-54 19.199-108 28.801-162 0-3.601 1.2-7.199 1.2-10.8 0-22.802-7.2-31.2-30-33.603-9.602-1.199-19.2-2.398-28.802-4.8-10.8-3.602-15.602-13.2-15.602-21.602 1.2-9.602 7.2-15.602 19.2-18 6-1.2 13.198-1.2 19.198-1.2h163.2c20.397 0 32.397 9.602 32.397 30 0 16.801-2.398 33.602-6 50.398-10.8 62.398-22.8 123.6-33.602 186-3.601 20.398-8.398 40.801-10.8 61.2-1.2 9.601 0 20.397 2.398 30 3.601 13.198 13.199 20.397 26.398 18 10.8-1.2 21.602-4.801 32.398-9.602 8.398-3.602 15.602-9.602 24-12 15.617-5.988 26.418 3.613 22.816 16.812z" />
	</svg>
);

/**
 * "General" tab glyph for the inspector TabControls.
 *
 * @return {JSX.Element} Icon.
 */
export const GeneralIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="currentColor">
		<path d="M8 11.313A3.316 3.316 0 0 1 4.687 8 3.316 3.316 0 0 1 8 4.687 3.316 3.316 0 0 1 11.313 8 3.316 3.316 0 0 1 8 11.313ZM8 6.25c-.965 0-1.75.785-1.75 1.75S7.035 9.75 8 9.75 9.75 8.965 9.75 8 8.965 6.25 8 6.25Z" />
		<path d="M14.365 8.969a6.47 6.47 0 0 0 0-1.937 2.014 2.014 0 0 0 .72-2.761l-.313-.542a2.034 2.034 0 0 0-2.752-.756 6.468 6.468 0 0 0-1.676-.97A2.033 2.033 0 0 0 8.312 0h-.625c-1.11 0-2.016.896-2.03 2.003a6.469 6.469 0 0 0-1.677.97 2.034 2.034 0 0 0-2.752.756l-.312.542a2.014 2.014 0 0 0 .72 2.76 6.472 6.472 0 0 0 0 1.938 2.034 2.034 0 0 0-.72 2.76l.312.542a2.034 2.034 0 0 0 2.752.756 6.47 6.47 0 0 0 1.676.97A2.034 2.034 0 0 0 7.687 16h.625c1.111 0 2.017-.896 2.032-2.003a6.468 6.468 0 0 0 1.676-.97 2.034 2.034 0 0 0 2.752-.756l.312-.542a2.034 2.034 0 0 0-.72-2.76Zm-.634 1.98-.312.54a.47.47 0 0 1-.64.172l-.462-.266a.782.782 0 0 0-.933.114 4.886 4.886 0 0 1-2.037 1.178.781.781 0 0 0-.566.75v.532a.47.47 0 0 1-.468.469h-.625a.47.47 0 0 1-.47-.47v-.53a.781.781 0 0 0-.565-.752 4.886 4.886 0 0 1-2.037-1.177.782.782 0 0 0-.933-.114l-.461.266a.47.47 0 0 1-.64-.172l-.313-.54a.47.47 0 0 1 .171-.641l.46-.266a.781.781 0 0 0 .368-.865 4.9 4.9 0 0 1 0-2.354.781.781 0 0 0-.367-.865l-.46-.266a.48.48 0 0 1-.172-.64l.312-.541a.47.47 0 0 1 .64-.172l.462.266a.781.781 0 0 0 .933-.114 4.886 4.886 0 0 1 2.037-1.178.781.781 0 0 0 .566-.75V2.03a.47.47 0 0 1 .469-.469h.625a.47.47 0 0 1 .468.47v.53a.781.781 0 0 0 .566.751c.76.218 1.464.626 2.037 1.178a.78.78 0 0 0 .933.115l.461-.267a.47.47 0 0 1 .64.172l.313.54a.48.48 0 0 1-.171.641l-.46.266a.781.781 0 0 0-.368.865 4.898 4.898 0 0 1 0 2.354.782.782 0 0 0 .367.865l.46.266c.225.129.302.416.172.64Z" />
	</svg>
);

/**
 * "Style" tab glyph for the inspector TabControls.
 *
 * @return {JSX.Element} Icon.
 */
export const StyleIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="currentColor">
		<path d="M3.751 9.004a.939.939 0 0 1 0-1.875.939.939 0 0 1 0 1.875Zm4.25-4.25a.939.939 0 0 1 0-1.875.939.939 0 0 1 0 1.875Zm3.005 1.245a.939.939 0 0 1 0-1.875.939.939 0 0 1 0 1.875Zm-6.01 0a.939.939 0 0 1 0-1.875.939.939 0 0 1 0 1.875Z" />
		<path d="M6.754 15.936c-.141 0-.284-.015-.426-.045a8.026 8.026 0 0 1-4.519-2.76A8.015 8.015 0 0 1 .001 8.067c0-2.134.83-4.14 2.338-5.651A7.948 7.948 0 0 1 7.985.066h.016c4.391 0 7.979 3.568 8 7.96v.13a3.821 3.821 0 0 1-1.159 2.706 3.875 3.875 0 0 1-2.725 1.11h-2.24c-.604 0-1.094.491-1.094 1.095v.837c0 .616-.275 1.191-.754 1.579a2.023 2.023 0 0 1-1.275.453ZM8.001 1.629h-.013a6.447 6.447 0 0 0-6.424 6.437c0 3.02 2.14 5.669 5.09 6.297.19.04.327-.042.392-.095a.462.462 0 0 0 .174-.364v-.838a2.66 2.66 0 0 1 2.656-2.656h2.241c1.267 0 2.308-1.019 2.322-2.272v-.104C14.42 4.5 11.534 1.629 8 1.629Z" />
	</svg>
);

/**
 * "Advanced" tab glyph for the inspector TabControls.
 *
 * @return {JSX.Element} Icon.
 */
export const AdvancedIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="currentColor">
		<path d="m14.666 6.667-1.6-.267c-.088-.267-.177-.533-.355-.8l.889-1.333c.178-.178.089-.445-.09-.623L12.267 2.4c-.088-.178-.355-.178-.533 0l-1.333.889c-.267-.178-.534-.267-.8-.356l-.267-1.6C9.244 1.067 9.066.89 8.89.89H7.11a.801.801 0 0 0-.533.533L6.31 2.933c-.267.09-.533.267-.8.356L4.178 2.4a.43.43 0 0 0-.623 0L2.311 3.733c-.178.09-.178.356 0 .623L3.2 5.689c-.09.178-.267.444-.356.8l-1.51.178c-.268.089-.445.266-.445.533v1.778c0 .266.177.444.444.444l1.6.267c.089.267.178.533.356.8l-.89 1.333c-.266.178-.266.445-.088.622l1.333 1.334a.547.547 0 0 0 .622.089l1.334-.89c.266.179.533.267.8.356l.266 1.6c.09.267.267.445.445.445h1.778c.266 0 .444-.178.444-.445l.267-1.6c.266-.089.533-.177.8-.355l1.333.889c.178.177.445.089.622-.09l1.245-1.244a.547.547 0 0 0 .089-.622l-.89-1.333c.179-.267.267-.534.356-.8l1.6-.267c.267-.089.445-.267.445-.444V7.289c-.09-.356-.267-.533-.534-.622Zm-6.666 4a2.58 2.58 0 0 1-2.578-2.578A2.58 2.58 0 0 1 8 5.51a2.58 2.58 0 0 1 2.578 2.578A2.58 2.58 0 0 1 8 10.667Z" />
	</svg>
);

/**
 * Toggle glyph shown beside a `SpPopover` label to open/close the popover.
 *
 * @return {JSX.Element} Icon.
 */
export const PopOverToggleIcon = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x=".5" y=".5" width="23" height="23" rx="1.5" stroke="#949494"/><path fillRule="evenodd" clipRule="evenodd" d="M6.487 14.154h3.359l.804 2.286h1.418L8.862 7.5H7.47l-3.193 8.94h1.405zm1.686-4.751 1.239 3.512H6.934zm5.566 6.645q.411.452 1.314.452.616 0 1.15-.246.547-.26.945-.931.014.465.246.821.247.356 1 .356.45 0 .739-.137.3-.136.589-.37l-.137-.232a3 3 0 0 1-.274.191.6.6 0 0 1-.301.083q-.22 0-.301-.151-.082-.15-.082-.48v-3.778q0-.67-.11-1.136a1.5 1.5 0 0 0-.452-.794 1.6 1.6 0 0 0-.725-.411 3.3 3.3 0 0 0-1.014-.137q-.63 0-1.15.15-.506.151-.835.37a2.3 2.3 0 0 0-.493.438q-.178.233-.178.603 0 .355.206.63.206.26.63.26a.9.9 0 0 0 .63-.22q.26-.218.26-.602a.86.86 0 0 0-.206-.588.9.9 0 0 0-.493-.329.97.97 0 0 1 .562-.342q.355-.096.67-.096.37 0 .63.123a.87.87 0 0 1 .425.425q.165.287.164.78v.93q0 .315-.288.521a3 3 0 0 1-.712.37l-.917.328a5.5 5.5 0 0 0-.917.411 2.1 2.1 0 0 0-.698.602q-.274.37-.274.959 0 .712.397 1.177m2.765-.397q-.341.192-.698.192a.98.98 0 0 1-.725-.288q-.288-.286-.288-.903 0-.63.288-.986a2.1 2.1 0 0 1 .684-.561q.411-.22.794-.397.397-.178.589-.466v2.725q-.3.48-.644.684" fill="#1e1e1e"/></svg>
);

/**
 * Linked "all sides" glyph for the Spacing control (sides bound together).
 *
 * @return {JSX.Element} Icon.
 */
export const LinkIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 20 } height={ 20 } fill="none">
		<path
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M8.5 11.5a3 3 0 0 0 4.24 0l2-2a3 3 0 0 0-4.24-4.24l-1.15 1.14M11.5 8.5a3 3 0 0 0-4.24 0l-2 2a3 3 0 0 0 4.24 4.24l1.14-1.14"
		/>
	</svg>
);

/**
 * Unlinked "all sides" glyph for the Spacing control (sides edited separately).
 *
 * @return {JSX.Element} Icon.
 */
export const UnlinkIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 20 } height={ 20 } fill="none">
		<path
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M8.5 11.5a3 3 0 0 0 4.24 0l1-1M11.5 8.5a3 3 0 0 0-4.24 0l-1 1M6 3v2M3 6h2M15 17v-2M17 15h-2"
		/>
	</svg>
);

/* ------------------------------------------------------------------ *
 * SPACING SIDE-AXIS GLYPHS
 *
 * 12×12 diagram glyphs for the Spacing control's ranger rows: a framed square
 * with the side (or corner) the row drives painted dark, the rest light. Ported
 * from the sibling Spacing control. These are diagram glyphs with fixed fills
 * (they intentionally do NOT paint with `currentColor`), so the diagram stays
 * legible regardless of row hover / active state. Keyed in the Spacing control's
 * `SIDE_AXIS_ICONS` map.
 * ------------------------------------------------------------------ */

/**
 * All-sides glyph — every edge painted dark (the linked "all sides" ranger row).
 *
 * @return {JSX.Element} Icon.
 */
export const AllSidesIcon = () => (
	<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect x=".5" y=".5" width="19" height="19" rx="1.5" stroke="#8c8f94" />
		<path fill="#1e1e1e" d="M5.973 4h7.89v1.479h-7.89zm0 10.521h7.89V16h-7.89zM4 13.863v-7.89h1.479v7.89zm10.52-.001v-7.89h1.479v7.89z" />
	</svg>
);

/**
 * Top-side glyph — top edge dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const TopSideIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<rect x={ 1.9728 } width={ 7.88999 } height={ 1.47941 } fill="#1e1e1e" />
		<rect x={ 1.9728 } y={ 10.5205 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 0.000301361 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 0.000301361 9.8623)" fill="#dddddd" />
		<rect x={ 10.5203 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 10.5203 9.8623)" fill="#dddddd" />
	</svg>
);

/**
 * Right-side glyph — right edge dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const RightSideIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<rect x={ 1.9728 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 1.9728 } y={ 10.5205 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 0.000301361 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 0.000301361 9.8623)" fill="#dddddd" />
		<rect x={ 10.5203 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 10.5203 9.8623)" fill="#1e1e1e" />
	</svg>
);

/**
 * Bottom-side glyph — bottom edge dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const BottomSideIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<rect x={ 1.9728 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 1.9728 } y={ 10.5205 } width={ 7.88999 } height={ 1.47941 } fill="#1e1e1e" />
		<rect x={ 0.000301361 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 0.000301361 9.8623)" fill="#dddddd" />
		<rect x={ 10.5203 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 10.5203 9.8623)" fill="#dddddd" />
	</svg>
);

/**
 * Left-side glyph — left edge dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const LeftSideIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<rect x={ 1.9728 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 1.9728 } y={ 10.5205 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 0.000301361 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 0.000301361 9.8623)" fill="#1e1e1e" />
		<rect x={ 10.5203 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 10.5203 9.8623)" fill="#dddddd" />
	</svg>
);

/**
 * Vertical-axis glyph — top + bottom edges dark, left + right light (the
 * top/bottom padding ranger in Spacing's axes mode).
 *
 * @return {JSX.Element} Icon.
 */
export const VerticalSidesIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<rect x={ 1.9728 } width={ 7.88999 } height={ 1.47941 } fill="#1e1e1e" />
		<rect x={ 1.9728 } y={ 10.5205 } width={ 7.88999 } height={ 1.47941 } fill="#1e1e1e" />
		<rect x={ 0.000301361 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 0.000301361 9.8623)" fill="#dddddd" />
		<rect x={ 10.5203 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 10.5203 9.8623)" fill="#dddddd" />
	</svg>
);

/**
 * Horizontal-axis glyph — left + right edges dark, top + bottom light (the
 * left/right padding ranger in Spacing's axes mode).
 *
 * @return {JSX.Element} Icon.
 */
export const HorizontalSidesIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<rect x={ 1.9728 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 1.9728 } y={ 10.5205 } width={ 7.88999 } height={ 1.47941 } fill="#dddddd" />
		<rect x={ 0.000301361 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 0.000301361 9.8623)" fill="#1e1e1e" />
		<rect x={ 10.5203 } y={ 9.8623 } width={ 7.88999 } height={ 1.47941 } transform="rotate(-90 10.5203 9.8623)" fill="#1e1e1e" />
	</svg>
);

/**
 * Radius all-corners glyph — every corner bracket dark (linked radius ranger).
 *
 * @return {JSX.Element} Icon.
 */
export const RadiusAllIcon = () => (
	<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect x=".5" y=".5" width="19" height="19" rx="1.5" stroke="#8c8f94" />
		<g clipPath="url(#shaped-radius-all-clip)">
			<path d="M10.75 4v1.5h2.75a1 1 0 0 1 1 1v2.75H16V6a2 2 0 0 0-2-2zM4 9.25h1.5V6.5a1 1 0 0 1 1-1h2.75V4H6a2 2 0 0 0-2 2zm10.5 4.25a1 1 0 0 1-1 1h-2.75V16H14a2 2 0 0 0 2-2v-3.25h-1.5zm-9-2.75H4V14a2 2 0 0 0 2 2h3.25v-1.5H6.5a1 1 0 0 1-1-1z" fill="#1d1b1a" />
		</g>
		<defs>
			<clipPath id="shaped-radius-all-clip">
				<path fill="#fff" d="M4 4h12v12H4z" />
			</clipPath>
		</defs>
	</svg>
);

/**
 * Radius top-left glyph — top-left corner dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const RadiusTopLeftIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<path fillRule="evenodd" clipRule="evenodd" fill="#1d1b1a" d="M1.5 5.25H0V2C0 0.895431 0.89543 0 2 0H5.25V1.5H2.5C1.94772 1.5 1.5 1.94772 1.5 2.5V5.25Z" />
		<path fill="#dddddd" d="M6.75 0V1.5H9.5C10.0523 1.5 10.5 1.94772 10.5 2.5V5.25H12V2C12 0.89543 11.1046 0 10 0H6.75Z" />
		<path fill="#dddddd" d="M10.5 9.5C10.5 10.0523 10.0523 10.5 9.5 10.5H6.75V12H10C11.1046 12 12 11.1046 12 10V9.375V6.75H10.5V9.5Z" />
		<path fill="#dddddd" d="M1.5 6.75H0V10C0 11.1046 0.895431 12 2 12H5.25V10.5H2.5C1.94772 10.5 1.5 10.0523 1.5 9.5V6.75Z" />
	</svg>
);

/**
 * Radius top-right glyph — top-right corner dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const RadiusTopRightIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<path fillRule="evenodd" clipRule="evenodd" fill="#dddddd" d="M1.5 5.25H0V2C0 0.895431 0.89543 0 2 0H5.25V1.5H2.5C1.94772 1.5 1.5 1.94772 1.5 2.5V5.25ZM6.75 10.5H9.5C10.0523 10.5 10.5 10.0523 10.5 9.5V6.75H12V10C12 11.1046 11.1046 12 10 12H6.75V10.5ZM0 6.75H1.5V9.5C1.5 10.0523 1.94772 10.5 2.5 10.5H5.25V12H2C0.895431 12 0 11.1046 0 10V6.75Z" />
		<path fill="#1d1b1a" d="M6.75 0V1.5H9.5C10.0523 1.5 10.5 1.94772 10.5 2.5V5.25H12V2C12 0.89543 11.1046 0 10 0H6.75Z" />
	</svg>
);

/**
 * Radius bottom-right glyph — bottom-right corner dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const RadiusBottomRightIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<path fillRule="evenodd" clipRule="evenodd" fill="#dddddd" d="M6.75 1.5V0H10C11.1046 0 12 0.89543 12 2V5.25H10.5V2.5C10.5 1.94772 10.0523 1.5 9.5 1.5H6.75ZM1.5 5.25H0V2C0 0.895431 0.89543 0 2 0H5.25V1.5H2.5C1.94772 1.5 1.5 1.94772 1.5 2.5V5.25ZM0 6.75H1.5V9.5C1.5 10.0523 1.94772 10.5 2.5 10.5H5.25V12H2C0.895431 12 0 11.1046 0 10V6.75Z" />
		<path fill="#1d1b1a" d="M10.5 9.5C10.5 10.0523 10.0523 10.5 9.5 10.5H6.75V12H10C11.1046 12 12 11.1046 12 10V6.75H10.5V9.5Z" />
	</svg>
);

/**
 * Radius bottom-left glyph — bottom-left corner dark, the other three light.
 *
 * @return {JSX.Element} Icon.
 */
export const RadiusBottomLeftIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 12 } height={ 12 } viewBox="0 0 12 12" fill="none">
		<path fillRule="evenodd" clipRule="evenodd" fill="#dddddd" d="M6.75 1.5V0H10C11.1046 0 12 0.89543 12 2V5.25H10.5V2.5C10.5 1.94772 10.0523 1.5 9.5 1.5H6.75ZM1.5 5.25H0V2C0 0.895431 0.89543 0 2 0H5.25V1.5H2.5C1.94772 1.5 1.5 1.94772 1.5 2.5V5.25ZM6.75 10.5H9.5C10.0523 10.5 10.5 10.0523 10.5 9.5V6.75H12V10C12 11.1046 11.1046 12 10 12H6.75V10.5Z" />
		<path fill="#1d1b1a" d="M1.5 6.75H0V10C0 11.1046 0.895431 12 2 12H5.25V10.5H2.5C1.94772 10.5 1.5 10.0523 1.5 9.5V6.75Z" />
	</svg>
);

/**
 * Typography "Aa" header glyph for the Typography control.
 *
 * @return {JSX.Element} Icon.
 */
export const TypographyIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 17 } height={ 16 } fill="none">
		<rect width="16" height="1.5" x="0.5" fill="currentColor" rx="0.75" />
		<rect width="16" height="1.5" x="0.5" y="14.5" fill="currentColor" rx="0.75" />
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.5"
			d="m4.75 12.5 2.763-8.288a1.04 1.04 0 0 1 1.974 0L12.25 12.5m-6.5-3h5.5"
		/>
	</svg>
);

/**
 * Italic glyph for the Typography text-format group.
 *
 * @return {JSX.Element} Icon.
 */
export const ItalicIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="currentColor">
		<path d="M6.5 2h5v1.5H9.7L7.3 12.5H9V14H4v-1.5h1.8L8.2 3.5H6.5V2Z" />
	</svg>
);

/**
 * Underline glyph for the Typography text-format group.
 *
 * @return {JSX.Element} Icon.
 */
export const UnderlineIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="currentColor">
		<path d="M4 2v5.5a4 4 0 0 0 8 0V2h-1.5v5.5a2.5 2.5 0 0 1-5 0V2H4Zm-.5 11v1.5h9V13h-9Z" />
	</svg>
);

/**
 * Strikethrough glyph for the Typography text-format group.
 *
 * @return {JSX.Element} Icon.
 */
export const StrikethroughIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="currentColor">
		<path d="M2 7.5h12V9H2V7.5Zm6-4c-1.9 0-3.2 1-3.2 2.5 0 .3 0 .5.1.7h1.7a1.1 1.1 0 0 1-.1-.5c0-.7.6-1.2 1.5-1.2.8 0 1.4.4 1.6 1h1.6C10.9 4.4 9.7 3.5 8 3.5Zm2.9 7c.1.2.1.4.1.6 0 .8-.7 1.4-1.9 1.4-1 0-1.8-.4-2.1-1.2H5.4c.3 1.4 1.6 2.2 3.6 2.2 2 0 3.4-1 3.4-2.6 0-.2 0-.3-.1-.4h-1.4Z" />
	</svg>
);

/**
 * Globe glyph — "use global default" action on the Typography panel header.
 *
 * @return {JSX.Element} Icon.
 */
export const GlobalScopeIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="none">
		<circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
		<path
			stroke="currentColor"
			strokeWidth="1.2"
			d="M1.75 8h12.5M8 1.75c1.6 1.6 2.5 3.8 2.5 6.25S9.6 12.65 8 14.25c-1.6-1.6-2.5-3.8-2.5-6.25S6.4 3.35 8 1.75Z"
		/>
	</svg>
);

/**
 * Plus glyph — "add" action on the Typography panel header.
 *
 * @return {JSX.Element} Icon.
 */
export const PlusIcon = () => (
	// `viewBox` so a caller that sizes the glyph in CSS scales the stroke with it —
	// without one, the Manage Galleries toolbar's 24px rule grew the box and left a
	// 16px plus in its corner.
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={ 16 }
		height={ 16 }
		viewBox="0 0 16 16"
		fill="none"
	>
		<path stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M8 2.5v11M2.5 8h11" />
	</svg>
);

/**
 * Sliders glyph for the Box Shadow header's Presets / Custom switch (Figma node
 * 7:32540, "Dimension, Border & Radius Icon" — traced from its own export).
 *
 * Glyph only, no frame: unlike `StepsIcon` below, the design draws this one's
 * 20px box in two states (a #8c8f94 hairline when off, a solid #2f2f2f fill when
 * on), which is a job for the button's CSS rather than two SVG variants. Paints
 * with `currentColor` so the button flips it to white on the dark fill.
 *
 * Named apart from the Dashboard banner's `SlidersIcon` further down: that one is
 * a 24×24 line glyph for artwork, this one is a 12px solid control mark.
 *
 * @return {JSX.Element} Icon.
 */
export const ShadowSlidersIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={ 12 }
		height={ 10.2857 }
		viewBox="0 0 12 10.2857"
		fill="currentColor"
	>
		<path d="M12 1.92857C12 1.57353 11.7122 1.28571 11.3571 1.28571H5.46169C5.19694 0.536662 4.48257 0 3.64286 0C2.80315 0 2.08878 0.536662 1.82403 1.28571H0.642862C0.287822 1.28571 0 1.57353 0 1.92857C0 2.28361 0.287822 2.57143 0.642862 2.57143H1.82403C2.08878 3.32048 2.80315 3.85714 3.64286 3.85714C4.48257 3.85714 5.19694 3.32048 5.46169 2.57143H11.3571C11.7122 2.57143 12 2.28361 12 1.92857Z" />
		<path d="M12 8.35714C12 8.0021 11.7122 7.71429 11.3571 7.71429H10.176C9.91123 6.96523 9.19686 6.42857 8.35715 6.42857C7.51744 6.42857 6.80307 6.96523 6.53832 7.71429H0.642862C0.287822 7.71429 0 8.0021 0 8.35714C0 8.71218 0.287822 9 0.642862 9H6.53832C6.80307 9.74905 7.51744 10.2857 8.35715 10.2857C9.19686 10.2857 9.91123 9.74905 10.176 9H11.3571C11.7122 9 12 8.71218 12 8.35714Z" />
	</svg>
);

/**
 * Sliders glyph for the RangeControl "step presets" toggle (multi-step ranger).
 * Filled when the stepped-preset mode is active.
 *
 * @param {Object}  props
 * @param {boolean} [props.isActive=false] Active (stepped-preset) state.
 * @return {JSX.Element} Icon.
 */
export const StepsIcon = ( { isActive = false } ) => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 24 } height={ 24 } fill={ isActive ? '#2f2f2f' : 'none' }>
		<rect width={ 22.4 } height={ 22.4 } x={ 0.8 } y={ 0.8 } rx={ 3.2 } fill="#fff" />
		<rect width={ 22.4 } height={ 22.4 } x={ 0.8 } y={ 0.8 } rx={ 3.2 } stroke="#2f2f2f" strokeWidth={ 1.6 } />
		<path
			fill={ isActive ? '#fff' : '#2f2f2f' }
			d="M19.584 7.938a.813.813 0 0 0-.813-.813H11.32a2.439 2.439 0 0 0-4.598 0H5.23a.813.813 0 0 0 0 1.625h1.493a2.439 2.439 0 0 0 4.598 0h7.451a.813.813 0 0 0 .813-.813ZM19.584 16.063a.813.813 0 0 0-.813-.813h-1.493a2.439 2.439 0 0 0-4.597 0H5.229a.813.813 0 0 0 0 1.625h7.452a2.439 2.439 0 0 0 4.597 0h1.493a.813.813 0 0 0 .813-.813Z"
		/>
	</svg>
);

/*
 * The two gap glyphs below are SELF-FRAMING: each draws its own 20px rounded
 * square, which is why `.sp-shaped-gallery-range-control__axis` carries no CSS
 * border of its own (see shared.scss). The frame strokes with `currentColor` so
 * the single muted token still owns it, while the two-tone artwork inside stays
 * the design's ink — a wrapper cannot tint one half of a two-tone glyph.
 */

/**
 * Horizontal-gap axis glyph — a double-headed arrow spanning two upright rules,
 * for the gap RangeControl's `sideAxisIcon`.
 *
 * @return {JSX.Element} Icon.
 */
export const GapHorizontalIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={ 20 }
		height={ 20 }
		viewBox="0 0 20 20"
		fill="none"
	>
		<rect x={ 0.5 } y={ 0.5 } width={ 19 } height={ 19 } rx={ 1.5 } stroke="currentColor" />
		<path d="M8 9.2h4v1.5H8z" fill="#1e1e1e" />
		<path
			d="m14 10-2.625 2.165v-4.33zm-8 0 2.625-2.165v4.33zm-2.25 6V4h1.5v12zm11 0V4h1.5v12z"
			fill="#1e1e1e"
		/>
	</svg>
);

/**
 * Vertical-gap axis glyph — a double-headed arrow spanning two flat rules, for
 * the gap RangeControl's `sideAxisIcon`.
 *
 * @return {JSX.Element} Icon.
 */
export const GapVerticalIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={ 20 }
		height={ 20 }
		viewBox="0 0 20 20"
		fill="none"
	>
		<rect x={ 0.5 } y={ 0.5 } width={ 19 } height={ 19 } rx={ 1.5 } stroke="currentColor" />
		<path d="M9.2 12V8h1.5v4z" fill="#1e1e1e" />
		<path
			d="m10 6 2.165 2.625h-4.33zm0 8-2.165-2.625h4.33zm6 2.25H4v-1.5h12zm0-11H4v-1.5h12z"
			fill="#1e1e1e"
		/>
	</svg>
);

/**
 * Left text-align glyph for the Content Alignment segmented control.
 *
 * @return {JSX.Element} Icon.
 */
export const AlignLeftIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={ 24 }
		height={ 24 }
		fill="none"
		stroke="currentColor"
		strokeWidth={ 1.8 }
		strokeLinecap="round"
	>
		<path d="M4 6h16M4 10h9M4 14h16M4 18h9" />
	</svg>
);

/**
 * Center text-align glyph for the Content Alignment segmented control.
 *
 * @return {JSX.Element} Icon.
 */
export const AlignCenterIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={ 24 }
		height={ 24 }
		fill="none"
		stroke="currentColor"
		strokeWidth={ 1.8 }
		strokeLinecap="round"
	>
		<path d="M4 6h16M7.5 10h9M4 14h16M7.5 18h9" />
	</svg>
);

/**
 * Right text-align glyph for the Content Alignment segmented control.
 *
 * @return {JSX.Element} Icon.
 */
export const AlignRightIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={ 24 }
		height={ 24 }
		fill="none"
		stroke="currentColor"
		strokeWidth={ 1.8 }
		strokeLinecap="round"
	>
		<path d="M4 6h16M11 10h9M4 14h16M11 18h9" />
	</svg>
);

/* ------------------------------------------------------------------ *
 * JUSTIFY-CONTENT GLYPHS
 *
 * Segment icons for the "Justify Filter & Search" control (a justify-content
 * selector shown when both filter and search are enabled). Each draws two
 * container rails with the item bars positioned to illustrate the flex justify
 * mode. They paint with `currentColor` so the active segment recolors to the
 * accent. Decorative — the option label carries the accessible name, so each is
 * `aria-hidden`.
 * ------------------------------------------------------------------ */

/**
 * The two container rails shared by every justify glyph (left + right edges).
 *
 * @return {JSX.Element} Rails.
 */
const JustifyRails = () => (
	<>
		<rect x="1.5" y="4" width="1.5" height="16" rx="0.75" />
		<rect x="21" y="4" width="1.5" height="16" rx="0.75" />
	</>
);

/**
 * Justify start — items packed against the leading rail.
 *
 * @return {JSX.Element} Icon.
 */
export const JustifyStartIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 24 } height={ 24 } fill="currentColor" aria-hidden="true">
		<JustifyRails />
		<rect x="4.5" y="8" width="2" height="8" rx="1" />
		<rect x="8" y="8" width="2" height="8" rx="1" />
	</svg>
);

/**
 * Justify center — items centered between the rails.
 *
 * @return {JSX.Element} Icon.
 */
export const JustifyCenterIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 24 } height={ 24 } fill="currentColor" aria-hidden="true">
		<JustifyRails />
		<rect x="9.5" y="8" width="2" height="8" rx="1" />
		<rect x="13" y="8" width="2" height="8" rx="1" />
	</svg>
);

/**
 * Justify end — items packed against the trailing rail.
 *
 * @return {JSX.Element} Icon.
 */
export const JustifyEndIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 24 } height={ 24 } fill="currentColor" aria-hidden="true">
		<JustifyRails />
		<rect x="14" y="8" width="2" height="8" rx="1" />
		<rect x="17.5" y="8" width="2" height="8" rx="1" />
	</svg>
);

/**
 * Justify space-between — first/last items on the rails, the rest spread.
 *
 * @return {JSX.Element} Icon.
 */
export const JustifySpaceBetweenIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 24 } height={ 24 } fill="currentColor" aria-hidden="true">
		<JustifyRails />
		<rect x="4.5" y="8" width="2" height="8" rx="1" />
		<rect x="11" y="8" width="2" height="8" rx="1" />
		<rect x="17.5" y="8" width="2" height="8" rx="1" />
	</svg>
);

/**
 * Justify space-around — equal space on both sides of each item.
 *
 * @return {JSX.Element} Icon.
 */
export const JustifySpaceAroundIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 24 } height={ 24 } fill="currentColor" aria-hidden="true">
		<JustifyRails />
		<rect x="5.5" y="8" width="2" height="8" rx="1" />
		<rect x="11" y="8" width="2" height="8" rx="1" />
		<rect x="16.5" y="8" width="2" height="8" rx="1" />
	</svg>
);

/**
 * Justify space-evenly — equal gaps between items and the rails.
 *
 * @return {JSX.Element} Icon.
 */
export const JustifySpaceEvenlyIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 24 } height={ 24 } fill="currentColor" aria-hidden="true">
		<JustifyRails />
		<rect x="6.5" y="8" width="2" height="8" rx="1" />
		<rect x="11" y="8" width="2" height="8" rx="1" />
		<rect x="15.5" y="8" width="2" height="8" rx="1" />
	</svg>
);

/**
 * Solid-fill swatch — the "solid" option glyph for the Background / Overlay type
 * selector (a filled rounded square). Ported from the sibling Background control.
 *
 * @return {JSX.Element} Icon.
 */
export const SolidFillIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="none">
		<rect width={ 16 } height={ 16 } fill="#8c8f94" rx={ 2 } />
	</svg>
);

/**
 * Gradient-fill swatch — the "gradient" option glyph for the Background / Overlay
 * type selector (a diagonally split two-tone square). Ported from the sibling
 * Background control.
 *
 * @return {JSX.Element} Icon.
 */
export const GradientFillIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width={ 16 } height={ 16 } fill="none" viewBox="0 0 16 16">
		<path fill="#ccc" d="M16 14V2a2 2 0 0 0-2-2H2a2 2 0 0 0-1.4.6l14.8 14.8A2 2 0 0 0 16 14Z" />
		<path fill="#8c8f94" d="M.6.6A2 2 0 0 0 0 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 1.4-.6L.6.6Z" />
	</svg>
);

/*
 * Border-style glyphs — the option icons for the Border control's style toggle
 * (a box outline drawn in each CSS border-style). Ported from the sibling Woo
 * Product Slider Pro Border control and recoloured to `currentColor` so the
 * active segment's accent flows through. Decorative — the toggle option carries
 * the accessible name, so each glyph is `aria-hidden`.
 */

/**
 * Solid border-style glyph.
 *
 * @return {JSX.Element} Icon.
 */
export const SolidStyle = () => (
	<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width={ 40 } height={ 16 } viewBox="0 0 40 16" fill="none">
		<rect x={ 1 } y={ 1 } width={ 38 } height={ 14 } stroke="currentColor" strokeWidth={ 1.5 } fill="transparent" />
	</svg>
);

/**
 * Dashed border-style glyph.
 *
 * @return {JSX.Element} Icon.
 */
export const DashedStyle = () => (
	<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width={ 40 } height={ 16 } viewBox="0 0 40 16" fill="none">
		<rect x={ 1 } y={ 1 } width={ 38 } height={ 14 } stroke="currentColor" strokeWidth={ 1.5 } strokeDasharray="4 2.5" fill="transparent" />
	</svg>
);

/**
 * Dotted border-style glyph.
 *
 * @return {JSX.Element} Icon.
 */
export const DottedStyle = () => (
	<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width={ 40 } height={ 16 } viewBox="0 0 40 16" fill="none">
		<rect x={ 1 } y={ 1 } width={ 38 } height={ 14 } stroke="currentColor" strokeWidth={ 1.6 } strokeLinecap="round" strokeDasharray="0.1 3" fill="transparent" />
	</svg>
);

/**
 * Double border-style glyph.
 *
 * @return {JSX.Element} Icon.
 */
export const DoubleStyle = () => (
	<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width={ 40 } height={ 16 } viewBox="0 0 40 16" fill="none">
		<rect x={ 0.5 } y={ 0.5 } width={ 39 } height={ 15 } stroke="currentColor" fill="transparent" />
		<rect x={ 3.5 } y={ 3.5 } width={ 33 } height={ 9 } stroke="currentColor" fill="transparent" />
	</svg>
);

/**
 * Edit glyph — a pencil over a baseline (Figma "Filter Area Background" popover
 * trigger). Filled paths lifted from the design's "Layer 2" pencil, plus the
 * underline rule; paints with `currentColor`.
 *
 * @return {JSX.Element} Icon.
 */
export const EditIcon = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x=".5" y=".5" width="23" height="23" rx="2" fill="#fff"/><rect x=".5" y=".5" width="23" height="23" rx="2" stroke="#8c8f94"/><path d="m13.167 6.549-6.283 6.254a.97.97 0 0 0-.266.474l-.665 2.648a.716.716 0 0 0 .7.895q.09.009.179 0l2.647-.664c.177-.046.34-.137.469-.266l6.283-6.306zm4.439-.579-.82-.82a1.63 1.63 0 0 0-2.249 0l-.757.757 3.063 3.064.763-.757a1.59 1.59 0 0 0 0-2.243M5.931 18H18.07v1.3H5.931z" fill="#1e1e1e"/></svg>
);

/**
 * Edit Gallery glyph from user design.
 * Paints with currentColor (pink) matching button state.
 *
 * @param {Object} props SVG props.
 * @return {JSX.Element} Icon.
 */
export const EditGalleryIcon = ( props ) => (
	<svg
		width={ 14 }
		height={ 14 }
		viewBox="0 0 14 14"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		{ ...props }
	>
		<path
			d="M7.63942 2.12354L2.40339 7.33548C2.29344 7.44337 2.21657 7.5804 2.18181 7.73047L1.62786 9.93664C1.60497 10.0253 1.60276 10.118 1.6214 10.2076C1.64004 10.2972 1.67903 10.3814 1.73536 10.4535C1.79169 10.5257 1.86385 10.5839 1.94628 10.6238C2.0287 10.6636 2.11917 10.684 2.21071 10.6833C2.26037 10.688 2.31037 10.688 2.36004 10.6833L4.5662 10.1293C4.71371 10.0916 4.84843 10.0151 4.95637 9.90774L10.1924 4.65244L7.63942 2.12354Z"
			fill="currentColor"
		/>
		<path
			d="M11.3387 1.64206L10.6547 0.958057C10.4021 0.717456 10.0667 0.583252 9.71782 0.583252C9.36898 0.583252 9.03351 0.717456 8.78092 0.958057L8.1499 1.58908L10.7029 4.14206L11.3387 3.51104C11.5858 3.2628 11.7245 2.92681 11.7245 2.57655C11.7245 2.2263 11.5858 1.89031 11.3387 1.64206Z"
			fill="currentColor"
		/>
		<rect
			x={ 1.60889 }
			y={ 11.6667 }
			width={ 10.1156 }
			height={ 1.08333 }
			fill="currentColor"
		/>
	</svg>
);

/* ------------------------------------------------------------------ *
 * DASHBOARD ICONS
 *
 * Glyphs for the admin dashboard shell and the Getting Started screen.
 * Function components (used as `<PlayIcon />`), painting with `currentColor`
 * unless the mark is intentionally brand-coloured (the logo and the YouTube
 * badge). Decorative by default — callers add `aria-hidden` at the use site
 * where the SVG is not the accessible name.
 * ------------------------------------------------------------------ */

/**
 * The brand mark at the 28px the dashboard header bar and the Ready Patterns modal
 * draw it. Was a flat brand-filled tile with four white squares; now `ShapedMark`.
 *
 * @return {JSX.Element} Icon.
 */
export const ShapedLogoMark = () => <ShapedMark size={ 28 } />;

const WORDMARK_PATH =
	'M1951 328.472V325.699L1979.43 259.145L1993.99 227.948L2052.22 84.0948H2093.12V86.8679L1991.56 328.472H1951ZM1979.43 259.145L1910.1 86.8679V84.0948H1951L2012.01 241.467V259.145H1979.43ZM1798.17 259.145V84.0948H1835.61V128.811L1825.56 128.117C1830.41 114.483 1838.5 103.737 1849.82 95.8804C1861.14 88.0234 1874.08 84.0948 1888.64 84.0948H1905.63V119.798H1882.75C1873.74 119.798 1865.88 121.878 1859.18 126.038C1852.48 129.966 1847.28 135.628 1843.58 143.023C1839.88 150.417 1838.03 159.199 1838.03 169.367V259.145H1798.17ZM1679.23 264.344C1661.43 264.344 1645.72 260.416 1632.08 252.559C1618.68 244.702 1608.16 233.841 1600.54 219.975C1592.91 206.11 1589.1 189.934 1589.1 171.447C1589.1 153.19 1592.8 137.13 1600.19 123.264C1607.82 109.168 1618.22 98.3068 1631.39 90.6808C1644.79 82.8238 1660.16 78.8953 1677.49 78.8953C1694.82 78.8953 1709.84 82.9393 1722.55 91.0275C1735.5 98.8845 1745.55 109.977 1752.71 124.304C1760.11 138.632 1763.8 155.386 1763.8 174.566V181.152L1758.6 186.352H1607.82V153.075H1745.78L1724.63 161.048C1724.4 151.342 1722.09 143.023 1717.7 136.09C1713.54 128.926 1708 123.496 1701.06 119.798C1694.36 115.87 1686.74 113.905 1678.18 113.905C1668.94 113.905 1660.51 116.101 1652.88 120.491C1645.25 124.651 1639.36 130.544 1635.2 138.17C1631.04 145.565 1628.96 154.23 1628.96 164.167V178.033C1628.96 187.507 1631.16 196.173 1635.55 204.03C1640.17 211.656 1646.29 217.78 1653.92 222.402C1661.55 227.024 1669.98 229.334 1679.23 229.334C1688.01 229.334 1695.98 227.024 1703.14 222.402C1710.54 217.549 1716.31 211.078 1720.47 202.99H1724.63L1756.87 216.856C1749.94 231.876 1739.65 243.546 1726.02 251.866C1712.62 260.185 1697.02 264.344 1679.23 264.344ZM1512.51 259.145V9.56845L1551.33 4.71558L1552.37 7.48865V259.145H1512.51ZM1425.17 259.145V9.56845L1464 4.71558L1465.04 7.48865V259.145H1425.17ZM1288.78 264.344C1276.77 264.344 1266.02 262.034 1256.55 257.412C1247.3 252.79 1240.02 246.32 1234.71 238C1229.39 229.681 1226.74 220.206 1226.74 209.576C1226.74 193.169 1232.4 180.112 1243.72 170.407C1255.05 160.47 1271.34 154.693 1292.6 153.075L1360.54 147.529V180.459L1298.49 185.659C1287.4 186.583 1279.43 188.894 1274.57 192.591C1269.72 196.289 1267.29 201.257 1267.29 207.496C1267.29 213.736 1270.07 218.82 1275.61 222.748C1281.16 226.677 1288.21 228.641 1296.76 228.641C1305.77 228.641 1313.86 226.446 1321.02 222.055C1328.42 217.433 1334.31 211.541 1338.7 204.377C1343.09 197.213 1345.29 189.472 1345.29 181.152V152.382C1345.29 141.289 1341.59 132.161 1334.19 124.998C1326.8 117.603 1317.09 113.905 1305.08 113.905C1294.91 113.905 1286.47 116.447 1279.77 121.531C1273.3 126.384 1269.14 132.508 1267.29 139.903H1263.48L1229.51 131.584C1233.67 115.87 1242.34 103.16 1255.51 93.4539C1268.91 83.7481 1285.55 78.8953 1305.42 78.8953C1330.15 78.8953 1349.45 86.059 1363.31 100.387C1377.18 114.483 1384.11 134.472 1384.11 160.354V259.145H1348.75V208.19L1362.96 210.27C1360.19 220.206 1355.22 229.334 1348.06 237.654C1340.9 245.742 1332.23 252.212 1322.06 257.065C1312.12 261.918 1301.03 264.344 1288.78 264.344ZM1083.88 265.175C1061.69 265.175 1041.93 259.976 1024.6 249.577C1007.5 238.947 994.097 224.157 984.391 205.207C974.686 186.027 969.833 163.842 969.833 138.654C969.833 113.234 974.686 91.0493 984.391 72.1C994.328 53.1506 1007.96 38.4765 1025.29 28.0774C1042.86 17.4473 1062.96 12.1323 1085.61 12.1323C1109.18 12.1323 1129.86 18.1406 1147.66 30.1572C1165.45 42.1739 1178.62 58.6968 1187.17 79.7259L1152.51 89.7783L1148.7 89.085C1142.46 76.6062 1133.91 67.016 1123.05 60.3144C1112.18 53.6128 1099.82 50.262 1085.96 50.262C1071.4 50.262 1058.34 53.8439 1046.79 61.0077C1035.23 68.1714 1026.22 78.3394 1019.75 91.5115C1013.28 104.684 1010.04 120.282 1010.04 138.307C1010.04 156.332 1013.39 172.046 1020.09 185.449C1026.8 198.621 1036.04 208.905 1047.83 216.3C1059.61 223.464 1073.01 227.045 1088.04 227.045C1099.59 227.045 1110.57 224.388 1120.97 219.073C1131.6 213.527 1140.15 205.785 1146.62 195.848C1153.09 185.68 1156.32 173.895 1156.32 160.492V153.906L1170.19 161.878H1089.77V124.095H1189.6L1194.45 128.948V259.976H1158.06V207.981H1171.57C1165.57 220.922 1157.94 231.667 1148.7 240.218C1139.68 248.768 1129.52 255.123 1118.19 259.282C1107.1 263.211 1095.66 265.175 1083.88 265.175ZM935.798 0V259.976H909.107L906.68 244.377C901.365 250.616 895.01 255.354 887.615 258.589C880.221 261.824 872.132 263.442 863.351 263.442C850.179 263.442 838.393 259.629 827.994 252.003C817.595 244.146 809.392 233.516 803.383 220.113C797.375 206.709 794.371 191.804 794.371 175.397C794.371 159.452 797.144 144.778 802.69 131.374C808.467 117.74 816.555 106.879 826.954 98.7907C837.585 90.7026 849.717 86.6585 863.351 86.6585C880.221 86.6585 894.317 92.5513 905.64 104.337V0H935.798ZM866.471 236.751C879.181 236.751 889.349 231.783 896.975 221.846C904.6 211.678 908.413 196.195 908.413 175.397C908.413 155.292 904.6 140.04 896.975 129.641C889.349 119.011 879.181 113.696 866.471 113.696C858.614 113.696 851.566 116.354 845.326 121.669C839.087 126.984 834.118 134.378 830.421 143.853C826.954 153.097 825.221 163.611 825.221 175.397C825.221 186.489 826.954 196.773 830.421 206.247C834.118 215.491 839.087 222.886 845.326 228.432C851.797 233.978 858.845 236.751 866.471 236.751ZM721.767 263.442C704.667 263.442 689.993 259.513 677.745 251.656C665.728 243.568 656.6 232.707 650.361 219.073C644.352 205.438 641.348 190.302 641.348 173.664C641.348 157.718 644.121 143.16 649.668 129.988C655.445 116.585 663.648 106.07 674.278 98.444C685.14 90.587 697.965 86.6585 712.755 86.6585C731.704 86.6585 747.072 93.0134 758.857 105.723C770.874 118.433 776.882 135.996 776.882 158.412C776.882 162.34 776.42 167.771 775.496 174.704H672.199C672.892 194.808 677.86 210.06 687.104 220.459C696.579 230.858 708.826 236.058 723.847 236.058C731.011 236.058 738.521 235.249 746.378 233.631C754.467 231.783 761.515 229.241 767.523 226.005L770.296 253.043C757.586 259.976 741.41 263.442 721.767 263.442ZM746.032 153.559C746.032 142.004 743.143 132.645 737.366 125.481C731.82 118.087 723.732 114.389 713.102 114.389C702.703 114.389 694.037 117.624 687.104 124.095C680.402 130.565 675.896 140.387 673.585 153.559H746.032ZM556.656 86.6585C570.29 86.6585 582.191 90.587 592.359 98.444C602.758 106.07 610.615 116.585 615.93 129.988C621.476 143.391 624.249 158.412 624.249 175.05C624.249 200.932 618.357 222.192 606.571 238.831C594.785 255.238 578.147 263.442 556.656 263.442C547.874 263.442 539.671 261.94 532.045 258.936C524.65 255.7 518.295 251.079 512.98 245.07V343.861H482.823V90.1248H506.047L508.82 110.576C521.068 94.6311 537.013 86.6585 556.656 86.6585ZM551.109 236.751C564.282 236.751 574.565 231.32 581.96 220.459C589.586 209.598 593.399 194.462 593.399 175.05C593.399 155.87 589.586 140.849 581.96 129.988C574.565 119.127 564.282 113.696 551.109 113.696C544.177 113.696 537.475 116.007 531.005 120.629C524.534 125.25 519.219 132.183 515.06 141.427C511.131 150.67 509.167 161.878 509.167 175.05C509.167 188.684 511.131 200.123 515.06 209.367C519.219 218.611 524.419 225.543 530.658 230.165C537.129 234.556 543.946 236.751 551.109 236.751ZM368.926 263.647C355.985 263.647 345.355 259.026 337.036 249.782C328.717 240.538 324.557 228.753 324.557 214.425C324.557 193.165 333.454 177.913 351.248 168.67C369.042 159.195 388.915 154.227 410.869 153.764C410.869 138.975 408.674 128.691 404.283 122.914C399.892 117.137 392.497 114.248 382.098 114.248C368.695 114.248 355.061 119.448 341.195 129.847L337.382 104.542C351.941 92.7568 368.811 86.864 387.991 86.864C406.247 86.864 419.766 92.1791 428.547 102.809C437.329 113.208 441.719 130.078 441.719 153.418V202.986C441.719 216.159 442.644 225.518 444.492 231.064C446.341 236.379 450.385 239.036 456.625 239.036H460.438L456.625 263.647H450.039C439.408 263.647 431.551 261.683 426.467 257.755C421.383 253.826 417.224 247.471 413.989 238.69C408.674 246.316 402.088 252.44 394.23 257.061C386.373 261.452 377.939 263.647 368.926 263.647ZM378.285 239.036C383.831 239.036 389.609 236.957 395.617 232.797C401.625 228.406 406.709 222.745 410.869 215.812V175.256C393.075 176.18 379.556 179.646 370.313 185.655C361.069 191.432 356.447 200.444 356.447 212.692C356.447 230.255 363.727 239.036 378.285 239.036ZM249.131 86.8639C266.694 86.8639 280.097 93.7966 289.341 107.662C298.816 121.296 303.553 139.783 303.553 163.123V260.181H273.396V166.936C273.396 148.911 270.854 135.739 265.77 127.42C260.686 118.87 252.829 114.595 242.199 114.595C234.342 114.595 227.178 116.79 220.707 121.181C214.468 125.34 209.153 131.233 204.762 138.859V260.181H174.605V0.205383H204.762V108.355C209.615 101.654 215.97 96.4541 223.827 92.7567C231.684 88.8282 240.119 86.8639 249.131 86.8639ZM68.9802 263.998C57.6568 263.998 45.7557 262.611 33.2769 259.838C21.0291 257.296 10.9767 254.177 3.11971 250.479L7.62595 215.816C16.8695 221.593 27.153 226.33 38.4764 230.028C49.7998 233.494 61.0076 235.227 72.0999 235.227C86.4274 235.227 97.6353 232.339 105.723 226.561C113.812 220.553 117.856 211.887 117.856 200.564C117.856 192.476 115.891 185.543 111.963 179.766C108.265 173.989 102.835 168.905 95.671 164.514C88.5072 159.892 78.4548 154.693 65.5138 148.915C50.2619 141.983 38.1297 135.628 29.1173 129.85C20.3359 124.073 13.2876 116.909 7.97258 108.359C2.65753 99.8089 0 89.1788 0 76.4688C0 63.5278 3.3508 52.2045 10.0524 42.4987C16.754 32.5619 26.1131 24.9359 38.1297 19.6208C50.3775 14.3058 64.2428 11.6483 79.7258 11.6483C91.5114 11.6483 102.604 12.9192 113.003 15.4612C123.633 18.0032 132.645 21.1229 140.04 24.8203L136.574 57.404C117.393 46.0806 97.8664 40.4189 77.9927 40.4189C64.5895 40.4189 54.0749 43.192 46.449 48.7381C38.823 54.2843 35.01 62.8346 35.01 74.389C35.01 82.2461 36.9743 88.8321 40.9028 94.1472C45.0624 99.2311 50.7241 103.853 57.8879 108.013C65.0517 111.941 75.9129 117.256 90.4715 123.958C112.194 133.663 128.024 144.178 137.96 155.501C147.897 166.594 152.866 180.575 152.866 197.444C152.866 218.011 145.355 234.303 130.334 246.32C115.314 258.105 94.8622 263.998 68.9802 263.998Z';


const LOCKUP = { width: 2718.125, height: 500, icon: 500, wordmarkX: 625, wordmarkY: 111.875 };

/**
 * The full brand lockup — `ShapedMark` plus the wordmark — at the dashboard
 * header's fixed 28px row height; `width` follows the lockup's own aspect ratio.
 *
 * The mark is `ShapedMark` itself, nested at the lockup's icon size, not a
 * second copy of its outline: this used to embed its own 800-unit tracing of the
 * mark with its own gradient id and hard-coded stops, which is exactly the drift
 * §18 forbids. Nesting also means it shares `ShapedMark`'s one gradient def
 * (see the note there on why a shared id is safe).
 *
 * @param {Object} props
 * @param {number} [props.height] Rendered height in px.
 * @return {JSX.Element} Icon.
 */
export const ShapedGalleryDashboardLogoIcon = ( { height = 28 } ) => (
	<svg
		width={ ( height * LOCKUP.width ) / LOCKUP.height }
		height={ height }
		viewBox={ `0 0 ${ LOCKUP.width } ${ LOCKUP.height }` }
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<ShapedMark size={ LOCKUP.icon } />
		<path
			d={ WORDMARK_PATH }
			transform={ `translate(${ LOCKUP.wordmarkX } ${ LOCKUP.wordmarkY })` }
			fill={ BRAND_INK }
		/>
	</svg>
);

/**
 * Help center — a life-buoy ring.
 *
 * @return {JSX.Element} Icon.
 */
export const HelpCenterIcon = () => (
	<svg width={ 18 } height={ 18 } viewBox="0 0 24 24" { ...stroke }>
		<circle cx="12" cy="12" r="9" />
		<circle cx="12" cy="12" r="3.5" />
		<path d="m4.9 4.9 4.6 4.6m5 5 4.6 4.6m0-14.2-4.6 4.6m-5 5-4.6 4.6" />
	</svg>
);

/**
 * Play — a solid triangle for the hero poster badge.
 *
 * @return {JSX.Element} Icon.
 */
export const PlayIcon = () => (
	<svg width={ 20 } height={ 22 } viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M18.5 9.7a1.5 1.5 0 0 1 0 2.6l-15 8.5A1.5 1.5 0 0 1 1.25 19.5v-17A1.5 1.5 0 0 1 3.5 1.2z" fill="currentColor" />
	</svg>
);

/**
 * YouTube play badge — the red rounded rectangle used on tutorial posters.
 *
 * @return {JSX.Element} Icon.
 */
export const YouTubePlayIcon = () => (
	<svg width={ 48 } height={ 34 } viewBox="0 0 48 34" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect width="48" height="34" rx="8" fill="#f00" />
		<path d="M20 10.5 30 17l-10 6.5z" fill="#fff" />
	</svg>
);

/**
 * External link — a box with an arrow leaving it.
 *
 * @return {JSX.Element} Icon.
 */
export const ExternalLinkIcon = () => (
	<svg width={ 14 } height={ 14 } viewBox="0 0 24 24" { ...stroke }>
		<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
		<path d="M15 3h6v6M10 14 21 3" />
	</svg>
);

/* ------------------------------------------------------------------ *
 * HELP CENTRE MENU
 * ------------------------------------------------------------------ *
 *
 * Traced from the Help Center popup's own artwork (Figma node 3024:60636),
 * one 16px glyph per row. Two conventions run through the whole set:
 *
 *  - Every glyph paints `currentColor`, never the design's literal #2F2F2F.
 *    The row owns the colour, which is what lets a hovered row take its icon
 *    to the accent along with its label (see `_components.scss`).
 *  - Artwork narrower or shorter than 16px is CENTRED with a `translate`
 *    rather than stretched to fill the box. The design sets each of these in
 *    a 16px flex cell at its natural size, and scaling a 13px mark up to 16
 *    would thicken its strokes past its neighbours'.
 */

/**
 * Documentation — an open book.
 *
 * @return {JSX.Element} Icon.
 */
export const DocsIcon = () => (
	<svg width={ 16 } height={ 16 } viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<path d="M7.50033 4.66699C7.50033 4.09243 7.27179 3.54108 6.86556 3.13477C6.45923 2.72844 5.90797 2.5 5.33333 2.5H1.83333V11.5H6.00033C6.54513 11.5001 7.06983 11.6803 7.50033 12.0039V4.66699ZM8.50033 14L8.48958 14.1006C8.44303 14.3284 8.24185 14.4998 8.00033 14.5C7.72418 14.5 7.50033 14.2761 7.50033 14C7.50033 13.6023 7.34207 13.2207 7.06087 12.9395C6.77964 12.6582 6.39803 12.5001 6.00033 12.5H1.33333C1.05719 12.5 0.833333 12.2761 0.833333 12V2C0.833333 1.72386 1.05719 1.5 1.33333 1.5H5.33333C6.17319 1.5 6.97873 1.83387 7.57259 2.42773C8.16635 3.02158 8.50033 3.82722 8.50033 4.66699V14Z" />
		<path d="M7.50033 14V4.66699C7.50033 3.82714 7.83387 3.0216 8.42773 2.42773C9.0216 1.83387 9.82714 1.5 10.667 1.5H14.667C14.943 1.50018 15.167 1.72397 15.167 2V12C15.167 12.276 14.943 12.4998 14.667 12.5H10C9.60218 12.5 9.22076 12.6581 8.93945 12.9395C8.65815 13.2208 8.50033 13.6022 8.50033 14C8.50033 14.2761 8.27647 14.5 8.00033 14.5C7.72418 14.5 7.50033 14.2761 7.50033 14ZM8.5 12.0039C8.93055 11.6804 9.45516 11.5 10 11.5H14.167V2.5H10.667C10.0924 2.5 9.54109 2.72844 9.13477 3.13477C8.72844 3.54109 8.50033 4.09236 8.50033 4.66699L8.5 12.0039Z" />
	</svg>
);

/**
 * Community — a small group of people.
 *
 * @return {JSX.Element} Icon.
 */
export const CommunityIcon = () => (
	<svg width={ 16 } height={ 16 } viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<path d="M10.7829 14V12.667C10.7829 12.1057 10.5606 11.5669 10.1637 11.1699C9.76679 10.773 9.22804 10.5498 8.66667 10.5498H3.33366C2.77228 10.5498 2.23354 10.773 1.83659 11.1699C1.43964 11.5669 1.21647 12.1056 1.21647 12.667V14C1.21647 14.3038 0.970423 14.5498 0.666667 14.5498C0.36291 14.5498 0.116862 14.3038 0.116862 14V12.667C0.116862 11.8139 0.456003 10.9958 1.05924 10.3926C1.66249 9.78934 2.48055 9.4502 3.33366 9.4502H8.66667C9.51978 9.4502 10.3378 9.78934 10.9411 10.3926C11.5442 10.9958 11.8835 11.814 11.8835 12.667V14C11.8835 14.3036 11.6373 14.5496 11.3337 14.5498C11.0299 14.5498 10.7829 14.3038 10.7829 14ZM14.7829 14V12.667C14.7825 12.1981 14.6268 11.7427 14.3395 11.3721C14.0522 11.0014 13.65 10.7364 13.196 10.6191C12.9019 10.5432 12.7246 10.2433 12.8005 9.94922C12.8763 9.65528 13.1764 9.47812 13.4704 9.55371C14.1605 9.73189 14.772 10.135 15.2087 10.6982C15.6452 11.2614 15.8829 11.9534 15.8835 12.666V14C15.8835 14.3036 15.6373 14.5496 15.3337 14.5498C15.0299 14.5498 14.7829 14.3038 14.7829 14ZM8.11686 4.66699C8.11686 3.49799 7.16868 2.5498 5.99967 2.5498C4.83082 2.54998 3.88346 3.4981 3.88346 4.66699C3.88364 5.83574 4.83093 6.78303 5.99967 6.7832C7.16857 6.7832 8.11669 5.83585 8.11686 4.66699ZM12.1217 4.66992C12.1217 4.19997 11.9656 3.74331 11.6774 3.37207C11.3892 3.0008 10.9853 2.73572 10.5299 2.61914C10.2359 2.54365 10.0582 2.24432 10.1335 1.9502C10.2088 1.65593 10.5091 1.47837 10.8034 1.55371C11.4952 1.73089 12.1087 2.13316 12.5465 2.69727C12.9845 3.26145 13.2223 3.95571 13.2223 4.66992C13.2223 5.38415 12.9845 6.07837 12.5465 6.64258C12.1087 7.20671 11.4952 7.60894 10.8034 7.78613C10.5091 7.86148 10.2088 7.68391 10.1335 7.38965C10.0583 7.09555 10.2359 6.79617 10.5299 6.7207C10.9853 6.60413 11.3892 6.33904 11.6774 5.96777C11.9655 5.59653 12.1217 5.13986 12.1217 4.66992ZM9.21647 4.66699C9.2163 6.44336 7.77608 7.88379 5.99967 7.88379C4.22342 7.88361 2.78305 6.44325 2.78288 4.66699C2.78288 2.89058 4.22331 1.45037 5.99967 1.4502C7.77619 1.4502 9.21647 2.89048 9.21647 4.66699Z" />
	</svg>
);

/**
 * Support — a headset. Artwork is 16.017 × 15, so it rides 0.5px down to sit on
 * the 16px cell's centre line.
 *
 * @return {JSX.Element} Icon.
 */
export const SupportIcon = () => (
	<svg width={ 16 } height={ 16 } viewBox="0 0 16.0169 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			transform="translate(0 0.5)"
			d="M8.00847 0C10.926 0.000253478 13.3201 2.23401 13.5769 5.08475H14.2373C15.2199 5.08501 16.0169 5.88171 16.0169 6.86441V9.40678C16.0167 10.3893 15.2198 11.1862 14.2373 11.1864H13.558C13.3157 12.6289 12.0621 13.7286 10.5508 13.7288H9.71266C9.49369 14.4634 8.81419 14.9998 8.00847 15C7.02573 15 6.22903 14.203 6.22881 13.2203C6.22881 12.2375 7.0256 11.4407 8.00847 11.4407C8.81446 11.4409 9.49393 11.9769 9.71266 12.7119H10.5508C11.6037 12.7116 12.4697 11.911 12.5738 10.8855L12.5847 10.678V5.59322C12.5847 3.06597 10.5356 1.01722 8.00847 1.01695C5.48106 1.01695 3.4322 3.0658 3.4322 5.59322V10.678C3.43199 10.9584 3.20419 11.1862 2.92373 11.1864H1.77966C0.796928 11.1864 0.000218072 10.3895 0 9.40678V6.86441C0 5.88154 0.796794 5.08475 1.77966 5.08475H2.43909C2.69586 2.23385 5.09072 0 8.00847 0ZM8.00847 12.4576C7.58724 12.4576 7.24576 12.7991 7.24576 13.2203C7.24598 13.6414 7.58738 13.9831 8.00847 13.9831C8.42935 13.9828 8.77097 13.6412 8.77119 13.2203C8.77119 12.7993 8.42948 12.4579 8.00847 12.4576ZM1.77966 6.1017C1.35844 6.1017 1.01695 6.44319 1.01695 6.86441V9.40678C1.01717 9.82782 1.35857 10.1695 1.77966 10.1695H2.41525V6.1017H1.77966ZM13.6017 10.1695H14.2373C14.6581 10.1692 14.9998 9.82765 15 9.40678V6.86441C15 6.44335 14.6583 6.10196 14.2373 6.1017H13.6017V10.1695Z"
		/>
	</svg>
);

/**
 * Feature request — a lightbulb ringed with idea rays.
 *
 * The one stroked glyph of the set besides `WhatsNewIcon`, at the design's own
 * 1px weight — deliberately NOT the shared 2px `stroke` preset, which would
 * make it read heavier than the filled marks it sits beside.
 *
 * @return {JSX.Element} Icon.
 */
export const FeatureRequestIcon = () => (
	<svg
		width={ 16 }
		height={ 16 }
		viewBox="0 0 16.0626 16.0625"
		fill="none"
		stroke="currentColor"
		strokeMiterlimit={ 10 }
		strokeLinecap="round"
		strokeLinejoin="round"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M14.3125 2.6875L15.5625 1.75" />
		<path d="M14.3125 8.3125L15.5625 9.25" />
		<path d="M1.75003 2.6875L0.500029 1.75" />
		<path d="M1.75003 8.3125L0.500029 9.25" />
		<path d="M13.0313 5.5C13.0313 2.73856 10.7927 0.5 8.03128 0.5C5.26984 0.5 3.03128 2.73856 3.03128 5.5" />
		<path d="M3.03128 5.5C3.03128 6.82113 3.54765 8.01694 4.3864 8.90819C4.83928 9.38941 5.11462 10.01 5.11462 10.6708V11.5417C5.11462 12.0019 5.48772 12.375 5.94797 12.375H10.1146C10.5749 12.375 10.948 12.0019 10.948 11.5417V10.6708C10.948 10.01 11.2233 9.38941 11.6762 8.90819C12.5149 8.01694 13.0313 6.82113 13.0313 5.5" />
		<path d="M8.86462 15.5625H7.19797C6.50762 15.5625 5.94797 15.0028 5.94797 14.3125V12.375H10.1146V14.3125C10.1146 15.0028 9.55497 15.5625 8.86462 15.5625Z" />
		<path d="M11 5.5H13.0313" />
		<path d="M6.93753 5.5H9.12503" />
		<path d="M3.03128 5.5H5.06253" />
		<path d="M11 5.5V5.8125C11 6.33028 10.5803 6.75 10.0625 6.75C9.54475 6.75 9.12503 6.33028 9.12503 5.8125V5.5" />
		<path d="M5.06253 5.5V5.1875C5.06253 4.66972 5.48225 4.25 6.00003 4.25C6.51781 4.25 6.93753 4.66972 6.93753 5.1875V5.5" />
	</svg>
);

/**
 * What's New — two arrows chasing each other round a ring.
 *
 * The design composes this from two arc fragments, each drawn upside-down in
 * its own box and flipped into place; the `transform` on each path reproduces
 * that placement (translate into the 16px frame, then mirror about the
 * fragment box's own centre line) rather than re-deriving the arcs by eye.
 *
 * @return {JSX.Element} Icon.
 */
export const WhatsNewIcon = () => (
	<svg
		width={ 16 }
		height={ 16 }
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeMiterlimit={ 10 }
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			transform="translate(0 13.0448) scale(1 -1) translate(-0.0325 1.3987)"
			d="M8.03223 10.0114C6.3322 10.0114 4.73392 9.34941 3.53179 8.14728C2.32967 6.94516 1.66764 5.34688 1.66764 3.64684C1.66764 3.49152 1.54455 3.36197 1.38923 3.36197H0.872201C0.554201 3.36197 0.383951 2.98769 0.59292 2.748L2.40205 0.672846C2.60296 0.442384 2.96113 0.442385 3.16204 0.672848L4.14636 1.80191L4.97117 2.748C5.18014 2.98769 5.00989 3.36197 4.69189 3.36197H4.02492C3.86453 3.36197 3.73014 3.48646 3.73014 3.64684C3.73014 6.01903 5.66005 7.94894 8.03223 7.94894C8.79641 7.94894 9.51463 7.74859 10.1372 7.39772C10.635 7.11722 11.2913 7.14047 11.6626 7.57477L11.6948 7.61245C12.0451 8.02231 12.0113 8.64412 11.5633 8.94414C10.5265 9.63841 9.3081 10.0114 8.03223 10.0114Z"
		/>
		<path
			transform="translate(0 19.5424) scale(1 -1) translate(3.9584 4.6778)"
			d="M11.4807 7.17647L10.1314 8.72425L10.0454 8.8229C9.6468 9.28005 8.93636 9.28004 8.53782 8.82289L8.09261 8.31222L7.10245 7.17647C6.89348 6.93678 7.06373 6.5625 7.38173 6.5625C7.8959 6.5625 8.31027 6.12108 8.16233 5.62866C7.63006 3.85696 5.98415 2.5625 4.04139 2.5625C3.39069 2.5625 2.77333 2.7078 2.21992 2.96759C1.73656 3.19449 1.13529 3.14573 0.788344 2.73984L0.735512 2.67804C0.368854 2.24909 0.426849 1.59387 0.91813 1.31625C1.86071 0.783583 2.92919 0.5 4.04139 0.5C5.74145 0.5 7.33973 1.16203 8.54186 2.36416C9.48063 3.30295 10.0899 4.48334 10.3118 5.76511C10.3884 6.20768 10.7523 6.5625 11.2014 6.5625C11.5194 6.5625 11.6897 6.93678 11.4807 7.17647Z"
		/>
	</svg>
);

/**
 * Blog — a ruled article card. Artwork is 13 × 14.333, centred in the 16px cell.
 *
 * @return {JSX.Element} Icon.
 */
export const BlogIcon = () => (
	<svg width={ 16 } height={ 16 } viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<g transform="translate(1.5 0.83335)" fillRule="evenodd" clipRule="evenodd">
			<path d="M13 2.5V11.8333C13 13.214 11.8807 14.3333 10.5 14.3333H2.5C1.11933 14.3333 0 13.214 0 11.8333V2.5C0 1.11933 1.11933 0 2.5 0H10.5C11.8807 0 13 1.11933 13 2.5ZM12 2.5C12 1.67133 11.3287 1 10.5 1H2.5C1.67133 1 1 1.67133 1 2.5V11.8333C1 12.662 1.67133 13.3333 2.5 13.3333H10.5C11.3287 13.3333 12 12.662 12 11.8333V2.5Z" />
			<path d="M6.50001 3.66675C6.77601 3.66675 7.00001 3.89075 7.00001 4.16675C7.00001 4.44275 6.77601 4.66675 6.50001 4.66675H3.16667C2.89067 4.66675 2.66667 4.44275 2.66667 4.16675C2.66667 3.89075 2.89067 3.66675 3.16667 3.66675H6.50001Z" />
			<path d="M9.83334 6.66675C10.1093 6.66675 10.3333 6.89075 10.3333 7.16675C10.3333 7.44275 10.1093 7.66675 9.83334 7.66675H3.16667C2.89067 7.66675 2.66667 7.44275 2.66667 7.16675C2.66667 6.89075 2.89067 6.66675 3.16667 6.66675H9.83334Z" />
			<path d="M9.83334 9.66675C10.1093 9.66675 10.3333 9.89075 10.3333 10.1667C10.3333 10.4427 10.1093 10.6667 9.83334 10.6667H3.16667C2.89067 10.6667 2.66667 10.4427 2.66667 10.1667C2.66667 9.89075 2.89067 9.66675 3.16667 9.66675H9.83334Z" />
		</g>
	</svg>
);

/**
 * Gallery placeholder art — stands in for the hero video poster until a video id
 * is configured, so the card never renders an empty frame.
 *
 * @return {JSX.Element} Icon.
 */
export const GalleryPlaceholderArt = () => (
	<svg viewBox="0 0 320 180" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
		<path fill={ BRAND_TINT } d="M0 0h320v180H0z" />
		<rect x="40" y="34" width="106" height="52" rx="6" fill={ BRAND_ART } />
		<rect x="154" y="34" width="60" height="52" rx="6" fill={ BRAND_ART_SOFT } />
		<rect x="222" y="34" width="58" height="52" rx="6" fill={ BRAND_ART } />
		<rect x="40" y="94" width="60" height="52" rx="6" fill={ BRAND_ART_SOFT } />
		<rect x="108" y="94" width="106" height="52" rx="6" fill={ BRAND_ART } />
		<rect x="222" y="94" width="58" height="52" rx="6" fill={ BRAND_ART_SOFT } />
	</svg>
);

/**
 * Video tutorial — a play mark inside a ring (the red `YouTubePlayIcon` badge is
 * a poster overlay, too heavy for a list row).
 *
 * @return {JSX.Element} Icon.
 */
export const VideoTutorialIcon = () => (
	<svg width={ 16 } height={ 16 } viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<path d="M14.1663 8.00033C14.1663 4.59468 11.4059 1.83351 8.00033 1.83333C4.59457 1.83333 1.83333 4.59457 1.83333 8.00033C1.83351 11.4059 4.59468 14.1663 8.00033 14.1663C11.4058 14.1662 14.1662 11.4058 14.1663 8.00033ZM15.1663 8.00033C15.1662 11.9581 11.9581 15.1662 8.00033 15.1663C4.04239 15.1663 0.83351 11.9582 0.833333 8.00033C0.833333 4.04229 4.04229 0.833333 8.00033 0.833333C11.9582 0.83351 15.1663 4.04239 15.1663 8.00033Z" />
		<path d="M6.43034 4.8929C6.59292 4.80589 6.79058 4.81503 6.94401 4.91732L10.944 7.58431C11.083 7.67706 11.1667 7.83321 11.1667 8.00033C11.1666 8.16738 11.083 8.32367 10.944 8.41634L6.94401 11.0824C6.79058 11.1846 6.59292 11.1948 6.43034 11.1077C6.26788 11.0207 6.16667 10.8507 6.16667 10.6663V5.33333C6.16667 5.14912 6.26804 4.97999 6.43034 4.8929ZM7.16667 9.73177L9.76432 7.99935L7.16667 6.26693V9.73177Z" />
	</svg>
);

/**
 * Bare diagonal arrow — the Help Center row's outbound affordance, revealed on
 * hover (the design ships it at `opacity: 0`; the reveal is CSS, see
 * `_components.scss`).
 *
 * Distinct from `ExternalLinkIcon` (a box with an arrow leaving it) on purpose:
 * the design uses the box glyph on layout tiles and this bare arrow in menus.
 * The About page draws its own copy — this one is the menu's.
 *
 * @return {JSX.Element} Icon.
 */
export const ArrowUpRightIcon = () => (
	<svg
		width={ 12 }
		height={ 12 }
		viewBox="0 0 12 12"
		fill="none"
		stroke="currentColor"
		strokeWidth={ 1.74057 }
		strokeLinecap="round"
		strokeLinejoin="round"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M2 9.99957L10 1.99957M10 8.15343L10 1.99957L3.84617 1.99958" />
	</svg>
);

/**
 * Speech bubble for the floating live-chat launcher.
 *
 * @return {JSX.Element} Icon.
 */
export const ChatBubbleIcon = () => (
	<svg width={ 24 } height={ 24 } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.6 3.7A1 1 0 0 1 4.8 19v-3z"
			fill="currentColor"
		/>
	</svg>
);

/**
 * Filled heart for the footer credit line.
 *
 * @return {JSX.Element} Icon.
 */
export const HeartIcon = () => (
	<svg width={ 14 } height={ 14 } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M12 20.4 3.9 12.6a5.1 5.1 0 0 1 0-7.3 5.3 5.3 0 0 1 7.4 0l.7.7.7-.7a5.3 5.3 0 0 1 7.4 0 5.1 5.1 0 0 1 0 7.3z"
			fill="currentColor"
		/>
	</svg>
);

/**
 * Filled star for the footer rating prompt.
 *
 * @return {JSX.Element} Icon.
 */
export const StarIcon = () => (
	<svg width={ 14 } height={ 14 } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z"
			fill="currentColor"
		/>
	</svg>
);

/* ------------------------------------------------------------------ *
 * SOCIAL GLYPHS — footer only. Brand marks, so they are solid paths in
 * currentColor rather than the shared stroke style.
 * ------------------------------------------------------------------ */

/**
 * @return {JSX.Element} LinkedIn glyph.
 */
export const LinkedInIcon = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M13 0c.563 0 1 .469 1 1v12c0 .563-.437 1-1 1H1c-.562 0-1-.437-1-1V1c0-.531.438-1 1-1zM4.219 12h.031V5.313H2.156V12zM3.187 2C2.532 2 2 2.531 2 3.219c0 .656.531 1.187 1.188 1.187s1.218-.531 1.218-1.187A1.22 1.22 0 0 0 3.188 2M12 12V8.344c0-1.813-.375-3.188-2.469-3.188-1.031 0-1.687.563-1.969 1.063h-.03v-.907h-2V12h2.093V8.688c0-.876.156-1.72 1.219-1.72 1.062 0 1.094 1 1.094 1.782V12z" fill="#757575"/>
	</svg>
);

/**
 * @return {JSX.Element} X (formerly Twitter) glyph.
 */
export const XIcon = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M2 0h10c1.094 0 2 .906 2 2v10c0 1.094-.906 2-2 2H2c-1.094 0-2-.906-2-2V2C0 .906.906 0 2 0m9.281 2.625H9.812L7.345 5.438 5.25 2.625H2.188l3.656 4.781-3.469 3.969h1.469L6.53 8.313l2.344 3.062h2.969L8.03 6.344zM10.094 10.5H9.28L3.906 3.469h.875z" fill="#757575"/>
	</svg>
);

/**
 * @return {JSX.Element} WordPress glyph.
 */
export const WordPressIcon = () => (
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M1.688 5.031a6.6 6.6 0 0 0-.594 2.719 6.62 6.62 0 0 0 3.75 5.969zM12.25 7.406c0 .594-.219 1.25-.5 2.157l-.687 2.218-2.376-7.156c.376 0 .75-.062.75-.062.344-.032.313-.563-.062-.532 0 0-1.062.063-1.75.063-.656 0-1.75-.063-1.75-.063-.375-.031-.406.532-.062.532 0 0 .343.062.718.062l1.032 2.844-1.47 4.375-2.405-7.219c.406 0 .75-.062.75-.062.343-.032.312-.563-.032-.532 0 0-1.093.063-1.781.063h-.437a6.65 6.65 0 0 1 5.562-3c1.719 0 3.313.656 4.5 1.75h-.094c-.656 0-1.125.562-1.125 1.187 0 .532.313 1 .656 1.563.25.437.563 1 .563 1.812m-4.375.938 2.031 5.594c.031.03.031.062.063.093a6.5 6.5 0 0 1-2.219.375 6.2 6.2 0 0 1-1.875-.281zm5.719-3.781c.5.937.812 2.03.812 3.187 0 2.469-1.344 4.594-3.312 5.75l2.031-5.875c.375-.937.5-1.719.5-2.375 0-.25 0-.469-.031-.687M0 7.75a7.75 7.75 0 0 0 7.75 7.75 7.75 7.75 0 0 0 7.75-7.75A7.75 7.75 0 0 0 7.75 0 7.75 7.75 0 0 0 0 7.75m15.156 0a7.4 7.4 0 0 1-7.406 7.406A7.4 7.4 0 0 1 .344 7.75 7.4 7.4 0 0 1 7.75.344a7.4 7.4 0 0 1 7.406 7.406" fill="#757575"/>
	</svg>
);

/**
 * @return {JSX.Element} Facebook glyph.
 */
export const FacebookIcon = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M2 0h10c1.094 0 2 .906 2 2v10c0 1.094-.906 2-2 2H7.969V9.438h2.156L10.594 7H7.969v-.875c0-1.281.5-1.781 1.812-1.781.406 0 .75 0 .938.031V2.156c-.375-.094-1.25-.187-1.75-.187-2.656 0-3.906 1.25-3.906 3.968V7H3.406v2.438h1.656V14H2c-1.094 0-2-.906-2-2V2C0 .906.906 0 2 0" fill="#757575"/>
	</svg>
);

/**
 * @return {JSX.Element} YouTube glyph.
 */
export const YouTubeIcon = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="m8.813 7-2.97 1.688V5.312zM12 0c1.094 0 2 .906 2 2v10c0 1.094-.906 2-2 2H2c-1.094 0-2-.906-2-2V2C0 .906.906 0 2 0zm.438 4.25c-.126-.5-.5-.875-1-1C10.562 3 7 3 7 3s-3.562 0-4.437.25c-.5.125-.876.5-1 1-.25.906-.25 2.75-.25 2.75s0 1.875.25 2.781c.125.469.5.844 1 .969C3.437 11 7 11 7 11s3.563 0 4.438-.25c.5-.125.874-.5 1-1 .25-.875.25-2.75.25-2.75s0-1.844-.25-2.75" fill="#757575"/>
	</svg>
);

/* ------------------------------------------------------------------ *
 * Dashboard banner glyphs
 *
 * The two floating badges on each banner's artwork, plus the secondary
 * CTA's mark. Line glyphs on the shared 24-unit box like every icon above,
 * so the banner can size them in CSS (the design draws them at 21px).
 * ------------------------------------------------------------------ */

/**
 * Four-pane grid — the Dashboard banner's upper badge ("pick a layout").
 *
 * @return {JSX.Element} Icon.
 */
export const GridViewIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Rect { ...stroke } x={ 3 } y={ 3 } width={ 8 } height={ 8 } rx={ 1.5 } />
		<Rect { ...stroke } x={ 13 } y={ 3 } width={ 8 } height={ 8 } rx={ 1.5 } />
		<Rect { ...stroke } x={ 3 } y={ 13 } width={ 8 } height={ 8 } rx={ 1.5 } />
		<Rect { ...stroke } x={ 13 } y={ 13 } width={ 8 } height={ 8 } rx={ 1.5 } />
	</SVG>
);

/**
 * Two sliders — the Dashboard banner's lower badge ("tune it in the inspector").
 *
 * Distinct from `StepsIcon` above, which is a boxed 24×24 button FACE with its own
 * fill states; this is the bare line glyph the banner art needs.
 *
 * @return {JSX.Element} Icon.
 */
export const SlidersIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Path { ...stroke } d="M4 8h5M15 8h5M4 16h11M19 16h1" />
		<Circle { ...stroke } cx={ 12 } cy={ 8 } r={ 2.6 } />
		<Circle { ...stroke } cx={ 17.4 } cy={ 16 } r={ 2.6 } />
	</SVG>
);

/**
 * Square brackets around a slash — the Saved Galleries banner's upper badge.
 *
 * The shortcode mark: `[…]` is what the whole screen is about, so the glyph is the
 * bracket pair rather than a generic "code" chevron.
 *
 * @return {JSX.Element} Icon.
 */
export const ShortcodeIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Path { ...stroke } d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M13.5 8l-3 8" />
	</SVG>
);

/**
 * Stacked photos — the Saved Galleries banner's lower badge ("reuse it anywhere").
 *
 * @return {JSX.Element} Icon.
 */
export const ImagesIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Rect { ...stroke } x={ 8 } y={ 3 } width={ 13 } height={ 13 } rx={ 2 } />
		<Path { ...stroke } d="M8 16.5 12 12l3 3 2.5-2.5L21 16" />
		<Circle { ...stroke } cx={ 12.5 } cy={ 7.5 } r={ 1.5 } />
		<Path { ...stroke } d="M16 20H5a2 2 0 0 1-2-2V7" />
	</SVG>
);

/**
 * A mosaic sheet — the "Use Ready Patterns" CTA's mark.
 *
 * The design's `dashicons-layout`: one frame divided into unequal panes, which is
 * what a pattern IS here (a pre-composed gallery), not a plain grid.
 *
 * @return {JSX.Element} Icon.
 */
export const PatternsIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Rect { ...stroke } x={ 3 } y={ 3 } width={ 18 } height={ 18 } rx={ 2 } />
		<Path { ...stroke } d="M3 9.5h18M12 9.5V21" />
	</SVG>
);

/* ------------------------------------------------------------------ *
 * Row actions (Manage Galleries) + clipboard
 * ------------------------------------------------------------------ */

/**
 * Copy glyph — two stacked sheets. Used by ShortcodeField's copy button.
 *
 * @return {JSX.Element} Icon.
 */
export const CopyIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Rect { ...stroke } x={ 9 } y={ 9 } width={ 11 } height={ 11 } rx={ 2 } />
		<Path { ...stroke } d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
	</SVG>
);

/**
 * Pencil glyph — the "Edit" row action.
 *
 * Distinct from EditIcon above, which is a boxed 24×24 button face from the
 * inspector design; this one is a bare line glyph sized for a table row.
 *
 * @return {JSX.Element} Icon.
 */
export const PencilIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Path { ...stroke } d="M17 3.5a2.121 2.121 0 0 1 3 3L7.5 19 3 20.5 4.5 16z" />
	</SVG>
);

/**
 * Duplicate glyph — a sheet copied over another, matching the design's row action.
 *
 * @return {JSX.Element} Icon.
 */
export const DuplicateIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Rect { ...stroke } x={ 4 } y={ 4 } width={ 11 } height={ 11 } rx={ 2 } />
		<Path { ...stroke } d="M9 19v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-1" />
	</SVG>
);

/**
 * Trash glyph — the "Delete" row action.
 *
 * @return {JSX.Element} Icon.
 */
export const TrashIcon = () => (
	<SVG width={ 24 } height={ 24 } viewBox="0 0 24 24" aria-hidden="true">
		<Path { ...stroke } d="M4 7h16M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
	</SVG>
);

/**
 * Layout-aware Inspector controls — the single seam that makes the first
 * ("Layout Settings") panel change with the selected layout.
 *
 * Each entry is a lazily-imported component that renders ONLY the controls a
 * given layout exposes (columns, row height, …) INLINE inside Layout Settings —
 * no `ChildPanelBody` of its own. Lazy import keeps every layout's controls out
 * of the editor bundle until its layout is active.
 *
 * Adding a layout's own settings = drop a file in this folder + add one line to
 * `LAYOUT_CONTROLS`. Layouts with no override fall back to `ColumnsControls`
 * (the common column-based case), so most layouts need no entry.
 *
 * Each control component receives `{ attributes, setAttributes }`.
 */
import { lazy } from '@wordpress/element';

/**
 * Shared fallback: any future column-based layout that exposes only a
 * responsive "Columns" control (every current layout has its own entry below).
 *
 * @type {React.LazyExoticComponent}
 */
const ColumnsControls = lazy( () => import( './ColumnsControls' ) );

/**
 * Per-layout overrides. Only list a layout when its controls differ from the
 * column-based default.
 *
 * @type {Object<string, React.LazyExoticComponent>}
 */
const MasonryControls = lazy( () => import( './MasonryControls' ) );

export const LAYOUT_CONTROLS = {
	justified: lazy( () => import( './JustifiedControls' ) ),
	masonry: MasonryControls,
	// Grid reuses Masonry's controls verbatim — same Layout Settings by design,
	// one component so the two never drift.
	grid: MasonryControls,
};

/**
 * Resolve the layout-specific controls component for a layout id.
 *
 * @param {string} layout Layout id (e.g. 'justified', 'grid').
 * @return {React.LazyExoticComponent} Controls component.
 */
export function layoutControls( layout ) {
	return LAYOUT_CONTROLS[ layout ] || ColumnsControls;
}

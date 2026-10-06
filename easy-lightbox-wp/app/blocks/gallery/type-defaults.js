/**
 * Static type defaults — the editor-side mirror of the font-size / line-height
 * FALLBACKS `./style.scss` writes into each text element's custom property, e.g.
 * `font-size: var(--sp-shaped-gallery-ct-ttl-fs, 16px)`.
 *
 * These are NOT attribute defaults. `GalleryAttributesFactory` keeps every
 * typography scalar empty (§7) and nothing is stored until the visitor-facing
 * value is actually changed, so no number here ever reaches a saved gallery or
 * the emitted CSS. What they are for is the Typography control: with nothing
 * stored, its Font Size slider used to sit at its own minimum while the text on
 * the canvas rendered at the stylesheet fallback, so the control disagreed with
 * the gallery and the first drag jumped. Handed these, it opens on the size the
 * gallery actually renders, and reset returns to it.
 *
 * The stylesheet is the source of truth; this file mirrors it (§18). Change a
 * `var(--…, X)` fallback in style.scss and change the matching number here in the
 * same commit — one export per element, named for the var it tracks, so a value
 * that later diverges from its neighbour can move on its own.
 */

/** `--sp-shaped-gallery-ct-ttl-fs` / `-lh` on `.sp-shaped-gallery__title`. */
export const TITLE_TYPE_DEFAULTS = { fontSize: 16, lineHeight: 1.3 };

/** `--sp-shaped-gallery-ct-desc-fs` / `-lh` on `.sp-shaped-gallery__desc`. */
export const DESC_TYPE_DEFAULTS = { fontSize: 13, lineHeight: 1.4 };

/** `--sp-shaped-gallery-ap-fs` / `-lh` on the Ajax pagination button + numbers. */
export const PAGINATION_TYPE_DEFAULTS = { fontSize: 15, lineHeight: 1.4 };

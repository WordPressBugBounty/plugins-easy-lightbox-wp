/**
 * Inserter category icon — the brand mark at 16px, beside an 11px heading.
 *
 * A COMPONENT, not an element like `icon.jsx`, and that is the whole point.
 * Core draws the category heading's glyph through `<Icon icon={icon} />` with no
 * size of its own, so `Icon` falls back to 24 — and for an ELEMENT it clones
 * with `{ size, width, height }`, overwriting whatever the element was built
 * with. A 24px mark against the 11px uppercase heading reads as the heading's
 * equal rather than its marker.
 *
 * For a component `Icon` calls it with `size: 24` instead of rewriting the
 * output, so a component that takes no props keeps the size this file chooses.
 *
 * The artwork, the gradient and the note on its shared gradient id live with
 * `ShapedMark` in `app/icons/index.js` (§18).
 */
import { ShapedMark } from "@shaped-gallery/icons";

const CategoryIcon = () => <ShapedMark size={16} />;

export default CategoryIcon;

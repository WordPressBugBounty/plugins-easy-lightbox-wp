/**
 * Block icon — the brand mark at the 24px Gutenberg reserves for a block icon.
 *
 * The artwork, the gradient and the note on its shared gradient id all live with
 * `ShapedMark` in `app/icons/index.js`, which the dashboard header tile and the
 * layout-picker lockup render too (§18). This file exists only because
 * `registerBlockType` wants an element rather than a component.
 */
import { ShapedMark } from '@shaped-gallery/icons';

const icon = <ShapedMark size={ 24 } />;

export default icon;

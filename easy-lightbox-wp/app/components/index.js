/*
 * @shaped-gallery/components — shared option-panel / UI control library.
 *
 * Ported and adapted from the sibling ShapedPlugin control libraries
 * (Woo Product Slider Pro, Location Weather Pro) to this plugin's conventions:
 * the flat lowercase `{ desktop, tablet, mobile }` responsive shape, the
 * `useDeviceType` hook from `@shaped-gallery/hooks`, and the `sp-shaped-gallery-` CSS prefix.
 *
 * PREFER these components over raw `@wordpress/components` primitives or
 * hand-rolled controls when building inspector panels, admin option screens,
 * and layout-configuration UIs. Reach for a native `@wordpress/components`
 * element only where it is the recommended standard (Button, Spinner, Notice,
 * Placeholder, toolbar) and no shared component wraps it.
 *
 * Import via the barrel:
 *   import { SPRangeControl, Toggle, ChildPanelBody } from '@shaped-gallery/components';
 */

/* Sections & layout. */
export { default as ChildPanelBody, PanelAccordion } from './childPanelBody';
export { default as ComponentTopSection } from './componentTopSection';
export { default as Divider } from './divider';

/* Value controls. */
export { default as SPRangeControl } from './rangeControl';
export { default as SelectField } from './selectField';
export { default as Toggle } from './toggle';
export { default as DualRange } from './dualRange';
export { default as ButtonGroup } from './buttonGroup';

/* Responsive helpers. */
export { default as Responsive } from './responsive';
export { default as Units } from './units';
export { default as ResetButton } from './resetButton';

/* Form controls. */
export { default as ShortcodeField } from './shortcodeField';
export { default as BatchAction } from './batchAction';
export { default as InputControl } from './inputControl';
export { default as CheckboxControl } from './checkboxControl';
export { default as SelectDropdown } from './selectDropdown';

/* Styling controls. */
export { default as ColorPicker } from './color';
export { default as Background } from './background';
export { default as Spacing } from './spacing';
export { default as Border } from './border';
export { default as BoxShadow } from './boxShadow';
export { default as Typography } from './typography';

/* Layout / overlay primitives. */
export { default as TabControls } from './tabControls';
export { default as SpPopover } from './popover';
export { default as PositionPicker } from './positionPicker';
export { default as Modal } from './modal';
export { default as SortableItem } from './sortableItem';

/* Pro teasers — upgrade prompts and locked-control chrome (see ./pro). */
export { ProBadge, ProCardBadge, ProTag, ProNotice, ProPanel, upgradeUrl, openUpgrade, openMediaUpgrade } from './pro';

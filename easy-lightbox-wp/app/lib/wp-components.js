/**
 * Stable-first lookups for `@wordpress/components` APIs that ship only under an
 * `__experimental` alias on some WordPress versions and under both names (or,
 * eventually, only the stable one) on others.
 *
 * `import { __experimentalNumberControl as NumberControl } from '@wordpress/components'`
 * resolves the alias at MODULE LOAD, so a WordPress release that drops it turns
 * every file importing it into a `ReferenceError` before a single component
 * renders — the whole block bundle throws, not just the one control. Reading the
 * export map at runtime through {@see pick} instead means a missing name comes
 * back `undefined` rather than throwing, so a stable release keeps working the
 * moment the stable name exists, and a very old one keeps working for as long as
 * the experimental one still does — one place decides, instead of one `import`
 * per consumer silently picking a side.
 *
 * `app/components/responsive/index.jsx`'s `dispatch(store)?.__experimentalSetPreviewDeviceType?.(...)`
 * is the same idea applied to a store selector rather than a component import.
 */
import * as components from '@wordpress/components';

/**
 * A `@wordpress/components` export by its stable name, falling back to the
 * `__experimental` alias when the stable name does not exist yet.
 *
 * @param {string} stable       Stable export name.
 * @param {string} experimental `__experimental`-prefixed export name.
 * @return {*} The resolved export, or `undefined` if neither exists.
 */
export const pick = ( stable, experimental ) => components[ stable ] ?? components[ experimental ];

export const NumberControl = pick( 'NumberControl', '__experimentalNumberControl' );
export const InputControl = pick( 'InputControl', '__experimentalInputControl' );
export const ToggleGroupControl = pick( 'ToggleGroupControl', '__experimentalToggleGroupControl' );
export const ToggleGroupControlOption = pick( 'ToggleGroupControlOption', '__experimentalToggleGroupControlOption' );
export const ToggleGroupControlOptionIcon = pick( 'ToggleGroupControlOptionIcon', '__experimentalToggleGroupControlOptionIcon' );

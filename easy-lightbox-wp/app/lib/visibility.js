/**
 * Responsive Visibility — the one description of the four Hide on <device> options.
 *
 * The block stores four booleans under `advanced.visibility`; three different
 * places have to agree on what each one means:
 *
 * - the RENDERER puts a class on the block wrapper (`Blocks\BlockTypes\Gallery`,
 *   from `GalleryOptions::HIDE_CLASSES` — the PHP twin of the table below);
 * - the STYLESHEET hides that class inside a media query (`app/blocks/gallery/style.scss`);
 * - the EDITOR marks the block up so an author can see the setting took effect,
 *   which it cannot do with the frontend class (see `editorClass` below).
 *
 * Keeping the table here rather than in each consumer is the §18 rule applied to a
 * feature that spans PHP, CSS and two React trees: rename a class in one place and
 * `tests/php/verify-visibility.php` fails instead of the option silently doing
 * nothing.
 *
 * Deliberately DOM-free and i18n-free so it unit-tests without a browser or a
 * `@wordpress/i18n` mock — the human-readable labels live with the markup that
 * renders them (`panels/AdvancedSettings.jsx`, `edit.jsx`).
 */

/**
 * The four options, in the order the Visibility panel lists them.
 *
 * `className`  — what the renderer prints; the stylesheet hides it.
 * `editorClass`— what the editor canvas gets instead. It CANNOT be `className`:
 *                the block's `style` stylesheet is loaded in the editor iframe
 *                too, so the real class would `display:none` the block and leave
 *                the author no way to select it and turn the option back off.
 * `device`     — the editor device preview this option corresponds to, or `null`
 *                when WordPress has no preview for it. WordPress ships
 *                Desktop / Tablet / Mobile only, and its Mobile preview is a tall
 *                narrow canvas — a portrait phone. Nothing in the editor previews
 *                a phone held sideways, so Hide on Mobile Landscape can only ever
 *                be reported, never shown.
 *
 * @type {Array<{key:string, className:string, editorClass:string, device:?string}>}
 */
export const HIDE_FLAGS = [
	{
		key: 'hideDesktop',
		className: 'sp-shaped-gallery-hide-desktop',
		editorClass: 'is-shaped-hidden-desktop',
		device: 'Desktop',
	},
	{
		key: 'hideTablet',
		className: 'sp-shaped-gallery-hide-tablet',
		editorClass: 'is-shaped-hidden-tablet',
		device: 'Tablet',
	},
	{
		key: 'hideMobilePortrait',
		className: 'sp-shaped-gallery-hide-mobile-portrait',
		editorClass: 'is-shaped-hidden-mobile-portrait',
		device: 'Mobile',
	},
	{
		key: 'hideMobileLandscape',
		className: 'sp-shaped-gallery-hide-mobile-landscape',
		editorClass: 'is-shaped-hidden-mobile-landscape',
		device: null,
	},
];

/**
 * The flags a gallery has switched on, in panel order.
 *
 * @param {?Object} visibility `advanced.visibility` (or anything, including null).
 * @return {Array<Object>} Matching `HIDE_FLAGS` entries; empty when none are set.
 */
export function hiddenFlags( visibility ) {
	if ( ! visibility || typeof visibility !== 'object' ) {
		return [];
	}

	return HIDE_FLAGS.filter( ( flag ) => !! visibility[ flag.key ] );
}

/**
 * Frontend wrapper classes for a gallery's visibility settings.
 *
 * @param {?Object} visibility `advanced.visibility`.
 * @return {string[]} Class names, empty when the gallery is shown everywhere.
 */
export function hiddenClassNames( visibility ) {
	return hiddenFlags( visibility ).map( ( flag ) => flag.className );
}

/**
 * Editor-canvas marker classes for a gallery's visibility settings.
 *
 * @param {?Object} visibility `advanced.visibility`.
 * @return {string[]} Class names, empty when the gallery is shown everywhere.
 */
export function editorClassNames( visibility ) {
	return hiddenFlags( visibility ).map( ( flag ) => flag.editorClass );
}

/**
 * Whether the device the editor is currently previewing is one this gallery hides on.
 *
 * Drives the canvas's "you would not see this here" state. Mobile Landscape has no
 * device preview, so it never answers true — it is reported by the badge instead.
 *
 * @param {?Object} visibility `advanced.visibility`.
 * @param {?string} deviceType Editor device type ('Desktop' | 'Tablet' | 'Mobile').
 * @return {boolean} True when the previewed device is hidden.
 */
export function isHiddenOnDevice( visibility, deviceType ) {
	if ( ! deviceType ) {
		return false;
	}

	return hiddenFlags( visibility ).some( ( flag ) => flag.device === deviceType );
}

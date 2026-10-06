/**
 * Image Click Action — what happens when a visitor clicks a tile.
 *
 * One control, and deliberately only one:
 *
 * - **Click Action Type** (Lightbox / URL / None) — the top-level `clickAction`
 *   attribute. It used to sit in Layout Settings, which split one decision across
 *   two panels: you chose "Lightbox" there and then configured it here. Both
 *   halves now live together. "Lightbox" and "URL" are each dropped from the
 *   button set entirely (`clickActionItems()`), not disabled, when their own
 *   module — Lightbox, Image Custom Url — is off. The STORED `clickAction` is
 *   never rewritten either way — `GalleryOptions::lightbox_active()` /
 *   `custom_url_active()` are what actually stop the frontend from reading it —
 *   but with a value gone from the button set it would otherwise highlight
 *   NOTHING, which reads as a broken control rather than as "this choice is
 *   temporarily unavailable". So the group's DISPLAY falls back to "None" for
 *   exactly that case (`displayClickAction`), while the value on disk is
 *   untouched underneath it: the moment the module comes back on, the button
 *   reappears in the set and — because nothing was ever written — highlighted
 *   again, with no extra state to reconcile.
 *
 * Beneath it, when the display is Lightbox, a note pointing at the one screen
 * that configures the viewer. The gallery stores NOTHING else about the lightbox:
 * the overlay is a page-level singleton shared by every gallery on the page, so
 * every one of its settings is site-wide (Settings → Modules → Lightbox). See
 * `Modules\Lightbox` for that split.
 *
 * **The whole panel disappears when neither Lightbox nor URL has anything left
 * to offer** (both modules off): with only "None" remaining there is no CHOICE
 * left to make, and a single-button "choice" is not a control, it is decoration.
 * A module is the one thing that decides whether a per-gallery setting means
 * anything at all; showing its control regardless doesn't make sense once the
 * module is off.
 *
 * The panel is universal — shown for every layout (module state permitting), and
 * mounted whenever it has something to show, since it owns the control that
 * decides whether a lightbox is used at all.
 */
import { createInterpolateElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ChildPanelBody, ButtonGroup } from '@shaped-gallery/components';

/**
 * Click Action Type — what a tile click does at all. "Lightbox" / "URL" are
 * filtered out entirely (not disabled) when their own module is off — see the
 * file doc-block for why a stored value pointing at a filtered-out choice is
 * left untouched either way.
 *
 * @param {boolean} lightboxEnabled       Whether the Lightbox module is on.
 * @param {boolean} imageCustomUrlEnabled Whether the Image Custom Url module is on.
 * @return {Array<{value:string,label:string}>} Button-set items.
 */
const clickActionItems = ( lightboxEnabled, imageCustomUrlEnabled ) =>
	[
		lightboxEnabled && { value: 'lightbox', label: __( 'Lightbox', 'easy-lightbox-wp' ) },
		imageCustomUrlEnabled && { value: 'url', label: __( 'URL', 'easy-lightbox-wp' ) },
		{ value: 'none', label: __( 'None', 'easy-lightbox-wp' ) },
	].filter( Boolean );

/**
 * Image Click Action panel.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {(JSX.Element|null)} Panel, or null once neither module leaves a real choice.
 */
export default function ClickActionSettings( { attributes, setAttributes } ) {
	const { clickAction = 'lightbox' } = attributes;
	// Localized by Core\Assets; absent only if the payload failed to print, in
	// which case the note degrades to the plain text it was before.
	const modulesUrl = window.shaped_gallery_data?.modulesUrl || '';
	// Undefined defaults OPEN on every flag below — the render-side gates
	// (GalleryOptions::lightbox_active() / custom_url_active()) are what actually
	// enforce a module being off, so a missing flag here can only ever show a
	// choice render-time silently ignores, never the reverse.
	const lightboxEnabled = window.shaped_gallery_data?.lightboxEnabled ?? true;
	const imageCustomUrlEnabled = window.shaped_gallery_data?.imageCustomUrlEnabled ?? true;

	const items = clickActionItems( lightboxEnabled, imageCustomUrlEnabled );

	// Nothing to choose between once only "None" is left — the whole panel is
	// noise at that point, not a disabled-but-present control.
	if ( items.length < 2 ) {
		return null;
	}

	// Display-only: ButtonGroup's `attributes` prop drives which button is
	// highlighted but — in this non-responsive form — plays no part in what
	// `setValue` writes (that always uses `attributesKey`), so overriding it here
	// cannot leak into storage. A stored value whose own module is off is the
	// ONLY case this touches; every other value passes through unchanged.
	const displayClickAction =
		( 'lightbox' === clickAction && ! lightboxEnabled ) ||
		( 'url' === clickAction && ! imageCustomUrlEnabled )
			? 'none'
			: clickAction;

	const isLightbox = 'lightbox' === displayClickAction;

	return (
		<ChildPanelBody title={ __( 'Image Click Action', 'easy-lightbox-wp' ) }>
			<ButtonGroup
				label={ __( 'Click Action Type', 'easy-lightbox-wp' ) }
				attributesKey="clickAction"
				attributes={ displayClickAction }
				setAttributes={ setAttributes }
				items={ items }
			/>

			{ /* Where the lightbox is configured. The link opens in a new tab so an
			   unsaved post is never navigated away from, and degrades to plain text
			   if the payload is missing. */ }
			{ isLightbox && (
				<div className="sp-shaped-gallery-note">
					<p className="sp-shaped-gallery-note__text">
						{ createInterpolateElement(
							__(
								'<b>Note:</b> <a>Configure Lightbox Settings</a> globally from Module Settings.',
								'easy-lightbox-wp'
							),
							{
								b: <strong />,
								a: modulesUrl ? (
									// eslint-disable-next-line jsx-a11y/anchor-has-content
									<a
										className="sp-shaped-gallery-note__link"
										href={ modulesUrl }
										target="_blank"
										rel="noopener noreferrer"
									/>
								) : (
									<span className="sp-shaped-gallery-note__link" />
								),
							}
						) }
					</p>
				</div>
			) }
		</ChildPanelBody>
	);
}

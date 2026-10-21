/**
 * Image & Video Settings — a universal inspector panel (shared across every
 * layout). Built from the Figma design (the single source of truth): the panel
 * splits into "Settings" and "Style" tabs. The Settings tab holds the media
 * behaviour controls; the Style tab holds the visual styling — a Normal / Hover
 * state switcher gating the per-state styles (border, radius, shadow) — plus a
 * global margin.
 *
 * This module owns editor UI + attribute writes only. Every field is written into
 * the grouped `imageVideo` attribute object, following the block's grouped-object
 * convention (content, ajaxPagination, …); per-state styles nest under
 * `imageVideo.style.{normal,hover}`, and the global Margin reuses the top-level
 * `margin` attribute. Built entirely from the shared `@shaped-gallery/components`
 * control library.
 *
 * Everything here is consumed downstream: behaviour by `GalleryOptions::
 * normalize_image_video()` + `LayoutRenderer` (+ `app/frontend/media.js` for the
 * preloader / inline video), and styling by the `ImageVideoStyle` contributor's
 * `--sp-shaped-gallery-iv-*` custom properties (editor mirror:
 * `app/lib/style/image-video-vars.js`).
 *
 * What Pro adds to this panel is a closing note under both tabs (`ProNotice`
 * with a feature list), not locked controls among the working ones: disabled rows
 * in a panel the user is actively editing are noise. The note reads and writes
 * nothing — this build has no aspect-ratio sizing, watermark pipeline, protection
 * runtime, hover animation, filter or overlay styling, and declares none of their
 * keys. The list follows Pro's own panel (`shaped-gallery-pro/.../ImageVideoSettings.jsx`),
 * in its order. Aspect Ratio leads it on every layout this build renders, Justified
 * and Masonry included, although of these three Pro's control sizes Grid only (Pro's
 * `GalleryOptions::ASPECT_RATIO_LAYOUTS`; the other two are built from each image's
 * own ratio). That is a deliberate call for this build's teaser, not an oversight —
 * Pro's own panel is unchanged.
 */
import { createInterpolateElement, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	ChildPanelBody,
	TabControls,
	SelectField,
	Toggle,
	ButtonGroup,
	SPRangeControl,
	Border,
	Spacing,
	BoxShadow,
	Divider,
	ProNotice,
} from '@shaped-gallery/components';

/** Chrome autoplay policy — the external reference shown in the AutoPlay note. */
const AUTOPLAY_POLICY_URL = 'https://developer.chrome.com/blog/autoplay/';

/**
 * PanelNote — the accent-barred inline note used for conditional guidance.
 * Presentational only.
 *
 * @param {Object}      props
 * @param {JSX.Element} props.children Note content (already i18n'd).
 * @param {boolean}     [props.italic] Render the note italic (autoplay variant).
 * @return {JSX.Element} Note.
 */
function PanelNote( { children, italic = false } ) {
	return (
		<div className={ `sp-shaped-gallery-note ${ italic ? 'is-italic' : '' }`.trim() }>
			<span className="sp-shaped-gallery-note__bar" aria-hidden="true" />
			<p className="sp-shaped-gallery-note__text">{ children }</p>
		</div>
	);
}

/**
 * Settings tab — the media behaviour controls, in Figma order.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Settings tab body.
 */
function SettingsTab( { attributes, setAttributes } ) {
	const { imageVideo = {} } = attributes;

	// Grouped write: patch a single key on the imageVideo object.
	const update = ( key, value ) =>
		setAttributes( { imageVideo: { ...imageVideo, [ key ]: value } } );

	return (
		<>
			<SelectField
				label={ __( 'Resolution', 'easy-lightbox-wp' ) }
				flexStyle
				value={ imageVideo.resolution ?? 'large' }
				onChange={ ( value ) => update( 'resolution', value ) }
				items={ [
					{ label: __( 'Thumbnail', 'easy-lightbox-wp' ), value: 'thumbnail' },
					{ label: __( 'Medium', 'easy-lightbox-wp' ), value: 'medium' },
					{ label: __( 'Large', 'easy-lightbox-wp' ), value: 'large' },
					{ label: __( 'Full', 'easy-lightbox-wp' ), value: 'full' },
				] }
			/>

			{ /* Deferred loading itself has no control — it is always on — so the
			   placeholder that covers the gap while a deferred image arrives is a
			   plain toggle here rather than a nested one. */ }
			<Toggle
				label={ __( 'Image Preloader', 'easy-lightbox-wp' ) }
				checked={ !! imageVideo.imagePreloader }
				onChange={ ( value ) => update( 'imagePreloader', value ) }
			/>

			<Divider />

			<ButtonGroup
				label={ __( 'Video Play Mode', 'easy-lightbox-wp' ) }
				value={ imageVideo.videoPlayMode ?? 'inline' }
				onChange={ ( value ) => update( 'videoPlayMode', value ) }
				items={ [
					{ value: 'inline', label: __( 'Inline', 'easy-lightbox-wp' ) },
					{ value: 'popup', label: __( 'Popup', 'easy-lightbox-wp' ) },
				] }
			/>

			<Toggle
				label={ __( 'AutoPlay', 'easy-lightbox-wp' ) }
				checked={ imageVideo.autoplay ?? true }
				onChange={ ( value ) => update( 'autoplay', value ) }
			/>
			{ ( imageVideo.autoplay ?? true ) && (
				<PanelNote italic>
					{ createInterpolateElement(
						__(
							'Note: Autoplay may be affected by <a>Google’s autoplay policy</a> on Chrome.',
							'easy-lightbox-wp'
						),
						{
							a: (
								// createInterpolateElement injects the link text at runtime.
								// eslint-disable-next-line jsx-a11y/anchor-has-content
								<a
									href={ AUTOPLAY_POLICY_URL }
									target="_blank"
									rel="noreferrer noopener"
								/>
							),
						}
					) }
				</PanelNote>
			) }

			<SPRangeControl
				label={ __( 'Play Icon Size', 'easy-lightbox-wp' ) }
				value={ imageVideo.playIconSize ?? 48 }
				onChange={ ( value ) => update( 'playIconSize', value ) }
				min={ 12 }
				max={ 120 }
				defaultValue={ 48 }
				globalSteps
			/>

			<Toggle
				label={ __( 'Display Icon on Hover', 'easy-lightbox-wp' ) }
				checked={ !! imageVideo.displayIconOnHover }
				onChange={ ( value ) => update( 'displayIconOnHover', value ) }
			/>
		</>
	);
}

/**
 * Style tab — the visual styling controls, in Figma order.
 *
 * Layout: a Normal / Hover state switcher that scopes the per-state styles below
 * it (border, radius, shadow), then a global margin after the divider. The active
 * state is editor-only local state; the styles it edits persist under
 * `imageVideo.style[state]`.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Style tab body.
 */
function StyleTab( { attributes, setAttributes } ) {
	const { imageVideo = {} } = attributes;
	const style = imageVideo.style ?? {};

	// Normal / Hover is a pure editor concern: it only chooses which state's
	// styles the controls below read and write — it is not persisted.
	const [ state, setState ] = useState( 'normal' );
	const stateStyle = style[ state ] ?? {};

	// Grouped write shaped like `setAttributes` so the composite controls
	// (Spacing, BoxShadow) that call `setAttributes({ [key]: value })` patch the
	// active state's style object instead of a top-level attribute.
	const setStyleAttr = ( patch ) =>
		setAttributes( {
			imageVideo: {
				...imageVideo,
				style: { ...style, [ state ]: { ...stateStyle, ...patch } },
			},
		} );

	return (
		<>
			{ /* State selector — everything until the Divider is scoped to it. */ }
			<ButtonGroup
				value={ state }
				onChange={ setState }
				items={ [
					{ value: 'normal', label: __( 'Normal', 'easy-lightbox-wp' ) },
					{ value: 'hover', label: __( 'Hover', 'easy-lightbox-wp' ) },
				] }
			/>

			<Border
				label={ __( 'Image Border', 'easy-lightbox-wp' ) }
				attributes={ { border: stateStyle.border, borderWidth: stateStyle.borderWidth } }
				attributesKey={ { border: 'border', borderWidth: 'borderWidth' } }
				setAttributes={ setStyleAttr }
				defaultColor=""
			/>

			<Spacing
				label={ __( 'Border Radius', 'easy-lightbox-wp' ) }
				attributes={ stateStyle.borderRadius }
				attributesKey="borderRadius"
				setAttributes={ setStyleAttr }
				units={ [ 'px', '%', 'em' ] }
				defaultValue={ { top: '0', right: '0', bottom: '0', left: '0' } }
				indicator="radius"
			/>

			{ /* No Default / Hover colour switcher: the state selector above already
			   scopes this control to one state, so a second state axis inside it
			   would write a `hoverColor` no renderer reads. */ }
			<BoxShadow
				attributes={ stateStyle.boxShadow }
				attributesKey="boxShadow"
				setAttributes={ setStyleAttr }
				enableAttribute={ stateStyle.boxShadowEnable }
				enableAttributeKey="boxShadowEnable"
				shadowColorState={ false }
			/>

			<Divider />

			<Spacing
				label={ __( 'Margin', 'easy-lightbox-wp' ) }
				attributes={ attributes.margin }
				attributesKey="margin"
				setAttributes={ setAttributes }
				units={ [ 'px', '%', 'em' ] }
			/>
		</>
	);
}

/**
 * Image & Video Settings panel.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Panel.
 */
export default function ImageVideoSettings( { attributes, setAttributes } ) {
	return (
		<ChildPanelBody title={ __( 'Image & Video Settings', 'easy-lightbox-wp' ) }>
			<TabControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				labels={ { general: __( 'Settings', 'easy-lightbox-wp' ) } }
				GeneralTab={ SettingsTab }
				StyleTab={ StyleTab }
			/>

			<ProNotice
				showOffer
				features={ [
					__( 'Aspect Ratio', 'easy-lightbox-wp' ),
					__( 'Image Watermark', 'easy-lightbox-wp' ),
					__( 'Right Click Protection', 'easy-lightbox-wp' ),
					__( 'Hover Animations', 'easy-lightbox-wp' ),
					__( 'Image Filter & Overlay', 'easy-lightbox-wp' ),
				] }
			/>
		</ChildPanelBody>
	);
}

/**
 * Advanced Settings — a universal inspector panel (shared across every layout).
 * Built from the Figma design (the single source of truth). A segmented control
 * splits the panel into three sub-tabs, each owning an independent concern:
 *
 *   • General    → block-wrapper Background (Solid / Gradient), Padding, Margin.
 *   • Visibility → responsive show / hide toggles (Desktop / Tablet / Mobile).
 *   • Advanced   → additional CSS class(es) and CSS id for the block wrapper.
 *
 * This module owns editor UI + attribute writes only; the rendering side is the
 * `GeneralStyle` contributor (background / padding / margin) and
 * `Gallery::render()` (the visibility classes and the CSS class / id). Every
 * setting persists into the grouped `advanced` attribute object, following the
 * block's grouped-object convention (imageVideo, content, …). Layout-independent
 * by design so it is shared across every gallery layout. Built from the shared
 * `@shaped-gallery/components` library; the hook fields use the native
 * `TextareaControl` (no shared wrapper exists).
 */
import { TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	ChildPanelBody,
	TabControls,
	Background,
	Spacing,
	Toggle,
	SelectField,
	InputControl,
} from '@shaped-gallery/components';
/** Length units offered by the Padding / Margin spacing controls. */
const SPACING_UNITS = [ 'px', '%', 'em' ];

/**
 * General sub-tab — block-wrapper background + box model.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Tab body.
 */
function GeneralTab( { attributes, setAttributes } ) {
	const { advanced = {} } = attributes;

	// setAttributes-shaped shim so composite controls (Background, Spacing) — which
	// call `setAttributes({ [key]: value })` internally — patch the `advanced`
	// object instead of writing a top-level attribute.
	const setAdvancedAttr = ( patch ) =>
		setAttributes( { advanced: { ...advanced, ...patch } } );

	return (
		<>
			<Background
				attributes={ advanced.background }
				attributesKey="background"
				setAttributes={ setAdvancedAttr }
				defaultColor=""
			/>

			<Spacing
				label={ __( 'Padding', 'easy-lightbox-wp' ) }
				attributes={ advanced.padding || { desktop: {}, tablet: {}, mobile: {}, unit: 'px' } }
				attributesKey="padding"
				setAttributes={ setAdvancedAttr }
				units={ SPACING_UNITS }
			/>

			<Spacing
				label={ __( 'Margin', 'easy-lightbox-wp' ) }
				attributes={ advanced.margin || { desktop: {}, tablet: {}, mobile: {}, unit: 'px' } }
				attributesKey="margin"
				setAttributes={ setAdvancedAttr }
				units={ SPACING_UNITS }
			/>
		</>
	);
}

/**
 * Visibility sub-tab — hide the gallery per device.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Tab body.
 */
function VisibilityTab( { attributes, setAttributes } ) {
	const { advanced = {} } = attributes;
	const visibility = advanced.visibility || {};

	// Grouped write: patch a single flag on the nested `visibility` object.
	const update = ( key, value ) =>
		setAttributes( {
			advanced: { ...advanced, visibility: { ...visibility, [ key ]: value } },
		} );

	return (
		<>
			<SelectField
				label={ __( 'Visibility', 'easy-lightbox-wp' ) }
				value={ visibility.mode || 'public' }
				onChange={ ( value ) => update( 'mode', value ) }
				items={ [
					{ label: __( 'Public', 'easy-lightbox-wp' ), value: 'public' },
					{ label: __( 'Password', 'easy-lightbox-wp' ), value: 'password' },
					{ label: __( 'Private', 'easy-lightbox-wp' ), value: 'private' },
				] }
			/>

			{ visibility.mode === 'password' && (
				<InputControl
					label={ __( 'Set Password', 'easy-lightbox-wp' ) }
					value={ visibility.password || '' }
					onChange={ ( value ) => update( 'password', value ) }
				/>
			) }

			<Toggle
				label={ __( 'Hide on Desktop', 'easy-lightbox-wp' ) }
				checked={ !! visibility.hideDesktop }
				onChange={ ( value ) => update( 'hideDesktop', value ) }
			/>
			<Toggle
				label={ __( 'Hide on Tablet', 'easy-lightbox-wp' ) }
				checked={ !! visibility.hideTablet }
				onChange={ ( value ) => update( 'hideTablet', value ) }
			/>
			<Toggle
				label={ __( 'Hide on Mobile Portrait', 'easy-lightbox-wp' ) }
				checked={ !! visibility.hideMobilePortrait }
				onChange={ ( value ) => update( 'hideMobilePortrait', value ) }
			/>
			<Toggle
				label={ __( 'Hide on Mobile Landscape', 'easy-lightbox-wp' ) }
				checked={ !! visibility.hideMobileLandscape }
				onChange={ ( value ) => update( 'hideMobileLandscape', value ) }
			/>
		</>
	);
}

/**
 * Advanced sub-tab — styling hooks for the block wrapper.
 *
 * Both fields are hooks for CSS written ELSEWHERE (the theme's Additional CSS, a
 * child theme): they only put a class or an id on the wrapper. The block itself
 * has no raw-CSS field — see §6.3.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Tab body.
 */
function AdvancedTab( { attributes, setAttributes } ) {
	const { advanced = {} } = attributes;

	return (
		<>
			<TextareaControl
				label={ __( 'Additional CSS Class(es)', 'easy-lightbox-wp' ) }
				value={ advanced.customCssClass || '' }
				onChange={ ( value ) =>
					setAttributes( { advanced: { ...advanced, customCssClass: value } } )
				}
			/>
			<TextareaControl
				label={ __( 'Additional CSS ID', 'easy-lightbox-wp' ) }
				value={ advanced.customCssId || '' }
				onChange={ ( value ) =>
					setAttributes( { advanced: { ...advanced, customCssId: value } } )
				}
				__nextHasNoMarginBottom
			/>
		</>
	);
}

/**
 * Advanced Settings panel.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Panel.
 */
export default function AdvancedSettings( { attributes, setAttributes } ) {
	return (
		<ChildPanelBody title={ __( 'Advanced Settings', 'easy-lightbox-wp' ) }>
			<TabControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				GeneralTab={ GeneralTab }
				VisibilityTab={ VisibilityTab }
				AdvancedTab={ AdvancedTab }
				showIcons={ false }
			/>
		</ChildPanelBody>
	);
}

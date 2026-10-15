/**
 * Ajax Pagination — a universal inspector panel (shared across every layout).
 * Built from the Figma design (the single source of truth): the panel splits
 * into "Settings" and "Style" tabs (mirroring the Content Settings panel). The
 * Settings tab holds the pagination behaviour: the show-per-view count (which
 * sizes both the initial view and each Load More page), the button label, the
 * end-of-list message and the control alignment. The Style tab holds the button
 * styling — typography, a Normal / Hover state switcher gating the per-state
 * colours (text, background, border), then the global box model (border radius,
 * inner padding, margin).
 *
 * This module owns editor UI + attribute writes only; the bar itself is
 * `LayoutRenderer::pagination_markup()`, its appearance the `AjaxStyle`
 * contributor, and its behaviour `app/frontend/pagination.js`. Every field is
 * written into the grouped `ajaxPagination` attribute object, following the
 * block's grouped-object
 * convention (imageVideo, content, …). The show-per-view count keeps
 * the flat `{ desktop, tablet, mobile }` responsive shape; the Style tab
 * nests under `ajaxPagination.style`, with per-state colours under
 * `style.{normal,hover}`. Built entirely from the shared
 * `@shaped-gallery/components` control library.
 *
 * The feature's enable toggle lives in Layout Settings (per the design); this
 * panel configures it and stays layout-independent.
 *
 * Pro's extra pagination modes are listed in a closing note under both tabs
 * (`ProNotice` with a feature list), not drawn as locked controls among the
 * working ones: disabled rows in a panel the user is actively editing are noise.
 * The note writes nothing — this build stores no `ajaxPagination.type` and its
 * pagination runtime only knows Load More.
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	ChildPanelBody,
	TabControls,
	ButtonGroup,
	ProNotice,
	SPRangeControl,
	InputControl,
	Typography,
	ColorPicker,
	Background,
	Border,
	Spacing,
	Divider,
} from '@shaped-gallery/components';
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from '@shaped-gallery/icons';
import { PAGINATION_TYPE_DEFAULTS } from '../type-defaults';

/** Alignment options — icon segments (Figma: left / center / right). */
const ALIGNMENT_ITEMS = [
	{ value: 'left', label: __( 'Left', 'easy-lightbox-wp' ), icon: AlignLeftIcon },
	{ value: 'center', label: __( 'Center', 'easy-lightbox-wp' ), icon: AlignCenterIcon },
	{ value: 'right', label: __( 'Right', 'easy-lightbox-wp' ), icon: AlignRightIcon },
];

/**
 * Settings tab — pagination behaviour, in Figma order.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Settings tab body.
 */
function SettingsTab( { attributes, setAttributes } ) {
	const { ajaxPagination = {} } = attributes;

	// Grouped write: patch a single key on the ajaxPagination object.
	const update = ( key, value ) =>
		setAttributes( { ajaxPagination: { ...ajaxPagination, [ key ]: value } } );

	// setAttributes-shaped shim so the responsive SPRangeControl (which calls
	// `setAttributes({ [key]: value })`) patches the ajaxPagination object
	// instead of a top-level attribute.
	const setAjaxAttr = ( patch ) =>
		setAttributes( { ajaxPagination: { ...ajaxPagination, ...patch } } );

	return (
		<>
			<SPRangeControl
				label={ __( 'Show Per View', 'easy-lightbox-wp' ) }
				attributesKey="showPerView"
				attributes={ ajaxPagination.showPerView }
				setAttributes={ setAjaxAttr }
				responsive
				min={ 1 }
				max={ 100 }
				defaultValue={ { desktop: 15, tablet: 15, mobile: 15 } }
			/>

			<InputControl
				label={ __( 'Button Label', 'easy-lightbox-wp' ) }
				value={ ajaxPagination.buttonLabel ?? '' }
				onChange={ ( value ) => update( 'buttonLabel', value ) }
				placeholder={ __( 'Load More', 'easy-lightbox-wp' ) }
			/>

			<InputControl
				label={ __( 'Ending Message', 'easy-lightbox-wp' ) }
				value={ ajaxPagination.endingMessage ?? '' }
				onChange={ ( value ) => update( 'endingMessage', value ) }
				placeholder={ __( 'No more images available', 'easy-lightbox-wp' ) }
			/>

			<ButtonGroup
				label={ __( 'Alignment', 'easy-lightbox-wp' ) }
				value={ ajaxPagination.alignment ?? 'center' }
				onChange={ ( value ) => update( 'alignment', value ) }
				items={ ALIGNMENT_ITEMS }
			/>
		</>
	);
}

/**
 * Style tab — pagination button styling, in Figma order.
 *
 * Layout: a global typography popover, then a Normal / Hover state switcher that
 * scopes the per-state colours below it (text, background, border), then the
 * global box model after the divider (border radius, inner padding, margin). The
 * active state is editor-only local state; the colours it edits persist under
 * `ajaxPagination.style[state]`, while the typography and box model persist on
 * `ajaxPagination.style` directly.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Style tab body.
 */
function StyleTab( { attributes, setAttributes } ) {
	const { ajaxPagination = {} } = attributes;
	const style = ajaxPagination.style ?? {};

	// Normal / Hover is a pure editor concern: it only chooses which state's
	// colours the controls between the switcher and the divider read / write —
	// it is not persisted.
	const [ state, setState ] = useState( 'normal' );
	const stateStyle = style[ state ] ?? {};

	// setAttributes-shaped shim so the composite controls (Typography, Spacing)
	// that call `setAttributes({ [key]: value })` patch the style object instead
	// of a top-level attribute.
	const setStyleAttr = ( patch ) =>
		setAttributes( { ajaxPagination: { ...ajaxPagination, style: { ...style, ...patch } } } );

	// Same shim, scoped to the active Normal / Hover state (Background, Border).
	const setStateAttr = ( patch ) =>
		setAttributes( {
			ajaxPagination: {
				...ajaxPagination,
				style: { ...style, [ state ]: { ...stateStyle, ...patch } },
			},
		} );

	return (
		<>
			<Typography
				label={ __( 'Typography', 'easy-lightbox-wp' ) }
				attributes={ style }
				setAttributes={ setStyleAttr }
				typographyKey="typography"
				fontSizeKey="fontSize"
				lineHeightKey="lineHeight"
				letterSpacingKey="letterSpacing"
				wordSpacingKey="wordSpacing"
				defaults={ PAGINATION_TYPE_DEFAULTS }
			/>

			{ /* State selector — Text Color / Background / Border are scoped to it. */ }
			<ButtonGroup
				value={ state }
				onChange={ setState }
				items={ [
					{ value: 'normal', label: __( 'Normal', 'easy-lightbox-wp' ) },
					{ value: 'hover', label: __( 'Hover', 'easy-lightbox-wp' ) },
				] }
			/>

			<ColorPicker
				label={ __( 'Text Color', 'easy-lightbox-wp' ) }
				value={ stateStyle.textColor ?? '' }
				onChange={ ( color ) => setStateAttr( { textColor: color } ) }
				defaultColor=""
			/>

			<Background
				label={ __( 'Background Type', 'easy-lightbox-wp' ) }
				colorLabel={ __( 'Background Color', 'easy-lightbox-wp' ) }
				attributes={ stateStyle.background }
				attributesKey="background"
				setAttributes={ setStateAttr }
				items={ [ 'solid', 'gradient' ] }
				defaultColor=""
			/>

			<Border
				label={ __( 'Border', 'easy-lightbox-wp' ) }
				attributes={ { border: stateStyle.border, borderWidth: stateStyle.borderWidth } }
				attributesKey={ { border: 'border', borderWidth: 'borderWidth' } }
				setAttributes={ setStateAttr }
				defaultColor=""
			/>

			<Divider />

			<Spacing
				label={ __( 'Border Radius', 'easy-lightbox-wp' ) }
				attributes={ style.borderRadius }
				attributesKey="borderRadius"
				setAttributes={ setStyleAttr }
				units={ [ 'px', '%', 'em' ] }
				defaultValue={ { top: '0', right: '0', bottom: '0', left: '0' } }
				indicator="radius"
			/>

			<Spacing
				label={ __( 'Inner Padding', 'easy-lightbox-wp' ) }
				attributes={ style.padding }
				attributesKey="padding"
				setAttributes={ setStyleAttr }
				units={ [ 'px', '%', 'em' ] }
				axes={true}
			/>

			<Spacing
				label={ __( 'Margin', 'easy-lightbox-wp' ) }
				attributes={ style.margin }
				attributesKey="margin"
				setAttributes={ setStyleAttr }
				units={ [ 'px', '%', 'em' ] }
				axes={true}
			/>
		</>
	);
}

/**
 * Ajax Pagination panel.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Panel.
 */
export default function AjaxPaginationSettings( { attributes, setAttributes } ) {
	return (
		<ChildPanelBody title={ __( 'Ajax Pagination', 'easy-lightbox-wp' ) }>
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
					__( 'Number Pagination', 'easy-lightbox-wp' ),
					__( 'Infinity Load (on scroll)', 'easy-lightbox-wp' ),
					__( 'Page Number Styling', 'easy-lightbox-wp' ),
				] }
			/>
		</ChildPanelBody>
	);
}

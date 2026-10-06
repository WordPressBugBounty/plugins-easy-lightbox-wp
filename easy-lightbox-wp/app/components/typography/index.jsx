/**
 * Typography — a composite text-styling control matching the Figma Typography
 * popover (node 7-26246): a grey title bar, a Font Family / Font Style row
 * (`react-select` over a static family list + `SelectField` weights), a Font
 * Size + Line Height range section sharing one device switcher (shown once on
 * Font Size), a two-column Letter / Word Spacing numeric row, and a Text Format
 * segmented control (italic / underline / strikethrough + the text-transform
 * group). Owns its own `SpPopover` trigger + panel (mirroring Woo Product
 * Slider Pro's `Typography`), so consumers render it directly instead of each
 * wrapping it in a separate `SpPopover`.
 *
 * No network font fetching and no external typography utilities — the family
 * list is a fixed set of widely available faces.
 *
 * The typography value carries the non-responsive keys
 * `{ family, fontWeight, style, transform, decoration }`; `fontSize`,
 * `lineHeight`, `letterSpacing`, and `wordSpacing` are separate flat-responsive
 * attributes ( `{ desktop, tablet, mobile[, unit] }` ), all governed by the one
 * shared device switcher on the Font Size row.
 *
 * @param {Object}   props
 * @param {string}   [props.label]            Trigger label for the popover toggle.
 * @param {Object}   props.attributes         Block attributes.
 * @param {Function} props.setAttributes      setAttributes.
 * @param {string}   [props.typographyKey]    Attribute name for the typography object.
 * @param {string}   [props.fontSizeKey]      Attribute name for the font-size (responsive) object.
 * @param {string}   [props.lineHeightKey]    Attribute name for the line-height (responsive) object.
 * @param {string}   [props.letterSpacingKey] Attribute name for the letter-spacing (responsive) object.
 * @param {string}   [props.wordSpacingKey]   Attribute name for the word-spacing (responsive) object.
 * @param {Object}   [props.defaults]         The element's STATIC stylesheet defaults
 *                                            (`{ fontSize, lineHeight }`), i.e. the
 *                                            `var(--…-fs, 16px)` fallbacks in style.scss.
 *                                            With nothing stored yet the sliders show these
 *                                            instead of 0, so the control reads the size the
 *                                            gallery actually renders, and reset returns to it.
 * @return {JSX.Element} Control.
 */
import Select from 'react-select';
import { __ } from '@wordpress/i18n';
import { memo, Fragment } from '@wordpress/element';
import { NumberControl } from '@shaped-gallery/lib/wp-components';
import { useDeviceType } from '@shaped-gallery/hooks';
import { ItalicIcon, UnderlineIcon, StrikethroughIcon } from '@shaped-gallery/icons';
import SelectField from '../selectField';
import SPRangeControl from '../rangeControl';
import SpPopover from '../popover';
import '../shared.scss';
import './editor.scss';

/** Common, widely available web / Google font families (no network fetch). */
const FONT_FAMILIES = [
	'Default',
	'Arial',
	'Helvetica',
	'Georgia',
	'Times New Roman',
	'Courier New',
	'Verdana',
	'Tahoma',
	'Trebuchet MS',
	'Roboto',
	'Open Sans',
	'Lato',
	'Montserrat',
	'Poppins',
	'Inter',
	'Nunito',
	'Raleway',
	'Playfair Display',
	'Merriweather',
	'Source Sans Pro',
	'Oswald',
];

/** Font-weight options shared by every family. */
const FONT_WEIGHTS = [
	{ label: __( 'Thin 100', 'easy-lightbox-wp' ), value: '100' },
	{ label: __( 'Extra Light 200', 'easy-lightbox-wp' ), value: '200' },
	{ label: __( 'Light 300', 'easy-lightbox-wp' ), value: '300' },
	{ label: __( 'Regular 400', 'easy-lightbox-wp' ), value: '400' },
	{ label: __( 'Medium 500', 'easy-lightbox-wp' ), value: '500' },
	{ label: __( 'Semi Bold 600', 'easy-lightbox-wp' ), value: '600' },
	{ label: __( 'Bold 700', 'easy-lightbox-wp' ), value: '700' },
	{ label: __( 'Extra Bold 800', 'easy-lightbox-wp' ), value: '800' },
	{ label: __( 'Black 900', 'easy-lightbox-wp' ), value: '900' },
];

/**
 * Text Format row — decoration toggles (independently on/off) followed by the
 * text-transform group (single-select; clicking the active one clears it).
 * Rendered as one segmented row with a divider between every segment.
 */
const FORMAT_OPTIONS = [
	{ icon: <ItalicIcon />, label: __( 'Italic', 'easy-lightbox-wp' ), key: 'style', value: 'italic' },
	{ icon: <UnderlineIcon />, label: __( 'Underline', 'easy-lightbox-wp' ), key: 'decoration', value: 'underline' },
	{ icon: <StrikethroughIcon />, label: __( 'Strikethrough', 'easy-lightbox-wp' ), key: 'decoration', value: 'line-through' },
	{ label: 'AB', title: __( 'Uppercase', 'easy-lightbox-wp' ), key: 'transform', value: 'uppercase' },
	{ label: 'ab', title: __( 'Lowercase', 'easy-lightbox-wp' ), key: 'transform', value: 'lowercase' },
	{ label: 'Ab', title: __( 'Capitalize', 'easy-lightbox-wp' ), key: 'transform', value: 'capitalize' },
];

const familyOptions = FONT_FAMILIES.map( ( family ) => ( { label: family, value: family } ) );

/**
 * Resolve a flat-responsive scalar for the active device, falling back to the
 * element's static stylesheet default when nothing is stored.
 *
 * An unset font size is not "0": the text renders at the `var(--…-fs, 16px)`
 * fallback baked into style.scss. Seeding the slider with that number is what
 * makes the control agree with the canvas — and makes the first drag a step
 * from the real size instead of a jump away from zero.
 *
 * @param {Object} bundle   Responsive bundle (`{ desktop, tablet, mobile }`).
 * @param {string} device   Active editor device.
 * @param {number} fallback Static stylesheet default, or undefined when there is none.
 * @return {number|string|undefined} Display value.
 */
function resolveScalar( bundle, device, fallback ) {
	const stored = bundle?.[ device ] ?? bundle?.desktop;
	return '' === stored || null === stored || undefined === stored ? fallback : stored;
}

/**
 * SpacingNumberField — a labelled numeric measurement input (Letter / Word
 * Spacing) with a static PX badge, reading / writing the active device on a
 * flat-responsive attribute object. Matches the Figma "Measurement" control
 * (no slider): white box, `#ddd` border, centered value, stacked spin buttons.
 *
 * @param {Object}   props
 * @param {string}   props.label         Field label.
 * @param {Object}   props.attributes    Block attributes.
 * @param {string}   props.attributeKey  Responsive attribute name to read / write.
 * @param {Function} props.setAttributes setAttributes.
 * @param {number}   props.min           Minimum value.
 * @param {number}   props.max           Maximum value.
 * @param {number}   [props.step=1]      Step.
 * @return {JSX.Element} Field.
 */
function SpacingNumberField( { label, attributes, attributeKey, setAttributes, min, max, step = 1 } ) {
	const device = useDeviceType();
	const responsive = attributes[ attributeKey ] || {};
	const value = responsive[ device ] ?? responsive.desktop ?? '';

	const setValue = ( next ) =>
		setAttributes( { [ attributeKey ]: { ...responsive, [ device ]: next } } );

	return (
		<div className="sp-shaped-gallery-typography__num">
			<div className="sp-shaped-gallery-control-head">
				<div className="sp-shaped-gallery-control-head__left">
					<span className="sp-shaped-gallery-control__title">{ label }</span>
				</div>
				<div className="sp-shaped-gallery-control-head__right">
					<span className="sp-shaped-gallery-typography__unit">{ __( 'PX', 'easy-lightbox-wp' ) }</span>
				</div>
			</div>
			<NumberControl
				className="sp-shaped-gallery-typography__num-input"
				label={ label }
				hideLabelFromVision
				value={ value }
				min={ min }
				max={ max }
				step={ step }
				onChange={ setValue }
				__next40pxDefaultSize
			/>
		</div>
	);
}

function Typography( {
	label = __( 'Typography', 'easy-lightbox-wp' ),
	attributes,
	setAttributes,
	typographyKey = 'typography',
	fontSizeKey = 'fontSize',
	lineHeightKey = 'lineHeight',
	letterSpacingKey = 'letterSpacing',
	wordSpacingKey = 'wordSpacing',
	defaults = {},
} ) {
	const device = useDeviceType();
	const typography = attributes[ typographyKey ] || {};

	/*
	 * Coalesced to `{}` so the bundle is ALWAYS an object: SPRangeControl only
	 * takes its responsive write path when it is handed one, and a gallery stored
	 * before these keys existed carries no bundle at all. Without this the control
	 * fell through to the scalar write and put a bare number where PHP expects
	 * `{ desktop, tablet, mobile }` — the chosen size then vanished, because the
	 * contributor reads `desktop` off it and finds nothing.
	 */
	const fontSize = attributes[ fontSizeKey ] || {};
	const lineHeight = attributes[ lineHeightKey ] || {};

	// Display values for the two sliders: the stored per-device number, or the
	// element's static stylesheet default while nothing is stored.
	const fontSizeValue = resolveScalar( fontSize, device, defaults.fontSize );
	const lineHeightValue = resolveScalar( lineHeight, device, defaults.lineHeight );

	const setTypography = ( patch ) =>
		setAttributes( { [ typographyKey ]: { ...typography, ...patch } } );

	const activeFamily = typography.family
		? { label: typography.family, value: typography.family }
		: familyOptions[ 0 ];

	/**
	 * Toggle a typography key (clicking the active value clears it) — shared by
	 * the decoration toggles ('style' | 'decoration') and the text-transform
	 * group ('transform'), all single-key single-value writes.
	 *
	 * @param {string} key   Typography key.
	 * @param {string} value Value to toggle.
	 * @return {void}
	 */
	const toggleTextFormat = ( key, value ) => {
		setTypography( { [ key ]: typography[ key ] === value ? '' : value } );
	};

	return (
		<SpPopover label={ label }>
			<SpPopover.Content>
				<div className="sp-shaped-gallery-typography">
					<div className="sp-shaped-gallery-typography__header">
						<span className="sp-shaped-gallery-typography__header-title">
							{ __( 'Typography', 'easy-lightbox-wp' ) }
						</span>
					</div>

					<div className="sp-shaped-gallery-typography__body">
						<div className="sp-shaped-gallery-typography__families">
							<div className="sp-shaped-gallery-typography__family">
								{ /* Same label row SelectField renders for Font Style beside it — the
								   two columns only line up if their labels are built the same way. */ }
								<div className="sp-shaped-gallery-control-head">
									<div className="sp-shaped-gallery-control-head__left">
										<span className="sp-shaped-gallery-control__title">
											{ __( 'Font Family', 'easy-lightbox-wp' ) }
										</span>
									</div>
								</div>
								<Select
									classNamePrefix="sp-shaped-gallery-font-family-select"
									options={ familyOptions }
									value={ activeFamily }
									onChange={ ( next ) =>
										setTypography( { family: next.value === 'Default' ? '' : next.value } )
									}
								/>
							</div>
							<SelectField
								label={ __( 'Font Style', 'easy-lightbox-wp' ) }
								value={ typography.fontWeight || '400' }
								items={ FONT_WEIGHTS }
								onChange={ ( fontWeight ) => setTypography( { fontWeight } ) }
							/>
						</div>

						<div className="sp-shaped-gallery-typography__sizes">
							<SPRangeControl
								label={ __( 'Font Size', 'easy-lightbox-wp' ) }
								value={ fontSizeValue }
								attributes={ fontSize }
								attributesKey={ fontSizeKey }
								setAttributes={ setAttributes }
								responsive
								min={ 8 }
								max={ 100 }
								defaultValue={ defaults.fontSize }
								unitLabel={ __( 'PX', 'easy-lightbox-wp' ) }
							/>
							<SPRangeControl
								label={ __( 'Line Height', 'easy-lightbox-wp' ) }
								value={ lineHeightValue }
								attributes={ lineHeight }
								attributesKey={ lineHeightKey }
								setAttributes={ setAttributes }
								responsive
								deviceSwitcher={ false }
								min={ 0.5 }
								max={ 5 }
								step={ 0.1 }
								defaultValue={ defaults.lineHeight }
							/>
						</div>

						<div className="sp-shaped-gallery-typography__spacing">
							<SpacingNumberField
								label={ __( 'Letter Spacing', 'easy-lightbox-wp' ) }
								attributes={ attributes }
								attributeKey={ letterSpacingKey }
								setAttributes={ setAttributes }
								min={ -5 }
								max={ 20 }
								step={ 0.1 }
							/>
							<SpacingNumberField
								label={ __( 'Word Spacing', 'easy-lightbox-wp' ) }
								attributes={ attributes }
								attributeKey={ wordSpacingKey }
								setAttributes={ setAttributes }
								min={ -20 }
								max={ 50 }
								step={ 0.1 }
							/>
						</div>

						<div className="sp-shaped-gallery-typography__format">
							<span className="sp-shaped-gallery-control__title">
								{ __( 'Text Format', 'easy-lightbox-wp' ) }
							</span>
							<div className="sp-shaped-gallery-typography__format-buttons">
								{ FORMAT_OPTIONS.map( ( { icon, label: optionLabel, title, key, value }, index ) => (
									<Fragment key={ `${ key }-${ value }` }>
										{ index > 0 && (
											<span className="sp-shaped-gallery-typography__format-divider" aria-hidden="true" />
										) }
										<button
											type="button"
											aria-label={ title || optionLabel }
											aria-pressed={ typography[ key ] === value }
											className={ `components-button sp-shaped-gallery-typography__format-btn${
												typography[ key ] === value ? ' is-active' : ''
											}` }
											onClick={ () => toggleTextFormat( key, value ) }
										>
											{ icon || optionLabel }
										</button>
									</Fragment>
								) ) }
							</div>
						</div>
					</div>
				</div>
			</SpPopover.Content>
		</SpPopover>
	);
}

export default memo( Typography );

/**
 * SPRangeControl — the plugin's full range control, modelled on Smart Store's
 * `SPRangeControl`: a slider with a shared header (label, inline responsive
 * device switcher, reset), an optional unit switcher, an optional side-axis
 * glyph, and the multi-step preset toggle. Value writes are debounced so
 * dragging the slider doesn't thrash the block attributes.
 *
 * Adapted to this plugin's conventions (CLAUDE.md): the flat lowercase
 * `{ desktop, tablet, mobile, unit }` responsive shape — NOT Smart Store's
 * capitalized `{ device:{Desktop…}, unit:{…} }`. A plain single-step slider is
 * the default; pass `globalSteps` to add the multi-step preset toggle.
 *
 * Value/write contract:
 *  - `value` + `onChange`               → custom / nested scalar writes.
 *  - `onValueChange({ value, device })` → Smart-Store-style custom handler.
 *  - `attributes` + `attributesKey` + `setAttributes`
 *      · scalar attribute               → written directly.
 *      · `responsive` + flat object     → the active device key (from
 *        `useDeviceType`) is read/written on `{ desktop, tablet, mobile }`.
 *
 * @param {Object}             props
 * @param {*}                  [props.value]                Current value (overrides `attributes`).
 * @param {*}                  [props.attributes]           Current value (attributesKey form).
 * @param {string}             [props.attributesKey]        Attribute name to write.
 * @param {Function}           [props.setAttributes]        setAttributes.
 * @param {Function}           [props.onChange]             Custom scalar change handler.
 * @param {Function}           [props.onValueChange]        Custom handler `({ value, device })`.
 * @param {Function}           [props.onUnitChange]         Custom unit handler `({ unit, device })`.
 * @param {string}             [props.label]                Control label.
 * @param {number}             [props.min=0]                Minimum.
 * @param {number}             [props.max=100]              Maximum.
 * @param {number}             [props.step=1]               Step.
 * @param {boolean}            [props.responsive]           Per-device value + device switcher.
 * @param {boolean}            [props.deviceSwitcher=true]  Render the device switcher when
 *                                                          `responsive` (still reads/writes the
 *                                                          active device). Hide it where a single
 *                                                          shared switcher already governs the group
 *                                                          (e.g. the Typography size section).
 * @param {*}                  [props.defaultValue]         Default (enables reset when changed).
 * @param {boolean}            [props.allowReset=true]      Allow reset when value differs from default.
 * @param {boolean}            [props.resetIcon=true]       Render the reset icon.
 * @param {boolean}            [props.setCustomReset=false] Reset only the local value (parent commits).
 * @param {string}             [props.helpText]             Help text.
 * @param {string}             [props.className='']         Extra class names.
 * @param {(boolean|string[])} [props.units=false]          Show a unit switcher (true or an explicit unit list).
 * @param {string}             [props.unitLabel]            Static (non-switchable) unit badge for the
 *                                                          header, e.g. `'s'` for a seconds scalar.
 *                                                          Ignored when `units` is set.
 * @param {boolean}            [props.globalSteps=false]    Add the multi-step preset toggle.
 * @param {number}             [props.stepModeStep=8]       Slider step while step-preset mode is on.
 * @param {string}             [props.sideAxisIcon]         Axis glyph key ('horizontal' | 'vertical').
 * @param {(string|false)}     [props.trackGradient=false]  Paint the rail with a CSS gradient
 *                                                          (e.g. the image-filter previews) and drop
 *                                                          the accent fill, so the slider shows the
 *                                                          effect it controls.
 * @return {JSX.Element} Control.
 */
import { memo, useState, useEffect, useRef } from '@wordpress/element';
import { RangeControl as WpRangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useDeviceType } from '@shaped-gallery/hooks';
import { StepsIcon, GapHorizontalIcon, GapVerticalIcon } from '@shaped-gallery/icons';
import Responsive from '../responsive';
import ResetButton from '../resetButton';
import Units from '../units';
import '../shared.scss';

/** Side-axis glyphs, keyed like Smart Store's `sideAxisIcons` map. */
const SIDE_AXIS_ICONS = {
	horizontal: <GapHorizontalIcon />,
	vertical: <GapVerticalIcon />,
};

/** Commit debounce (ms) — matches Smart Store; keeps slider drags cheap. */
const COMMIT_DELAY = 100;

function SPRangeControl( {
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	onValueChange,
	onUnitChange,
	label,
	min = 0,
	max = 100,
	step = 1,
	responsive = false,
	deviceSwitcher = true,
	defaultValue,
	allowReset = true,
	resetIcon = true,
	setCustomReset = false,
	helpText,
	className = '',
	units = false,
	unitLabel = '',
	globalSteps = false,
	stepModeStep = 8,
	sideAxisIcon = null,
	trackGradient = false,
} ) {
	const device = useDeviceType();
	const isResponsive = responsive && attributes && typeof attributes === 'object';
	// Presets (coarse marked slider) is the default when globalSteps is on;
	// toggling reveals the fine slider + numeric input.
	const [ presets, setPresets ] = useState( true );

	// Units live on the attribute object (scalar `unit` or per-device map); only
	// meaningful in the attributesKey form. `%` clamps the slider to 100.
	const hasUnits = !! units && !! attributesKey && ! onChange && ! onValueChange;
	// A fixed, display-only unit (e.g. seconds) when there is nothing to switch.
	const showUnitLabel = !! unitLabel && ! hasUnits;
	const activeUnit =
		typeof attributes?.unit === 'object' ? attributes?.unit?.[ device ] : attributes?.unit;
	const effectiveMax = hasUnits && '%' === activeUnit ? 100 : max;

	// Resolve the incoming value for the active device / shape.
	const readValue = () => {
		if ( value !== undefined ) {
			return value;
		}
		if ( isResponsive ) {
			return attributes[ device ] ?? attributes.desktop;
		}
		return attributes;
	};

	// Local mirror + debounced commit, so dragging the slider stays smooth and
	// only the settled value is written back to the store.
	const [ currentValue, setCurrentValue ] = useState( readValue() );
	const timer = useRef( null );
	const rootRef = useRef( null );

	// Re-sync when the device or the external value changes.
	useEffect( () => {
		setCurrentValue( readValue() );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ device, value, attributes ] );

	// Flush any pending write on unmount.
	useEffect( () => () => clearTimeout( timer.current ), [] );

	const commit = ( next ) => {
		if ( onChange ) {
			onChange( next );
			return;
		}
		if ( isResponsive ) {
			setAttributes( { [ attributesKey ]: { ...attributes, [ device ]: next } } );
		} else if ( attributesKey ) {
			setAttributes( { [ attributesKey ]: next } );
		}
	};

	/*
	 * Quantize to the step's own precision.
	 *
	 * A fractional step (Line Height's 0.1) makes the slider hand back the result
	 * of binary float arithmetic — 1.7000000000000002, 5.699999999999999 — which
	 * would be stored verbatim and emitted into the CSS custom property, so the
	 * control showed one number and the page used another. Rounding to the step's
	 * decimal count keeps the stored value the number the slider displays. Integer
	 * steps have no decimals and pass straight through.
	 */
	const stepPrecision = ( String( step ).split( '.' )[ 1 ] || '' ).length;
	const quantize = ( next ) =>
		stepPrecision && 'number' === typeof next && Number.isFinite( next )
			? Number( next.toFixed( stepPrecision ) )
			: next;

	const setValue = ( raw ) => {
		const next = quantize( raw );
		setCurrentValue( next );
		if ( onValueChange ) {
			onValueChange( { value: next, device } );
			return;
		}
		clearTimeout( timer.current );
		timer.current = setTimeout( () => commit( next ), COMMIT_DELAY );
	};

	// A responsive default may be given per-device ({ desktop, tablet, mobile });
	// resolve it to the active device so reset targets the right value.
	const resolvedDefault =
		isResponsive && defaultValue && typeof defaultValue === 'object'
			? defaultValue[ device ] ?? defaultValue.desktop
			: defaultValue;

	const changed =
		allowReset &&
		resolvedDefault !== undefined &&
		currentValue !== undefined &&
		currentValue !== resolvedDefault;

	const reset = () => {
		setCurrentValue( resolvedDefault );
		if ( setCustomReset ) {
			onValueChange?.( { value: resolvedDefault, device } );
			return;
		}
		clearTimeout( timer.current );
		commit( resolvedDefault );
	};

	// Clicking the label focuses the numeric input (Smart Store's activeLabel).
	const focusInput = () => rootRef.current?.querySelector( 'input' )?.focus();

	const showReset = resetIcon && changed;
	const showDevice = responsive && deviceSwitcher;
	const hasHeader = !! label || showDevice || showReset || hasUnits || showUnitLabel;

	const isPresetMode = globalSteps && presets;
	const currentStep = isPresetMode ? stepModeStep : step;
	const currentMarks = isPresetMode;
	const withInputField = ! globalSteps || ! presets;

	const slider = (
		<WpRangeControl
			label={ label }
			hideLabelFromVision
			value={ currentValue }
			onChange={ setValue }
			min={ min }
			max={ effectiveMax }
			step={ currentStep }
			marks={ currentMarks }
			withInputField={ withInputField }
			help={ helpText }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);

	return (
		<div
			ref={ rootRef }
			className={ `sp-shaped-gallery-range-control sp-shaped-gallery-cmp-mb ${
				trackGradient ? 'has-track-gradient' : ''
			} ${ className }`
				.replace( /\s+/g, ' ' )
				.trim() }
			style={ trackGradient ? { '--sp-shaped-gallery-track-gradient': trackGradient } : undefined }
		>
			{ hasHeader && (
				<div className="sp-shaped-gallery-control-head">
					<div className="sp-shaped-gallery-control-head__left">
						{ label && (
							<span className="sp-shaped-gallery-control__title" onClick={ focusInput }>
								{ label }
							</span>
						) }
						{ showDevice && <Responsive /> }
					</div>
					<div className="sp-shaped-gallery-control-head__right">
						{ showReset && <ResetButton onClick={ reset } /> }
						{ hasUnits && (
							<Units
								attributes={ attributes }
								attributesKey={ attributesKey }
								setAttributes={ setAttributes }
								units={ Array.isArray( units ) ? units : undefined }
								onUnitChange={ onUnitChange }
							/>
						) }
						{ showUnitLabel && (
							<span className="sp-shaped-gallery-range-control__unit">{ unitLabel }</span>
						) }
					</div>
				</div>
			) }
			{ globalSteps || sideAxisIcon ? (
				<div className="sp-shaped-gallery-range-control__row">
					{ sideAxisIcon && SIDE_AXIS_ICONS[ sideAxisIcon ] && (
						<span className="sp-shaped-gallery-range-control__axis" aria-hidden="true">
							{ SIDE_AXIS_ICONS[ sideAxisIcon ] }
						</span>
					) }
					<div className="sp-shaped-gallery-range-control__ranger">{ slider }</div>
					{ globalSteps && (
						<button
							type="button"
							className="sp-shaped-gallery-range-control__preset"
							aria-pressed={ ! presets }
							aria-label={ __( 'Toggle step presets', 'easy-lightbox-wp' ) }
							onClick={ () => setPresets( ( on ) => ! on ) }
						>
							<StepsIcon isActive={ ! presets } />
						</button>
					) }
				</div>
			) : (
				slider
			) }
		</div>
	);
}

export default memo( SPRangeControl );

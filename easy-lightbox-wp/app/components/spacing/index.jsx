/**
 * Spacing — a four-side (top / right / bottom / left) control with two render
 * modes sharing one value shape and write path:
 *
 *  1. Ranger mode (default) — modelled on the sibling Woo Product Slider Pro
 *     Spacing control (its Border Radius / Padding / Margin controls). Sides are
 *     bound together by default (the clean single "all sides" ranger); the
 *     link / unlink button splits them into four per-side rows. Each ranger is a
 *     slider preceded by a side-axis glyph marking the side it drives and
 *     followed by a "step presets" toggle: presets on (default) is a coarse,
 *     marked slider; toggling it off reveals the fine free slider + numeric
 *     input. A value that doesn't sit on the preset grid auto-switches that row
 *     to the free slider. `indicator="radius"` swaps the side glyphs for
 *     corner-radius glyphs (top → Top Left, right → Top Right, bottom → Bottom
 *     Right, left → Bottom Left — the CSS `border-radius` shorthand order).
 *     `axes` collapses the ranger to two rows — vertical (drives top + bottom)
 *     and horizontal (drives left + right) — with no link button; the value
 *     shape stays the same four-side object, so a CSS generator is unaffected.
 *
 *  2. Labelled mode (`labelItem` given) — four plain numeric inputs each under a
 *     text label. Used where the four values are not spatial sides but named
 *     scalars (e.g. Box Shadow's X / Y / Blur / Spread), so a slider + side
 *     glyph would mislead; free-form (negatives allowed) and always unlinked.
 *
 * The unit switcher, per-device responsive switcher, reset, and (ranger mode)
 * the link button live in the header for both modes.
 *
 * Value shape (flat lowercase responsive — CLAUDE.md; deliberately NOT the
 * sibling's capitalized `{ device:{Desktop…} }`):
 *   {
 *     desktop: { top, right, bottom, left },
 *     tablet:  { top, right, bottom, left },
 *     mobile:  { top, right, bottom, left },
 *     unit:    'px' | { desktop, tablet, mobile },
 *     allChange: boolean,   // link (bind all sides) state; unset ⇒ linked
 *   }
 * or the non-responsive flat form `{ value: { … }, unit, allChange }`. The
 * active device's sides (from `useDeviceType`) are read / written; while sides
 * are linked, editing the single ranger writes all four. Writes are debounced
 * (a local mirror keeps the slider smooth) so dragging doesn't thrash the block
 * attributes.
 *
 * @param {Object}   props
 * @param {string}   [props.label]             Control label.
 * @param {Object}   props.attributes          Spacing value (see shape above).
 * @param {string}   props.attributesKey       Attribute name to write.
 * @param {Function} [props.setAttributes]     setAttributes (attributesKey form).
 * @param {Function} [props.onChange]          Custom write handler (receives the next value object).
 * @param {string[]} [props.units]             Available units (false to hide the switcher).
 * @param {number}   [props.min=0]             Slider minimum (ranger mode).
 * @param {number}   [props.max=300]           Slider maximum (ranger mode, free).
 * @param {number}   [props.step=1]            Slider step (ranger mode, free).
 * @param {number}   [props.rangeStep=8]       Slider step (ranger mode, presets).
 * @param {number}   [props.rangeMax=50]       Slider maximum (ranger mode, presets).
 * @param {string}   [props.indicator='']      '' for side glyphs, 'radius' for corner glyphs.
 * @param {Object}   [props.labelItem=false]   Per-side text labels → labelled (input) mode.
 * @param {boolean}  [props.axes=false]        Two-row vertical / horizontal mode (no link button).
 * @param {boolean}  [props.linkButton=true]   Show the link / unlink all-sides button.
 * @param {boolean}  [props.showSideIcon=true] Show the per-row side-axis glyph (ranger mode).
 * @param {boolean}  [props.globalSteps=true]  Show the per-row step-presets toggle (ranger mode).
 * @param {boolean}  [props.resetIcon=true]    Show the reset button.
 * @param {boolean}  [props.showHeader=true]   Render the header row at all (see below).
 * @param {Object}   [props.defaultValue]      Default sides ({ top, right, bottom, left }) for reset.
 * @return {JSX.Element} Control.
 */
import { __ } from '@wordpress/i18n';
import { memo, useState, useEffect, useRef } from '@wordpress/element';
import { Button, RangeControl as WpRangeControl } from '@wordpress/components';
import { useDeviceType } from '@shaped-gallery/hooks';
import {
	StepsIcon,
	AllSidesIcon,
	TopSideIcon,
	RightSideIcon,
	BottomSideIcon,
	LeftSideIcon,
	VerticalSidesIcon,
	HorizontalSidesIcon,
	RadiusAllIcon,
	RadiusTopLeftIcon,
	RadiusTopRightIcon,
	RadiusBottomRightIcon,
	RadiusBottomLeftIcon,
} from '@shaped-gallery/icons';
import Responsive from '../responsive';
import Units from '../units';
import ResetButton from '../resetButton';
import '../shared.scss';
import './editor.scss';

const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const EMPTY_SIDES = { top: '', right: '', bottom: '', left: '' };

/** Axes-mode rows: each pseudo-side drives the two real sides it maps to. */
const AXES = [ 'vertical', 'horizontal' ];
const AXIS_SIDES = { vertical: [ 'top', 'bottom' ], horizontal: [ 'left', 'right' ] };

/** Length units whose symbol is appended to a ranger's value tooltip. */
const LENGTH_UNITS = [ 'px', '%', 'em', 'rem', 'vh', 'vw' ];

/**
 * Side-axis glyphs, keyed `[indicator-]side` like the sibling's `sideAxisIcons`.
 * The `radius-*` corners follow the `border-radius` shorthand order
 * (top → TL, right → TR, bottom → BR, left → BL).
 */
const SIDE_AXIS_ICONS = {
	all: <AllSidesIcon />,
	top: <TopSideIcon />,
	right: <RightSideIcon />,
	bottom: <BottomSideIcon />,
	left: <LeftSideIcon />,
	vertical: <VerticalSidesIcon />,
	horizontal: <HorizontalSidesIcon />,
	'radius-all': <RadiusAllIcon />,
	'radius-top': <RadiusTopLeftIcon />,
	'radius-right': <RadiusTopRightIcon />,
	'radius-bottom': <RadiusBottomRightIcon />,
	'radius-left': <RadiusBottomLeftIcon />,
};

/** Commit debounce (ms) — matches SPRangeControl; keeps slider drags cheap. */
const COMMIT_DELAY = 100;

/**
 * SpacingRanger — one ranger row: side glyph + slider (+ optional numeric input)
 * + step-presets toggle. Presets on (default) is a coarse, marked slider capped
 * at `rangeMax` (percentages clamp to 100); toggling off is a fine slider with a
 * numeric input up to `max`. A value off the preset grid auto-switches the row
 * to free mode so it stays editable.
 *
 * @param {Object}   props
 * @param {string}   props.side         Side key ('top'|'right'|'bottom'|'left'|'all'|'vertical'|'horizontal').
 * @param {number}   props.value        Current numeric value for the side.
 * @param {Function} props.onChange     `( side, value ) => void`.
 * @param {string}   [props.unit]       Active unit (tooltip suffix + % clamp).
 * @param {string}   [props.indicator]  '' | 'radius'.
 * @param {number}   props.min          Slider minimum.
 * @param {number}   props.max          Slider maximum (free mode).
 * @param {number}   props.step         Slider step (free mode).
 * @param {number}   props.rangeStep    Slider step (presets mode).
 * @param {number}   props.rangeMax     Slider maximum (presets mode).
 * @param {boolean}  props.showSideIcon Render the side-axis glyph.
 * @param {boolean}  props.showPreset   Render the step-presets toggle.
 * @return {JSX.Element} Row.
 */
function SpacingRanger( {
	side,
	value,
	onChange,
	unit = '',
	indicator = '',
	min,
	max,
	step,
	rangeStep,
	rangeMax,
	showSideIcon,
	showPreset,
} ) {
	// Presets (coarse marked slider) is the default; the toggle reveals the fine
	// free slider + numeric input.
	const [ presets, setPresets ] = useState( true );
	const glyph = SIDE_AXIS_ICONS[ indicator ? `${ indicator }-${ side }` : side ];
	const numeric = value === '' || value === undefined || value === null ? '' : Number( value );

	// Keep a value that doesn't sit on the preset grid (or exceeds its max)
	// editable by dropping this row to the free slider; empty snaps back.
	useEffect( () => {
		if ( '' === numeric ) {
			setPresets( true );
		} else if ( numeric % rangeStep !== 0 || numeric > rangeMax ) {
			setPresets( false );
		}
	}, [ numeric, rangeStep, rangeMax ] );

	const modeMax = presets ? rangeMax : max;
	const effectiveMax = '%' === unit ? Math.min( 100, modeMax ) : modeMax;
	const suffix = LENGTH_UNITS.includes( unit ) ? unit : '';

	return (
		<div className="sp-shaped-gallery-range-control sp-shaped-gallery-spacing__row">
			<div className="sp-shaped-gallery-range-control__row">
				{ showSideIcon && glyph && (
					<span className="sp-shaped-gallery-spacing__axis" aria-hidden="true">
						{ glyph }
					</span>
				) }
				<div className="sp-shaped-gallery-range-control__ranger">
					<WpRangeControl
						value={ Number( numeric ) || 0 }
						onChange={ ( next ) => onChange( side, next ) }
						min={ min }
						max={ effectiveMax }
						step={ presets ? rangeStep : step }
						marks={ presets }
						withInputField={ ! presets }
						renderTooltipContent={ ( v ) => `${ v ?? 0 }${ suffix }` }
						hideLabelFromVision
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</div>
				{ showPreset && (
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
		</div>
	);
}

function Spacing( {
	label,
	attributes,
	attributesKey,
	setAttributes = () => {},
	onChange,
	units = [ 'px', '%', 'em' ],
	min = 0,
	max = 300,
	step = 1,
	rangeStep = 8,
	rangeMax = 50,
	indicator = '',
	labelItem = false,
	axes = false,
	linkButton = true,
	showSideIcon = true,
	globalSteps = true,
	resetIcon = true,
	showHeader = true,
	defaultValue = { top: '0', right: '0', bottom: '0', left: '0' },
} ) {
	const device = useDeviceType();
	const isResponsive =
		!! attributes &&
		( 'desktop' in attributes || 'tablet' in attributes || 'mobile' in attributes );

	const committedSides =
		( isResponsive ? attributes[ device ] ?? attributes.desktop : attributes?.value ) ||
		EMPTY_SIDES;
	const activeUnit =
		typeof attributes?.unit === 'object' ? attributes.unit[ device ] : attributes?.unit;
	// Sides bind together by default (the clean single ranger); labelled mode
	// carries named scalars (X/Y/Blur/Spread) and axes mode carries two
	// vertical/horizontal rows — neither links. `allChange` unset ⇒ linked; only
	// an explicit `false` unlinks.
	const canLink = ! labelItem && ! axes && linkButton;
	const linked = canLink && ( attributes?.allChange ?? true );

	// Local mirror + debounced commit — dragging a slider updates the mirror
	// immediately (smooth) and only the settled value is written to the store.
	const [ sides, setSides ] = useState( committedSides );
	const timer = useRef( null );
	// Re-sync only when the committed values (or device) actually change, not on
	// every parent re-render (the attribute object identity is unstable).
	const committedKey = JSON.stringify( committedSides );

	useEffect( () => {
		setSides( committedSides );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ committedKey, device ] );

	// Flush any pending write on unmount.
	useEffect( () => () => clearTimeout( timer.current ), [] );

	const write = ( nextAttributes ) => {
		if ( onChange ) {
			onChange( nextAttributes );
			return;
		}
		setAttributes( { [ attributesKey ]: nextAttributes } );
	};

	const commitSides = ( nextSides ) =>
		write(
			isResponsive
				? { ...attributes, [ device ]: nextSides }
				: { ...attributes, value: nextSides }
		);

	const setSide = ( side, value ) => {
		let nextSides;
		if ( linked ) {
			nextSides = { top: value, right: value, bottom: value, left: value };
		} else if ( AXIS_SIDES[ side ] ) {
			// An axis row drives its two real sides at once (vertical → top/bottom,
			// horizontal → left/right).
			const [ a, b ] = AXIS_SIDES[ side ];
			nextSides = { ...sides, [ a ]: value, [ b ]: value };
		} else {
			nextSides = { ...sides, [ side ]: value };
		}
		setSides( nextSides );
		clearTimeout( timer.current );
		timer.current = setTimeout( () => commitSides( nextSides ), COMMIT_DELAY );
	};

	const toggleLink = () => {
		clearTimeout( timer.current );
		write( { ...attributes, allChange: ! ( attributes?.allChange ?? true ) } );
	};

	const reset = () => {
		const nextSides = { ...EMPTY_SIDES, ...defaultValue };
		setSides( nextSides );
		clearTimeout( timer.current );
		commitSides( nextSides );
	};

	const rangerProps = {
		unit: activeUnit,
		indicator,
		min,
		max,
		step,
		rangeStep,
		rangeMax,
		showSideIcon,
		showPreset: globalSteps,
		onChange: setSide,
	};

	return (
		<div className="sp-shaped-gallery-spacing sp-shaped-gallery-cmp-mb">
			{ /*
			   `showHeader={ false }` drops the row entirely rather than emptying it:
			   a caller that composes its own header (Box Shadow, whose design draws
			   ONE "Shadow Type" row above both the preset tiles and these fields)
			   would otherwise still pay for this element's 8px bottom margin and end
			   up with a phantom gap where the second title used to be. */ }
			{ showHeader && (
				<div className="sp-shaped-gallery-control-head">
					<div className="sp-shaped-gallery-control-head__left">
						{ label && <span className="sp-shaped-gallery-control__title">{ label }</span> }
						{ isResponsive && <Responsive /> }
					</div>
					<div className="sp-shaped-gallery-control-head__right">
						{ resetIcon && <ResetButton onClick={ reset } /> }
						{ canLink && (
							<Button
								className={ `sp-shaped-gallery-spacing__link ${
									! linked ? 'is-active' : ''
								}`.trim() }
								label={
									linked
										? __( 'Unlink sides', 'easy-lightbox-wp' )
										: __( 'Link all sides', 'easy-lightbox-wp' )
								}
								showTooltip
								onClick={ toggleLink }
							>
								{ indicator ? <RadiusAllIcon /> : <AllSidesIcon /> }
							</Button>
						) }
						{ units && (
							<Units
								attributes={ attributes || {} }
								attributesKey={ attributesKey }
								setAttributes={ setAttributes }
								units={ units }
							/>
						) }
					</div>
				</div>
			) }

			{ labelItem ? (
				<div className="sp-shaped-gallery-spacing__fields">
					{ SIDES.map( ( side ) => (
						<div
							key={ side }
							className={ `sp-shaped-gallery-spacing__field sp-shaped-gallery-spacing__field--${ side }` }
						>
							<input
								id={ `sp-shaped-gallery-spacing-${ attributesKey }-${ side }` }
								type="number"
								value={ sides?.[ side ] ?? '' }
								aria-label={ labelItem[ side ] }
								onChange={ ( event ) => setSide( side, event.target.value ) }
							/>
							<label htmlFor={ `sp-shaped-gallery-spacing-${ attributesKey }-${ side }` }>
								{ labelItem[ side ] }
							</label>
						</div>
					) ) }
				</div>
			) : (
				<div className="sp-shaped-gallery-spacing__rows">
					{ /* eslint-disable no-nested-ternary */ }
					{ axes ? (
						AXES.map( ( axis ) => (
							<SpacingRanger
								key={ axis }
								side={ axis }
								value={ sides?.[ AXIS_SIDES[ axis ][ 0 ] ] }
								{ ...rangerProps }
							/>
						) )
					) : linked ? (
						<SpacingRanger side="all" value={ sides?.top } { ...rangerProps } />
					) : (
						SIDES.map( ( side ) => (
							<SpacingRanger
								key={ side }
								side={ side }
								value={ sides?.[ side ] }
								{ ...rangerProps }
							/>
						) )
					) }
					{ /* eslint-enable no-nested-ternary */ }
				</div>
			) }
		</div>
	);
}

export default memo( Spacing );

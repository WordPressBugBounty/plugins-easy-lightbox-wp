/**
 * Border — the standard composite border control, modelled faithfully on the
 * sibling Woo Product Slider Pro Smart Button Border (the reference
 * implementation): a border-style segmented toggle (None + solid / dashed /
 * dotted / double line glyphs) and — only once a style other than None is
 * chosen — a four-side Width (`Spacing`) and a Color (`ColorPicker`). Optionally
 * hosted in an `SpPopover` so it sits cleanly beside sibling rich controls.
 *
 * Composite value (two attributes, like the reference): style + colour live on
 * one object written under `attributesKey.border` (`{ style, color[, hoverColor] }`),
 * and the width is a separate Spacing-shaped object under
 * `attributesKey.borderWidth`, so a value → CSS generator can consume each
 * independently.
 *
 * Normal / Hover follows the reference's parent-driven `colorState`: pass
 * `'hover'` to edit `border.hoverColor` only (style + width hidden, since those
 * are shared across states); the default edits `border.color`. Blocks that
 * already scope Normal / Hover to separate state objects (this gallery's Style
 * tab) simply omit `colorState` and let the parent swap the whole value bundle.
 *
 * @param {Object}                   props
 * @param {Object}                   props.attributes         Value bundle ({ border, borderWidth }).
 * @param {Object}                   props.attributesKey      Keys ({ border, borderWidth }).
 * @param {Function}                 props.setAttributes      setAttributes.
 * @param {string}                   [props.label]            Popover / control label.
 * @param {boolean}                  [props.popover=true]     Wrap the body in an `SpPopover`.
 * @param {(false|'normal'|'hover')} [props.colorState=false] Parent-driven colour state.
 * @param {Object}                   [props.defaultWidth]     Default width sides for the Spacing reset.
 * @param {string}                   [props.defaultColor='']  Default colour (enables the colour reset).
 * @param {number}                   [props.min=0]            Width slider minimum.
 * @param {number}                   [props.max=10]           Width slider maximum (free mode).
 * @param {number}                   [props.rangeStep=0.5]    Width slider step (presets mode).
 * @param {number}                   [props.rangeMax=2]       Width slider maximum (presets mode).
 * @return {JSX.Element} Control.
 */
import { __ } from '@wordpress/i18n';
import { memo } from '@wordpress/element';
import { SolidStyle, DashedStyle, DottedStyle, DoubleStyle } from '@shaped-gallery/icons';
import ButtonGroup from '../buttonGroup';
import Spacing from '../spacing';
import ColorPicker from '../color';
import './editor.scss';

/**
 * Border-style options — None as a text segment, the rest as line glyphs, mirroring
 * the reference. `label` doubles as each icon option's accessible name / tooltip.
 */
const BORDER_STYLE_ITEMS = [
	{ value: 'none', label: __( 'None', 'easy-lightbox-wp' ) },
	{ value: 'solid', label: __( 'Solid', 'easy-lightbox-wp' ), icon: SolidStyle },
	{ value: 'dashed', label: __( 'Dashed', 'easy-lightbox-wp' ), icon: DashedStyle },
	{ value: 'dotted', label: __( 'Dotted', 'easy-lightbox-wp' ), icon: DottedStyle },
	{ value: 'double', label: __( 'Double', 'easy-lightbox-wp' ), icon: DoubleStyle },
];

function Border( {
	attributes = {},
	attributesKey,
	setAttributes,
	colorState = false,
	defaultWidth = { top: '0', right: '0', bottom: '0', left: '0' },
	defaultColor = '',
	min = 0,
	max = 10,
	rangeStep = 0.5,
	rangeMax = 2,
} ) {
	const { border = {}, borderWidth } = attributes;
	const borderStyle = border?.style ?? 'none';
	const isHover = 'hover' === colorState;
	const colorKey = isHover ? 'hoverColor' : 'color';

	const setStyle = ( style ) =>
		setAttributes( { [ attributesKey.border ]: { ...border, style } } );

	const setColor = ( color ) =>
		setAttributes( { [ attributesKey.border ]: { ...border, [ colorKey ]: color } } );

	const body = (
		<div className="sp-shaped-gallery-border">
			{ ! isHover && (
				<ButtonGroup value={ borderStyle } items={ BORDER_STYLE_ITEMS } onChange={ setStyle } />
			) }
			{ 'none' !== borderStyle && (
				<>
					{ ! isHover && (
						<Spacing
							label={ __( 'Border Width', 'easy-lightbox-wp' ) }
							attributes={ borderWidth }
							attributesKey={ attributesKey.borderWidth }
							setAttributes={ setAttributes }
							units={ [ 'px', 'em', 'rem' ] }
							min={ min }
							max={ max }
							rangeStep={ rangeStep }
							rangeMax={ rangeMax }
							defaultValue={ defaultWidth }
						/>
					) }
					<ColorPicker
						label={
							isHover
								? __( 'Border Hover Color', 'easy-lightbox-wp' )
								: __( 'Border Color', 'easy-lightbox-wp' )
						}
						value={ border[ colorKey ] }
						onChange={ setColor }
						defaultColor={ defaultColor }
					/>
				</>
			) }
		</div>
	);
	return body;

}

export default memo( Border );

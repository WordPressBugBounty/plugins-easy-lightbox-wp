/**
 * Background — a type-select (solid / gradient / …) with the matching value
 * editor: a `ColorPicker` for solid fills, the core `GradientPicker` for
 * gradients. Mirrored from the sibling ShapedPlugin Background control (Woo
 * Product Slider Pro / Smart Icon) and adapted to this plugin's conventions:
 * the shared `@shaped-gallery/components` `ColorPicker`, the `sp-shaped-gallery-` CSS prefix,
 * the `shaped-gallery` text domain, and no global-settings coupling.
 *
 * Value shape (flat):    `{ style: 'solid'|'gradient', solid: color, gradient: css }`
 * Value shape (stateful): `{ [styleState]: { style, solid, gradient } }`
 * With `styleState` (e.g. 'normal' | 'hover'), reads / writes are scoped to that
 * sub-object so a single attribute can carry both a normal and a hover fill.
 *
 * @param {Object}         props
 * @param {Object}         props.attributes     Background value (see shapes above).
 * @param {string}         props.attributesKey  Attribute name to write.
 * @param {Function}       props.setAttributes  setAttributes.
 * @param {string}         [props.label]        Type-row label.
 * @param {string}         [props.colorLabel]   Colour-control label.
 * @param {string[]}       [props.items]        Available types (in render order).
 * @param {string}         [props.defaultColor] Default solid colour (enables reset).
 * @param {(string|false)} [props.styleState]   Sub-state key to scope reads/writes, or false.
 * @param {Array}          [props.gradients]    Gradient presets for the picker.
 * @return {JSX.Element} Control.
 */
import { __ } from '@wordpress/i18n';
import { memo } from '@wordpress/element';
import { Button, GradientPicker } from '@wordpress/components';
import { SolidFillIcon, GradientFillIcon } from '@shaped-gallery/icons';
import ColorPicker from '../color';
import '../shared.scss';
import './editor.scss';

/** Fallback gradient shown before the user picks one. */
const DEFAULT_GRADIENT =
	'linear-gradient(90deg, rgba(0, 0, 0, 0.68) 0.09%, rgba(0, 0, 0, 0.07) 99.95%)';

/** Curated gradient presets — no global-settings dependency. */
const DEFAULT_GRADIENTS = [
	{ name: 'Ocean Breeze', gradient: 'linear-gradient(46deg,rgb(0,97,255) 4%,rgb(96,239,255) 93%)', slug: 'ocean-breeze' },
	{ name: 'Cosmic Fusion', gradient: 'linear-gradient(46deg,rgb(232,28,255) 4%,rgb(64,201,255) 93%)', slug: 'cosmic-fusion' },
	{ name: 'Sunset Blaze', gradient: 'linear-gradient(46deg,rgb(255,15,123) 4%,rgb(248,155,41) 93%)', slug: 'sunset-blaze' },
	{ name: 'Dreamy Violet', gradient: 'linear-gradient(46deg,rgb(211,151,250) 4%,rgb(131,100,232) 93%)', slug: 'dreamy-violet' },
	{ name: 'Peach Bloom', gradient: 'linear-gradient(46deg,rgb(246,213,247) 4%,rgb(251,233,215) 93%)', slug: 'peach-bloom' },
	{ name: 'Aqua Depths', gradient: 'linear-gradient(46deg,rgb(0,173,181) 4%,rgb(9,95,92) 93%)', slug: 'aqua-depths' },
	{ name: 'Midnight Steel', gradient: 'linear-gradient(46deg,rgb(36,55,72) 4%,rgb(75,116,159) 93%)', slug: 'midnight-steel' },
];

/** Type → swatch glyph. */
const TYPE_ICONS = {
	solid: <SolidFillIcon />,
	gradient: <GradientFillIcon />,
};

/** Type → human label (i18n). */
const TYPE_LABELS = {
	solid: __( 'Solid', 'easy-lightbox-wp' ),
	gradient: __( 'Gradient', 'easy-lightbox-wp' ),
};

function Background( {
	attributes = {},
	attributesKey,
	setAttributes,
	label = __( 'Background Type', 'easy-lightbox-wp' ),
	colorLabel = __( 'Background Color', 'easy-lightbox-wp' ),
	items = [ 'solid', 'gradient' ],
	defaultColor = '',
	styleState = false,
	gradients = DEFAULT_GRADIENTS,
} ) {
	const scope = styleState === false ? attributes : attributes?.[ styleState ] ?? {};
	const bgType = scope?.style ?? items[ 0 ];

	// Patch a single key on the (optionally state-scoped) background object.
	const write = ( key, value ) => {
		const nextScope = {
			style: bgType,
			...scope,
			[ key ]: value,
		};
		if ( styleState === false ) {
			setAttributes( { [ attributesKey ]: nextScope } );
		} else {
			setAttributes( {
				[ attributesKey ]: {
					...attributes,
					[ styleState ]: nextScope,
				},
			} );
		}
	};

	return (
		<div className="sp-shaped-gallery-background sp-shaped-gallery-cmp-mb">
			<div className="sp-shaped-gallery-background__head">
				<span className="sp-shaped-gallery-control__title">{ label }</span>
				<div className="sp-shaped-gallery-background__types">
					{ items.map( ( item ) => (
						<Button
							key={ item }
							className={ bgType === item ? 'is-active' : '' }
							aria-pressed={ bgType === item }
							label={ TYPE_LABELS[ item ] }
							showTooltip
							onClick={ () => write( 'style', item ) }
						>
							{ TYPE_ICONS[ item ] }
						</Button>
					) ) }
				</div>
			</div>

			{ 'solid' === bgType && (
				<ColorPicker
					label={ colorLabel }
					value={ scope?.solid ?? '' }
					onChange={ ( color ) => write( 'solid', color ) }
					defaultColor={ defaultColor }
				/>
			) }

			{ 'gradient' === bgType && (
				<GradientPicker
					__nextHasNoMargin
					value={ scope?.gradient || DEFAULT_GRADIENT }
					gradients={ gradients }
					onChange={ ( gradient ) => write( 'gradient', gradient ) }
				/>
			) }
		</div>
	);
}

export default memo( Background );

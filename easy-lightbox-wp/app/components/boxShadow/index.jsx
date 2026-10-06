/**
 * BoxShadow — the composite box-shadow control, laid out to Figma node 7:32511
 * ("Box Shadow", variants None / Box Shadow / Custom).
 *
 * Three states, one control:
 *
 *   None    — the enable toggle alone.
 *   Presets — toggle, then ONE header row ("Shadow Type" + reset + the
 *             Presets/Custom switch) over the six preset tiles.
 *   Custom  — the same header row, plus the inset/outset unit switcher, then the
 *             X / Y / Blur / Spread fields and the shadow colour.
 *
 * The header is shared on purpose. Both modes previously printed a header of
 * their own AND let `Spacing` print a second one underneath in Custom mode, so
 * the panel carried two title rows where the design draws one; `Spacing` is now
 * given `showHeader={ false }` and this component owns the row, including the
 * unit switcher that used to live inside it.
 *
 * Value shape (see `@shaped-gallery/lib/box-shadow`):
 *   { selectDefault: 'preset-m' | 'custom' | …, value: { top, right, bottom, left }, unit: 'inset' | 'outset', color, hoverColor }
 * where `top`/`right`/`bottom`/`left` are X offset / Y offset / blur / spread.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes         Stored shadow bundle.
 * @param {string}   props.attributesKey      Attribute name to write the bundle to.
 * @param {Function} props.setAttributes      setAttributes.
 * @param {boolean}  props.enableAttribute    Current enable state.
 * @param {string}   props.enableAttributeKey Attribute name for the enable toggle.
 * @param {boolean}  [props.shadowColorState] Show the Default / Hover colour switcher.
 * @param {string}   [props.defaultColor]     Colour the reset restores.
 * @return {JSX.Element} Control.
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Tooltip } from '@wordpress/components';
import {
	BOX_SHADOW_DEFAULT,
	BOX_SHADOW_PRESETS,
	boxShadowValue,
	withBoxShadowDefaults,
} from '@shaped-gallery/lib/box-shadow';
import { CheckCircleIcon, ShadowSlidersIcon } from '@shaped-gallery/icons';
import Toggle from '../toggle';
import Spacing from '../spacing';
import ButtonGroup from '../buttonGroup';
import ColorPicker from '../color';
import ResetButton from '../resetButton';
import Units from '../units';
import '../shared.scss';
import './editor.scss';

/**
 * Inset / outset, spelled the way the design's chip spells them. `Units`
 * lower-cases on write, so the stored value stays `outset` / `inset`; only the
 * chip's own label is capitalised (by CSS, see editor.scss).
 */
const SHADOW_UNITS = [ 'Outset', 'Inset' ];

function BoxShadow( {
	attributes,
	attributesKey,
	setAttributes,
	enableAttribute,
	enableAttributeKey,
	shadowColorState = true,
	defaultColor = BOX_SHADOW_DEFAULT.color,
} ) {
	const [ colorState, setColorState ] = useState( 'color' );
	const shadow = withBoxShadowDefaults( attributes );
	const isCustom = shadow.selectDefault === 'custom';

	const writeShadow = ( patch ) =>
		setAttributes( { [ attributesKey ]: { ...shadow, ...patch } } );

	const setEnabled = ( on ) =>
		setAttributes(
			on
				? { [ enableAttributeKey ]: true, [ attributesKey ]: shadow }
				: { [ enableAttributeKey ]: false }
		);

	const setColor = ( color ) => writeShadow( { [ colorState ]: color } );

	const handlePresetSelect = ( presetId ) => writeShadow( { selectDefault: presetId } );

	/*
	 * The switch is a two-way door: leaving Custom drops back to the tiles with
	 * nothing selected, which is the shipped default (`AttributeGenerators::box_shadow()`
	 * ships no `selectDefault` at all) rather than an arbitrary tile picked for
	 * the user.
	 */
	const handleToggleCustom = () => writeShadow( { selectDefault: isCustom ? '' : 'custom' } );

	/*
	 * Reset means "back to the shipped default", which is a different thing in
	 * each mode: in Presets it is no tile selected; in Custom it is the default
	 * offsets, keyword and colour, with Custom itself still selected (the reset
	 * restores a value, it does not change which control you are looking at).
	 */
	const handleReset = () =>
		writeShadow(
			isCustom
				? { ...BOX_SHADOW_DEFAULT, selectDefault: 'custom' }
				: { selectDefault: '' }
		);

	return (
		<div className="sp-shaped-gallery-box-shadow">
			<Toggle
				label={ __( 'Box Shadow', 'easy-lightbox-wp' ) }
				checked={ !! enableAttribute }
				onChange={ setEnabled }
			/>
			{ enableAttribute && (
				<>
					{ /* Shadow Type — the one header row both modes share. */ }
					<div className="sp-shaped-gallery-control-head">
						<div className="sp-shaped-gallery-control-head__left">
							<span className="sp-shaped-gallery-control__title">
								{ __( 'Shadow Type', 'easy-lightbox-wp' ) }
							</span>
						</div>
						<div className="sp-shaped-gallery-control-head__right">
							<ResetButton onClick={ handleReset } />
							{ /*
							   The design also draws a "use global default" chip in this slot
							   while the tiles are showing. It is deliberately not built: a
							   global shadow library needs a site-wide preset store this plugin
							   does not have, and a permanently disabled control is noise in the
							   header rather than a promise. Presets mode simply leaves the slot
							   empty. */ }
							{ isCustom && (
								<Units
									attributes={ shadow }
									attributesKey={ attributesKey }
									setAttributes={ setAttributes }
									units={ SHADOW_UNITS }
								/>
							) }
							<Tooltip
								text={
									isCustom
										? __( 'Switch to presets', 'easy-lightbox-wp' )
										: __( 'Switch to custom', 'easy-lightbox-wp' )
								}
							>
								<button
									type="button"
									className="sp-shaped-gallery-box-shadow__mode"
									aria-pressed={ isCustom }
									onClick={ handleToggleCustom }
								>
									<ShadowSlidersIcon />
								</button>
							</Tooltip>
						</div>
					</div>

					{ ! isCustom ? (
						<div className="sp-shaped-gallery-box-shadow__presets">
							{ BOX_SHADOW_PRESETS.map( ( preset ) => {
								const isSelected = shadow.selectDefault === preset.id;
								return (
									<Tooltip key={ preset.id } text={ preset.name }>
										<button
											type="button"
											className={ `sp-shaped-gallery-box-shadow__preset${
												isSelected ? ' is-selected' : ''
											}` }
											aria-pressed={ isSelected }
											style={ { boxShadow: boxShadowValue( preset.shadow ) } }
											onClick={ () => handlePresetSelect( preset.id ) }
										>
											{ isSelected && (
												<span
													className="sp-shaped-gallery-box-shadow__check"
													aria-hidden="true"
												>
													<CheckCircleIcon size={ 12 } />
												</span>
											) }
										</button>
									</Tooltip>
								);
							} ) }
						</div>
					) : (
						<>
							<Spacing
								attributes={ shadow }
								attributesKey={ attributesKey }
								setAttributes={ setAttributes }
								showHeader={ false }
								linkButton={ false }
								units={ false }
								defaultValue={ BOX_SHADOW_DEFAULT.value }
								labelItem={ {
									top: __( 'X Offset', 'easy-lightbox-wp' ),
									right: __( 'Y Offset', 'easy-lightbox-wp' ),
									bottom: __( 'Blur', 'easy-lightbox-wp' ),
									left: __( 'Spread', 'easy-lightbox-wp' ),
								} }
							/>
							{ shadowColorState && (
								<ButtonGroup
									label={ __( 'Shadow Color', 'easy-lightbox-wp' ) }
									value={ colorState }
									items={ [
										{ label: __( 'Default', 'easy-lightbox-wp' ), value: 'color' },
										{ label: __( 'Hover', 'easy-lightbox-wp' ), value: 'hoverColor' },
									] }
									onChange={ setColorState }
								/>
							) }
							<ColorPicker
								label={ __( 'Shadow Color', 'easy-lightbox-wp' ) }
								value={ shadow[ colorState ] }
								onChange={ setColor }
								defaultColor={ defaultColor }
							/>
						</>
					) }
				</>
			) }
		</div>
	);
}

export default BoxShadow;

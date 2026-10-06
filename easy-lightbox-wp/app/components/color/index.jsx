/**
 * ColorPicker — a labelled colour control. A colour swatch opens a `Dropdown`
 * hosting the core `ColorPicker` (with alpha); an optional reset restores the
 * default colour. Value/write uses the library's dual contract.
 *
 * Deliberately simple: no theme-palette fetch, no custom-colour persistence,
 * no external colour libraries — just a swatch, a picker, and reset.
 *
 * @param {Object}   props
 * @param {*}        [props.value]           Current colour (overrides `attributes`).
 * @param {*}        [props.attributes]      Current colour (attributesKey form).
 * @param {string}   [props.attributesKey]   Attribute name to write.
 * @param {Function} [props.setAttributes]   setAttributes.
 * @param {Function} [props.onChange]        Custom change handler.
 * @param {string}   [props.label]           Control label.
 * @param {string}   [props.defaultColor]    Default colour (enables reset when the value differs).
 * @param {boolean}  [props.allowReset=true] Show reset when the colour differs from the default.
 * @return {JSX.Element} Control.
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	ColorPicker as WpColorPicker,
	ColorIndicator,
	Dropdown,
} from '@wordpress/components';
import { memo } from '@wordpress/element';
import ResetButton from '../resetButton';
import './editor.scss';

function ColorPicker( {
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	label,
	defaultColor = '',
	allowReset = true,
} ) {
	const current = value !== undefined ? value : attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	const showReset = allowReset && defaultColor !== undefined && current !== defaultColor;

	return (
		<div className="sp-shaped-gallery-color-picker sp-shaped-gallery-cmp-mb">
			{ label && <span className="sp-shaped-gallery-control__title">{ label }</span> }
			<div className="sp-shaped-gallery-color-picker__right">
				{ showReset && <ResetButton onClick={ () => setValue( defaultColor ) } /> }
				<Dropdown
					popoverProps={ { placement: 'top-end' } }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							onClick={ onToggle }
							aria-expanded={ isOpen }
							label={ label || __( 'Select colour', 'easy-lightbox-wp' ) }
						>
							<ColorIndicator colorValue={ current } />
						</Button>
					) }
					renderContent={ () => (
						<div className="sp-shaped-gallery-color-picker__panel">
							<WpColorPicker
								color={ current }
								onChange={ setValue }
								enableAlpha
							/>
						</div>
					) }
				/>
			</div>
		</div>
	);
}

export default memo( ColorPicker );

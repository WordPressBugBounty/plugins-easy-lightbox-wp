/**
 * InputControl — labelled wrapper over the core `InputControl` (text / number).
 *
 * Value/write uses the library's dual contract: pass `value` + `onChange` for a
 * custom / nested write, OR `attributes` (current value) + `attributesKey` +
 * `setAttributes` for a direct top-level attribute.
 *
 * @param {Object}         props
 * @param {*}              [props.value]         Current value (overrides `attributes`).
 * @param {*}              [props.attributes]    Current value (attributesKey form).
 * @param {string}         [props.attributesKey] Attribute name to write.
 * @param {Function}       [props.setAttributes] setAttributes.
 * @param {Function}       [props.onChange]      Custom change handler.
 * @param {(string|false)} [props.label]         Field label.
 * @param {boolean}        [props.flexStyle]     Render label inline with the control.
 * @param {string}         [props.type]          Input type (e.g. 'number').
 * @param {string}         [props.placeholder]   Placeholder text.
 * @param {string}         [props.help]          Help text.
 * @return {JSX.Element} Field.
 */
import { InputControl as WpInputControl } from '@shaped-gallery/lib/wp-components';
import { memo } from '@wordpress/element';
import './editor.scss';

function InputControl( {
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	label = false,
	flexStyle = false,
	type = 'text',
	placeholder = '',
	help = '',
} ) {
	const current = value !== undefined ? value : attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	return (
		<div className={ `sp-shaped-gallery-input-control sp-shaped-gallery-cmp-mb ${ flexStyle ? 'is-flex' : '' }`.trim() }>
			{ label && <span className="sp-shaped-gallery-control__title">{ label }</span> }
			<WpInputControl
				label={ label || '' }
				hideLabelFromVision
				value={ current }
				type={ type }
				placeholder={ placeholder }
				help={ help }
				onChange={ setValue }
				__next40pxDefaultSize
			/>
		</div>
	);
}

export default memo( InputControl );

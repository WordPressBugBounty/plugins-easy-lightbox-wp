/**
 * Toggle — labelled wrapper over the core `ToggleControl` with the brand accent.
 *
 * Dual contract: pass `checked` + `onChange` for a custom/nested boolean write,
 * OR `attributes` (current bool) + `attributesKey` + `setAttributes` for a
 * top-level attribute.
 *
 * `hideLabel` keeps the label in the DOM — it is what gives the switch its
 * accessible name — but takes it out of the visual flow, for layouts that already
 * show the name themselves (a settings row with its own title and description).
 *
 * @param {Object}   props
 * @param {string}   props.label           Toggle label.
 * @param {boolean}  [props.checked]       Current state (overrides `attributes`).
 * @param {boolean}  [props.attributes]    Current state (attributesKey form).
 * @param {string}   [props.attributesKey] Attribute name to write.
 * @param {Function} [props.setAttributes] setAttributes.
 * @param {Function} [props.onChange]      Custom change handler.
 * @param {string}   [props.help]          Help text.
 * @param {boolean}  [props.hideLabel]     Render the label for screen readers only.
 * @return {JSX.Element} Toggle.
 */
import { memo } from '@wordpress/element';
import { ToggleControl } from '@wordpress/components';
import '../shared.scss';

function Toggle( {
	label,
	checked,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	help,
	hideLabel = false,
} ) {
	const value = checked !== undefined ? checked : !! attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	return (
		<div
			className={ `sp-shaped-gallery-toggle sp-shaped-gallery-cmp-mb${
				hideLabel ? ' is-label-hidden' : ''
			}` }
		>
			<ToggleControl
				label={ label }
				checked={ !! value }
				onChange={ setValue }
				help={ help }
				__nextHasNoMarginBottom
			/>
		</div>
	);
}

export default memo( Toggle );

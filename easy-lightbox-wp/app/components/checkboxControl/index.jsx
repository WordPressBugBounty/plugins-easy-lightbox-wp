/**
 * CheckboxControl — labelled wrapper over the core `CheckboxControl` with the
 * brand accent and the library's dual boolean contract.
 *
 * Dual contract: pass `checked` + `onChange` for a custom / nested boolean
 * write, OR `attributes` (current bool) + `attributesKey` + `setAttributes` for
 * a top-level attribute.
 *
 * ## Naming the box
 *
 * Three ways, in order of preference:
 *
 * - `labelledBy` — the id of an element that ALREADY names the control on screen (a
 *   settings row's own heading, say). Core is then given no label at all, so nothing
 *   is repeated: the words appear once, in the heading, and `aria-labelledby` points
 *   the box at them. This is the right choice whenever the name is already visible.
 * - `label` + `hideLabel` — no element to point at, so core keeps a real `<label>` and
 *   `editor.scss` clips it out of the visual flow. The name is in the DOM twice, but
 *   only once on screen.
 * - `label` alone — the wrapper draws the name itself, beside the box.
 *
 * NOT `hideLabelFromVision`: that is `BaseControl`'s prop. `CheckboxControl` spreads
 * anything it does not recognise straight onto the `<input>`, so it reached the DOM as
 * an unknown attribute and React warned instead of hiding anything.
 *
 * @param {Object}   props
 * @param {string}   [props.label]         Checkbox label.
 * @param {boolean}  [props.checked]       Current state (overrides `attributes`).
 * @param {boolean}  [props.attributes]    Current state (attributesKey form).
 * @param {string}   [props.attributesKey] Attribute name to write.
 * @param {Function} [props.setAttributes] setAttributes.
 * @param {Function} [props.onChange]      Custom change handler.
 * @param {boolean}  [props.hideLabel]     Keep the label for screen readers only.
 * @param {string}   [props.labelledBy]    Id of an element that already names the box.
 * @param {boolean}  [props.disabled]      Whether the box is inoperable.
 * @param {Object}   [props.inputProps]    Extra attributes for the `<input>` itself.
 * @return {JSX.Element} Control.
 */
import { CheckboxControl as WpCheckboxControl } from '@wordpress/components';
import { memo } from '@wordpress/element';
import './editor.scss';

function CheckboxControl( {
	label = '',
	checked,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	hideLabel = false,
	labelledBy = '',
	disabled = false,
	inputProps = {},
} ) {
	const value = checked !== undefined ? checked : !! attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	return (
		<div
			className={ `sp-shaped-gallery-checkbox-control sp-shaped-gallery-cmp-mb${
				hideLabel || labelledBy ? ' is-label-hidden' : ''
			}` }
		>
			{ label && ! hideLabel && ! labelledBy && (
				<span className="sp-shaped-gallery-control__title">{ label }</span>
			) }
			{ /*
			 * An empty `label` makes core render no `<label>` element at all, which is
			 * what keeps the name from appearing twice in the DOM when something else
			 * already carries it. Anything not a known prop — `aria-labelledby` and
			 * whatever `inputProps` holds — is spread onto the `<input>`.
			 */ }
			<WpCheckboxControl
				label={ labelledBy ? '' : label }
				aria-labelledby={ labelledBy || undefined }
				checked={ !! value }
				disabled={ disabled }
				onChange={ setValue }
				__nextHasNoMarginBottom
				{ ...inputProps }
			/>
		</div>
	);
}

export default memo( CheckboxControl );

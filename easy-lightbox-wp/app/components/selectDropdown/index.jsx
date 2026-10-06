/**
 * SelectDropdown — a popover-backed single-select whose options can carry an
 * icon alongside the label. Built on `SpPopover`; the active option is
 * highlighted and clicking one writes the value through the dual contract.
 *
 * @param {Object}                                         props
 * @param {string}                                         [props.label]         Toggle label.
 * @param {Array<{label?:string,icon?:Node,value:string}>} props.options         Options.
 * @param {*}                                              [props.value]         Current value (overrides `attributes`).
 * @param {*}                                              [props.attributes]    Current value (attributesKey form).
 * @param {string}                                         [props.attributesKey] Attribute name to write.
 * @param {Function}                                       [props.setAttributes] setAttributes.
 * @param {Function}                                       [props.onChange]      Custom change handler.
 * @return {JSX.Element} Dropdown.
 */
import { memo } from '@wordpress/element';
import SpPopover from '../popover';
import './editor.scss';

function SelectDropdown( {
	label,
	options = [],
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
} ) {
	const current = value !== undefined ? value : attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	return (
		<SpPopover label={ label }>
			<ul className="sp-shaped-gallery-select-dropdown">
				{ options.map( ( option ) => (
					<li key={ option.value } className="sp-shaped-gallery-select-dropdown__option">
						<button
							type="button"
							className={ current === option.value ? 'is-active' : '' }
							onClick={ () => setValue( option.value ) }
						>
							{ option.label && <span>{ option.label }</span> }
							{ option.icon && <span>{ option.icon }</span> }
						</button>
					</li>
				) ) }
			</ul>
		</SpPopover>
	);
}

export default memo( SelectDropdown );

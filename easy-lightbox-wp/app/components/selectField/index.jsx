/**
 * SelectField — labelled wrapper over the core `SelectControl`.
 *
 * Value/write is resolved with the library's dual contract: pass `value` +
 * `onChange` for a custom/nested write, OR `attributes` (current value) +
 * `attributesKey` + `setAttributes` for a direct top-level attribute.
 *
 * @param {Object}         props
 * @param {*}              [props.value]         Current value (overrides `attributes`).
 * @param {*}              [props.attributes]    Current value (attributesKey form).
 * @param {string}         [props.attributesKey] Attribute name to write.
 * @param {Function}       [props.setAttributes] setAttributes.
 * @param {Function}       [props.onChange]      Custom change handler (overrides attributesKey write).
 * @param {(string|false)} [props.label]         Field label.
 * @param {Array}          props.items           SelectControl options. A flat
 *                                               `{ label, value }[]`, or a
 *                                               grouped list where any item of
 *                                               the shape `{ label, options: [] }`
 *                                               renders as a native `<optgroup>`
 *                                               (flat and grouped items may mix).
 * @param {boolean}        [props.flexStyle]     Render label inline with the control.
 * @param {boolean}        [props.defaultOption] Prepend a blank "Default" option.
 * @param {string}         [props.help]          Help text.
 * @return {JSX.Element} Field.
 */
import { memo } from '@wordpress/element';
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import '../shared.scss';

function SelectField( {
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	label = false,
	items = [],
	flexStyle = false,
	defaultOption = false,
	help = '',
} ) {
	const current = value !== undefined ? value : attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	const options = defaultOption
		? [ { label: __( 'Default', 'easy-lightbox-wp' ), value: '' }, ...items ]
		: items;

	// Grouped options render as native `<optgroup>` children; a flat list keeps
	// the lighter `options` prop path. `SelectControl` renders `children` when
	// present and falls back to `options` otherwise.
	const hasGroups = options.some( ( item ) => Array.isArray( item.options ) );

	return (
		<div className={ `sp-shaped-gallery-select-field sp-shaped-gallery-cmp-mb ${ flexStyle ? 'is-flex' : '' }`.trim() }>
			{ label && (
				flexStyle ? (
					<span className="sp-shaped-gallery-control__title">{ label }</span>
				) : (
					<div className="sp-shaped-gallery-control-head">
						<div className="sp-shaped-gallery-control-head__left">
							<span className="sp-shaped-gallery-control__title">{ label }</span>
						</div>
					</div>
				)
			) }
			<SelectControl
				label={ label || '' }
				hideLabelFromVision
				value={ current }
				options={ hasGroups ? undefined : options }
				onChange={ setValue }
				help={ help }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				{ hasGroups &&
					options.map( ( item, index ) =>
						Array.isArray( item.options ) ? (
							<optgroup key={ item.label ?? index } label={ item.label }>
								{ item.options.map( ( option ) => (
									<option key={ option.value } value={ option.value }>
										{ option.label }
									</option>
								) ) }
							</optgroup>
						) : (
							<option key={ item.value } value={ item.value }>
								{ item.label }
							</option>
						)
					) }
			</SelectControl>
		</div>
	);
}

export default memo( SelectField );

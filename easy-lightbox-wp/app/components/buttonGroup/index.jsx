/**
 * ButtonGroup — segmented single-select over the core `ToggleGroupControl`.
 *
 * Dual contract: `value` + `onChange`, OR `attributes` + `attributesKey` +
 * `setAttributes`. With `responsive`, the attribute is treated as a flat
 * `{ desktop, tablet, mobile }` object and the active device (from
 * `useDeviceType`) is read/written, with an inline device switcher in the header.
 *
 * @param {Object}                                     props
 * @param {*}                                          [props.value]         Current value (overrides `attributes`).
 * @param {*}                                          [props.attributes]    Current value (attributesKey form).
 * @param {string}                                     [props.attributesKey] Attribute name to write.
 * @param {Function}                                   [props.setAttributes] setAttributes.
 * @param {Function}                                   [props.onChange]      Custom change handler.
 * @param {string}                                     [props.label]         Group label.
 * @param {Array<{label:string,value:string,icon?:*}>} props.items           Options; an `icon` renders the option as an icon (with `label` as its accessible name / tooltip).
 * @param {boolean}                                    [props.responsive]    Per-device value + device switcher.
 * @param {boolean}                                    [props.isBlock=true]  Full-width segmented layout.
 * @return {JSX.Element} Group.
 */
import { memo } from '@wordpress/element';
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
	ToggleGroupControlOptionIcon,
} from '@shaped-gallery/lib/wp-components';
import { useDeviceType } from '@shaped-gallery/hooks';
import Responsive from '../responsive';
import '../shared.scss';

function ButtonGroup( {
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	label,
	items = [],
	responsive = false,
	isBlock = true,
} ) {
	const device = useDeviceType();
	const isResponsive = responsive && attributes && typeof attributes === 'object';

	let current;
	if ( value !== undefined ) {
		current = value;
	} else if ( isResponsive ) {
		current = attributes[ device ] ?? attributes.desktop;
	} else {
		current = attributes;
	}

	const setValue = ( next ) => {
		if ( onChange ) {
			onChange( next );
			return;
		}
		if ( isResponsive ) {
			setAttributes( { [ attributesKey ]: { ...attributes, [ device ]: next } } );
		} else {
			setAttributes( { [ attributesKey ]: next } );
		}
	};

	return (
		<div className="sp-shaped-gallery-button-group sp-shaped-gallery-cmp-mb">
			{ label && (
				<div className="sp-shaped-gallery-control-head">
					<div className="sp-shaped-gallery-control-head__left">
						<span className="sp-shaped-gallery-control__title">{ label }</span>
						{ responsive && <Responsive /> }
					</div>
				</div>
			) }
			<ToggleGroupControl
				label={ label || '' }
				hideLabelFromVision
				value={ current }
				onChange={ setValue }
				isBlock={ isBlock }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				{ items.map( ( item ) =>
					item.icon ? (
						<ToggleGroupControlOptionIcon
							key={ item.value }
							value={ item.value }
							icon={ item.icon }
							label={ item.label }
						/>
					) : (
						<ToggleGroupControlOption
							key={ item.value }
							value={ item.value }
							label={ item.label }
						/>
					)
				) }
			</ToggleGroupControl>
		</div>
	);
}

export default memo( ButtonGroup );

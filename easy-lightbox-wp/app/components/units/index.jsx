/**
 * Units — hover-to-reveal unit switcher (px / % / em …) for a control that
 * carries a `unit` on its attribute value. Supports both a scalar `unit` and a
 * per-device `unit: { desktop, tablet, mobile }`, writing back through the
 * `attributesKey` convention.
 *
 * Used by the gap controls (via `SPRangeControl`'s `units`) and the styling
 * controls (Spacing, Border, …).
 *
 * @param {Object}   props
 * @param {Object}   props.attributes     Attribute value carrying `unit`.
 * @param {string}   props.attributesKey  Attribute name to write.
 * @param {Function} props.setAttributes  setAttributes.
 * @param {string[]} [props.units]        Available units.
 * @param {Function} [props.onUnitChange] Custom handler `({ unit, device })` (overrides the write).
 * @return {JSX.Element} Switcher.
 */
import { memo } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { useDeviceType } from '@shaped-gallery/hooks';
import '../shared.scss';

function Units( {
	attributes,
	attributesKey,
	setAttributes,
	units = [ 'px', '%', 'em' ],
	onUnitChange,
} ) {
	const device = useDeviceType();
	const current =
		typeof attributes?.unit === 'object' ? attributes.unit[ device ] : attributes?.unit;

	const setUnit = ( next ) => {
		const value = next.toLowerCase();
		if ( onUnitChange ) {
			onUnitChange( { unit: value, device } );
			return;
		}
		const unit =
			typeof attributes.unit === 'object'
				? { ...attributes.unit, [ device ]: value }
				: value;
		setAttributes( { [ attributesKey ]: { ...attributes, unit } } );
	};

	return (
		<div className="sp-shaped-gallery-units">
			<span className="sp-shaped-gallery-units__current">{ current }</span>
			<div className="sp-shaped-gallery-units__menu">
				{ units.map( ( u ) => (
					<Button
						key={ u }
						className={ current === u.toLowerCase() ? 'is-active' : '' }
						onClick={ () => setUnit( u ) }
					>
						{ u }
					</Button>
				) ) }
			</div>
		</div>
	);
}

export default memo( Units );

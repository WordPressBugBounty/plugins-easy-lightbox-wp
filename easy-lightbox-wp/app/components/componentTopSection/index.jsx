/**
 * ComponentTopSection — a reusable control header combining a label, the
 * responsive device switcher, an optional reset button, and an optional unit
 * switcher. Composed by richer controls (Spacing, Typography) to keep their
 * header row consistent with the standalone controls.
 *
 * @param {Object}           props
 * @param {string}           props.label           Control label.
 * @param {(string[]|false)} [props.units]         Units to show (falsy hides the unit switcher).
 * @param {Object}           props.attributes      Attribute value (for units).
 * @param {Function}         props.setAttributes   setAttributes (for units).
 * @param {string}           [props.attributesKey] Attribute name (for units).
 * @param {(Function|false)} [props.onReset]       Reset handler (falsy hides reset).
 * @param {boolean}          [props.responsive]    Show the device switcher.
 * @return {JSX.Element} Header row.
 */
import { memo } from '@wordpress/element';
import Responsive from '../responsive';
import Units from '../units';
import ResetButton from '../resetButton';
import '../shared.scss';

function ComponentTopSection( {
	label,
	units = false,
	attributes,
	setAttributes,
	attributesKey = '',
	onReset = false,
	responsive = false,
} ) {
	return (
		<div className="sp-shaped-gallery-control-head">
			<div className="sp-shaped-gallery-control-head__left">
				<span className="sp-shaped-gallery-control__title">{ label }</span>
				{ responsive && <Responsive /> }
			</div>
			{ ( units || onReset ) && (
				<div className="sp-shaped-gallery-control-head__right">
					{ onReset && <ResetButton onClick={ onReset } /> }
					{ units && (
						<Units
							attributes={ attributes }
							setAttributes={ setAttributes }
							attributesKey={ attributesKey }
							units={ units }
						/>
					) }
				</div>
			) }
		</div>
	);
}

export default memo( ComponentTopSection );

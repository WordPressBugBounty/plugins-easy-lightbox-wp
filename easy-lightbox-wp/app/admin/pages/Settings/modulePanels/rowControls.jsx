/**
 * The controls a module-panel row can carry, shared by every module's panel.
 *
 * Module panels are drawn from one set of row components in Figma — a dropdown, a
 * switch, a measurement field — so they are one set of renderers here too, and a
 * second module reuses them by naming a `type` rather than by copying JSX.
 *
 * Every renderer takes the SAME four props, which is what lets a panel point them
 * at something other than the draft root: a panel may render these per item in a
 * list, passing that item as `draft` and a writer that patches only that item.
 * Nothing here knows where the value lives.
 *
 *  - `row`      the localized row copy (`key`, `label`, `items`, `unit`, `pair`, …)
 *  - `control`  the panel's descriptor for the row (bounds, flags)
 *  - `draft`    the object the row reads (`draft[row.key]`)
 *  - `set`      `( key, value )` writer for that object
 *  - `defaults` the shipped values, for a reset
 */
import { NumberControl } from '@shaped-gallery/lib/wp-components';
import { ResetButton, SelectField, Toggle } from '@shaped-gallery/components';

/**
 * A dropdown row. Its options are PHP's, so a filter can localize or extend them.
 *
 * @param {Object}   props
 * @param {Object}   props.row   Localized row copy.
 * @param {Object}   props.draft Object the row reads.
 * @param {Function} props.set   Writer.
 * @return {JSX.Element} Control.
 */
export function SelectRowControl( { row, draft, set } ) {
	return (
		<SelectField
			label={ row.label }
			value={ draft[ row.key ] }
			onChange={ ( value ) => set( row.key, value ) }
			items={ row.items || [] }
		/>
	);
}

/**
 * A switch row.
 *
 * @param {Object}   props
 * @param {Object}   props.row   Localized row copy.
 * @param {Object}   props.draft Object the row reads.
 * @param {Function} props.set   Writer.
 * @return {JSX.Element} Control.
 */
export function ToggleRowControl( { row, draft, set } ) {
	return (
		<Toggle
			label={ row.label }
			hideLabel
			checked={ !! draft[ row.key ] }
			onChange={ ( value ) => set( row.key, value ) }
		/>
	);
}

/**
 * A numeric value, as a number — the field's own value is a string.
 *
 * Empty stays empty so a field can be cleared while typing (and so an "Auto" field
 * reads as unset rather than as zero).
 *
 * @param {string} value Raw field value.
 * @return {(number|string)} Number, or '' for an empty field.
 */
function toNumber( value ) {
	if ( '' === value || undefined === value || null === value ) {
		return '';
	}
	const parsed = Number( value );
	return Number.isFinite( parsed ) ? parsed : '';
}

/**
 * The design's "Measurement" control: a numeric field with stacked spin buttons and
 * a static unit badge — no slider, exactly as the Typography popover's Letter / Word
 * Spacing fields are drawn (§6.7).
 *
 * @param {Object}   props
 * @param {string}   props.label         Accessible name (the row prints the visible one).
 * @param {*}        props.value         Current value.
 * @param {Function} props.onChange      Receives a number, or '' when cleared.
 * @param {string}   [props.unit]        Unit badge text.
 * @param {string}   [props.placeholder] Placeholder for an unset field ("Auto").
 * @param {number}   [props.min]         Minimum.
 * @param {number}   [props.max]         Maximum.
 * @return {JSX.Element} Field.
 */
export function MeasureField( {
	label,
	value,
	onChange,
	unit = '',
	placeholder = '',
	min = 0,
	max = 100,
} ) {
	return (
		<div className="sp-shaped-gallery-module-panel__measure">
			<NumberControl
				className="sp-shaped-gallery-module-panel__measure-input"
				label={ label }
				hideLabelFromVision
				value={ value }
				placeholder={ placeholder }
				min={ min }
				max={ max }
				onChange={ ( next ) => onChange( toNumber( next ) ) }
				__next40pxDefaultSize
			/>
			{ !! unit && (
				<span className="sp-shaped-gallery-module-panel__measure-unit">{ unit }</span>
			) }
		</div>
	);
}

/**
 * A measurement row: a reset, the field and its unit badge.
 *
 * @param {Object}   props
 * @param {Object}   props.row      Localized row copy (`unit`).
 * @param {Object}   props.control  Descriptor (`min`, `max`).
 * @param {Object}   props.draft    Object the row reads.
 * @param {Function} props.set      Writer.
 * @param {Object}   props.defaults Shipped values, for the reset.
 * @return {JSX.Element} Control.
 */
export function NumberRowControl( { row, control, draft, set, defaults } ) {
	return (
		<>
			<ResetButton onClick={ () => set( row.key, defaults[ row.key ] ) } />
			<MeasureField
				label={ row.label }
				value={ draft[ row.key ] }
				onChange={ ( value ) => set( row.key, value ) }
				unit={ row.unit }
				min={ control.min }
				max={ control.max }
			/>
		</>
	);
}

/**
 * The renderers every panel gets for free, keyed by the `type` its `CONTROLS` names.
 * A panel adds its own (an icon picker, a popover) by spreading this and appending.
 *
 * @type {Object<string,Function>}
 */
export const SHARED_RENDERERS = {
	select: SelectRowControl,
	toggle: ToggleRowControl,
	number: NumberRowControl,
};

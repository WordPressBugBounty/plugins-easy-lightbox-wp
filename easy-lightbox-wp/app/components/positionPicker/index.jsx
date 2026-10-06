/**
 * PositionPicker — a visual 3×3 position selector.
 *
 * A visual 3×3 grid of position nodes representing locations over an image.
 * Clicking a node sets the value to that position. Built for the Lightbox
 * panel's "Choose Icon Position" popup (Figma design).
 *
 * Renders a simple flat square for each node. Selected node is highlighted.
 *
 * Dual value/write contract, like the rest of `@shaped-gallery/components`:
 * `value` + `onChange`, OR `attributes` + `attributesKey` + `setAttributes`.
 *
 * @param {Object}   props
 * @param {string}   [props.value]         Current position key (overrides `attributes`).
 * @param {string}   [props.attributes]    Current position key (attributesKey form).
 * @param {string}   [props.attributesKey] Attribute name to write.
 * @param {Function} [props.setAttributes] setAttributes.
 * @param {Function} [props.onChange]      Custom change handler (overrides attributesKey write).
 * @param {string}   [props.label]         Optional label rendered above the stage.
 * @return {JSX.Element} Picker.
 */
import { memo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import './editor.scss';

/**
 * The nine positions, in reading order (row-major) so the `radiogroup` arrow-key
 * order matches the visual grid. `label` is each node's accessible name.
 */
const POSITIONS = [
	{ value: 'top-left', label: __( 'Top left', 'easy-lightbox-wp' ) },
	{ value: 'top-center', label: __( 'Top center', 'easy-lightbox-wp' ) },
	{ value: 'top-right', label: __( 'Top right', 'easy-lightbox-wp' ) },
	{ value: 'center-left', label: __( 'Center left', 'easy-lightbox-wp' ) },
	{ value: 'center', label: __( 'Center', 'easy-lightbox-wp' ) },
	{ value: 'center-right', label: __( 'Center right', 'easy-lightbox-wp' ) },
	{ value: 'bottom-left', label: __( 'Bottom left', 'easy-lightbox-wp' ) },
	{ value: 'bottom-center', label: __( 'Bottom center', 'easy-lightbox-wp' ) },
	{ value: 'bottom-right', label: __( 'Bottom right', 'easy-lightbox-wp' ) },
];

function PositionPicker( {
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	label,
} ) {
	const current = value !== undefined ? value : attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	const groupLabel = label || __( 'Position', 'easy-lightbox-wp' );

	return (
		<div className="sp-shaped-gallery-position-picker sp-shaped-gallery-cmp-mb">
			{ label && <span className="sp-shaped-gallery-position-picker__label">{ label }</span> }
			<div className="sp-shaped-gallery-position-picker__stage" role="radiogroup" aria-label={ groupLabel }>
				{ POSITIONS.map( ( position ) => {
					const selected = current === position.value;
					return (
						<button
							key={ position.value }
							type="button"
							role="radio"
							aria-checked={ selected }
							aria-label={ position.label }
							title={ position.label }
							className={ `sp-shaped-gallery-position-picker__node${
								selected ? ' is-selected' : ''
							}` }
							onClick={ () => setValue( position.value ) }
						/>
					);
				} ) }
			</div>
		</div>
	);
}

export default memo( PositionPicker );

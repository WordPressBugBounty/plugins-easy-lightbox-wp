/**
 * Justified-layout controls, rendered inline inside Layout Settings.
 *
 * Exposes "Maximum Row Height" as an Auto/Custom segmented control; the custom
 * row-height range appears only when "Custom" is chosen. Serves as the reference
 * template for every future layout-specific controls component — copy it, swap
 * the controls. Built entirely from the shared `@shaped-gallery/components`.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Controls.
 */
import { Fragment } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ButtonGroup, SPRangeControl } from '@shaped-gallery/components';

export default function JustifiedControls( { attributes, setAttributes } ) {
	const { rowHeightMode, maxRowHeight } = attributes;

	return (
		<Fragment>
			<ButtonGroup
				label={ __( 'Maximum Row Height', 'easy-lightbox-wp' ) }
				attributesKey="rowHeightMode"
				attributes={ rowHeightMode }
				setAttributes={ setAttributes }
				items={ [
					{ value: 'auto', label: __( 'Auto', 'easy-lightbox-wp' ) },
					{ value: 'custom', label: __( 'Custom', 'easy-lightbox-wp' ) },
				] }
			/>
			{ 'custom' === rowHeightMode && (
				<SPRangeControl
					label={ __( 'Row Height (px)', 'easy-lightbox-wp' ) }
					attributesKey="maxRowHeight"
					attributes={ maxRowHeight }
					setAttributes={ setAttributes }
					min={ 80 }
					max={ 600 }
					defaultValue={ 280 }
				/>
			) }
		</Fragment>
	);
}

/**
 * Column-based layout controls (grid, masonry, metro, thumbnails, staggered).
 *
 * The default layout-specific controls rendered inline inside Layout Settings:
 * a responsive "Columns" range. Built from the shared component library.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Controls.
 */
import { __ } from '@wordpress/i18n';
import { SPRangeControl } from '@shaped-gallery/components';

export default function ColumnsControls( { attributes, setAttributes } ) {
	const { columns } = attributes;

	return (
		<SPRangeControl
			label={ __( 'Columns', 'easy-lightbox-wp' ) }
			attributesKey="columns"
			attributes={ columns }
			setAttributes={ setAttributes }
			responsive
			min={ 1 }
			max={ 8 }
			defaultValue={ { desktop: 4, tablet: 3, mobile: 2 } }
			helpText={ __( 'Set per device using the device switcher.', 'easy-lightbox-wp' ) }
		/>
	);
}

/**
 * Masonry-layout controls, rendered inline inside Layout Settings.
 *
 * Per the Masonry Figma (node 963-27089), the only layout-specific control is a
 * responsive "Columns" range — the surrounding gaps, order, click action and
 * ajax toggle are the Inspector's universal controls. Masonry gets its own file
 * (rather than riding the generic `ColumnsControls` fallback) so its column
 * configuration is explicit and can diverge from the plain grid family without
 * touching the shared fallback. Mirrors the `JustifiedControls` template and is
 * built entirely from the shared `@shaped-gallery/components`.
 *
 * The Grid layout reuses this component verbatim (see `LAYOUT_CONTROLS`): grid
 * and masonry expose the same Layout Settings by design, so they share one
 * component and never drift.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Controls.
 */
import { __ } from '@wordpress/i18n';
import { SPRangeControl } from '@shaped-gallery/components';

export default function MasonryControls( { attributes, setAttributes } ) {
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

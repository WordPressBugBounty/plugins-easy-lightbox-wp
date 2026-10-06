/**
 * "Filter by date" + "Search media" bar above the browsing grid. Both controls
 * drive the server-side `GET /media` query (month buckets come from the localized
 * `mediaMonths` payload). Uses @wordpress/components for accessible labelling.
 *
 * Both opt into the 40px size, as every other control in `app/components` does —
 * that is the size chrome.scss draws them at, so the component agrees with the
 * stylesheet instead of being overridden into shape by it.
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {string}   props.month          Selected month bucket ('' = all dates).
 * @param {Function} props.onMonthChange  Month change handler.
 * @param {string}   props.search         Current search text.
 * @param {Function} props.onSearchChange Search change handler.
 * @param {Array}    props.months         Available months [{ value, label }].
 * @return {JSX.Element} Filter bar.
 */
export default function FilterBar( { month, onMonthChange, search, onSearchChange, months = [] } ) {
	const options = [
		{ value: '', label: __( 'All dates', 'easy-lightbox-wp' ) },
		...months.map( ( entry ) => ( { value: entry.value, label: entry.label } ) ),
	];

	return (
		<div className="sp-shaped-gallery-media-modal__filterbar">
			<div className="sp-shaped-gallery-filter sp-shaped-gallery-filter--date">
				<SelectControl
					label={ __( 'Filter by date', 'easy-lightbox-wp' ) }
					value={ month }
					options={ options }
					onChange={ onMonthChange }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</div>
			<div className="sp-shaped-gallery-filter sp-shaped-gallery-filter--search">
				<TextControl
					label={ __( 'Search media', 'easy-lightbox-wp' ) }
					type="search"
					value={ search }
					onChange={ onSearchChange }
					autoComplete="off"
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</div>
		</div>
	);
}

/**
 * LayoutPicker — the single shared layout-selection component.
 *
 * Used unchanged in BOTH the Gutenberg block (edit.jsx) and the standalone
 * "Add New Gallery" admin page (headless editor hosts the same block). Extracted
 * from the prototype `Component` (data model, first-card-auto-select, Apply
 * handler).
 *
 * Two bands, not four: the header carries the lockup and Apply, the body carries
 * the cards. The search field and the footer Apply bar were dropped — the whole
 * registry (§6.5) fits on two rows, so filtering it cost a control and a band
 * without ever shortening the list, and one Apply in the header beats a footer
 * the user has to scroll past the cards to reach.
 */
import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PickerLogoMark } from '@shaped-gallery/icons';
import { LAYOUTS, PRO_LAYOUTS } from './layouts.data';
import LayoutCard from './LayoutCard';

/**
 * @param {Object}   props
 * @param {string}   [props.value]      Currently selected layout id.
 * @param {Function} props.onApply      Called with the chosen layout id on Apply.
 * @param {string}   [props.applyLabel] Apply button label.
 * @return {JSX.Element} Picker.
 */
export default function LayoutPicker( { value, onApply, applyLabel } ) {
	const [ selected, setSelected ] = useState( value || '' );

	// First card auto-selected on mount (replicates prototype componentDidMount).
	useEffect( () => {
		if ( ! selected ) {
			const first = LAYOUTS[ 0 ];
			if ( first ) {
				setSelected( first.id );
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	return (
		<div className="sp-shaped-gallery-picker">
			<div className="sp-shaped-gallery-picker__head">
				<div className="sp-shaped-gallery-picker__title">
					<span className="sp-shaped-gallery-picker__logo" aria-hidden="true">
						<PickerLogoMark />
					</span>
					<div className="sp-shaped-gallery-picker__titles">
						<h2>{ __( 'ShapedGallery', 'easy-lightbox-wp' ) }</h2>
						<p>{ __( 'Choose a layout to start building your gallery', 'easy-lightbox-wp' ) }</p>
					</div>
				</div>
				<button
					type="button"
					className="sp-shaped-gallery-btn sp-shaped-gallery-btn--primary sp-shaped-gallery-picker__apply"
					disabled={ ! selected }
					onClick={ () => selected && onApply( selected ) }
				>
					{ applyLabel || __( 'Apply Layout', 'easy-lightbox-wp' ) }
				</button>
			</div>

			<div className="sp-shaped-gallery-picker__grid">
				{ LAYOUTS.map( ( layout ) => (
					<LayoutCard
						key={ layout.id }
						layout={ layout }
						selected={ selected === layout.id }
						onSelect={ setSelected }
					/>
				) ) }
				{ /* After the real cards, never among them: locked, they upgrade
				   rather than select (see LayoutCard). */ }
				{ PRO_LAYOUTS.map( ( layout ) => (
					<LayoutCard key={ layout.id } layout={ layout } />
				) ) }
			</div>
		</div>
	);
}

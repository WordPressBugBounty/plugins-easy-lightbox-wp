/**
 * Manage Galleries toolbar — bulk action + Apply, search, Add New Gallery.
 *
 * The search box is debounced rather than submit-only: the design has no submit
 * control next to it, and a field that looks live but is not reads as broken. The
 * debounce is what keeps that from being one request per keystroke.
 */
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PlusIcon } from '@shaped-gallery/icons';

const SEARCH_DELAY = 400;

/**
 * @param {Object}   props
 * @param {Object}   props.copy         Localized manage-screen copy.
 * @param {string}   props.createUrl    Add New Gallery URL.
 * @param {string}   props.search       Active search term.
 * @param {Function} props.onSearch     Search change handler (debounced by this component).
 * @param {string}   props.bulkAction   Selected bulk action value.
 * @param {Function} props.onBulkChange Bulk action change handler.
 * @param {Function} props.onApply      Apply the selected bulk action.
 * @param {boolean}  props.busy         Whether a request is in flight.
 * @return {JSX.Element} Toolbar.
 */
export default function Toolbar( {
	copy,
	createUrl,
	search,
	onSearch,
	bulkAction,
	onBulkChange,
	onApply,
	busy,
} ) {
	const [ term, setTerm ] = useState( search );

	// One timer per keystroke burst: the effect only fires while the typed term is
	// ahead of the committed one, so committing it ends the cycle instead of looping.
	useEffect( () => {
		if ( term === search ) {
			return undefined;
		}
		const timer = setTimeout( () => onSearch( term ), SEARCH_DELAY );

		return () => clearTimeout( timer );
	}, [ term, search, onSearch ] );

	const actions = copy.bulkActions || [];

	return (
		<div className="sp-shaped-gallery-manage__toolbar">
			<div className="sp-shaped-gallery-manage__toolbar-start">
				<label
					className="sp-shaped-gallery-sr-only"
					htmlFor="sp-shaped-gallery-manage-bulk"
				>
					{ copy.bulkLabel || __( 'Bulk Action', 'easy-lightbox-wp' ) }
				</label>
				<select
					id="sp-shaped-gallery-manage-bulk"
					className="sp-shaped-gallery-manage__select"
					value={ bulkAction }
					onChange={ ( event ) => onBulkChange( event.target.value ) }
				>
					<option value="">{ copy.bulkLabel || __( 'Bulk Action', 'easy-lightbox-wp' ) }</option>
					{ actions.map( ( action ) => (
						<option key={ action.value } value={ action.value }>
							{ action.label }
						</option>
					) ) }
				</select>

				<button
					type="button"
					className="sp-shaped-gallery-manage__apply"
					onClick={ onApply }
					disabled={ busy }
				>
					{ copy.applyLabel || __( 'Apply', 'easy-lightbox-wp' ) }
				</button>

				<label
					className="sp-shaped-gallery-sr-only"
					htmlFor="sp-shaped-gallery-manage-search"
				>
					{ copy.searchLabel || __( 'Search galleries', 'easy-lightbox-wp' ) }
				</label>
				<input
					id="sp-shaped-gallery-manage-search"
					type="search"
					className="sp-shaped-gallery-manage__search"
					placeholder={ copy.searchPlaceholder || __( 'Search..', 'easy-lightbox-wp' ) }
					value={ term }
					onChange={ ( event ) => setTerm( event.target.value ) }
				/>
			</div>

			<a
				className="sp-shaped-gallery-dash-cta sp-shaped-gallery-dash-cta--primary"
				href={ createUrl }
			>
				<span className="sp-shaped-gallery-dash-cta__icon" aria-hidden="true">
					<PlusIcon />
				</span>
				{ copy.addNewLabel || __( 'Add New Gallery', 'easy-lightbox-wp' ) }
			</a>
		</div>
	);
}

/**
 * Ready Patterns — the left rail: tier, search, and the two browse axes.
 *
 * The axes are **Layout Type** and **Category Type**, which is where this
 * diverges from the reference library it is modelled on. That product ships many
 * blocks and browses by block; ShapedGallery ships one block and seven layouts, so
 * the question a user actually has is "show me the masonry ones". Both lists are
 * data from the manifest — nothing here is hard-coded, so a layout added on the
 * serving site appears with no release here.
 *
 * Everything else — the tier pill group, the framed search field, the facet rows
 * and their count badges — is the reference's markup and dimensions, class names
 * translated to this plugin's own prefix.
 *
 * The tier pills follow the same rule as a facet group: they are drawn only when
 * there is something to choose between. A catalogue with no premium rows (a
 * provider that publishes none) would otherwise show an All / Free / Pro row in
 * which two pills select the identical list and the third selects nothing —
 * three controls for one outcome.
 */
import { __ } from '@wordpress/i18n';
import { memo } from '@wordpress/element';

/**
 * One facet row: label, count badge, active state.
 *
 * @param {Object}   props
 * @param {string}   props.label    Row label.
 * @param {number}   props.count    Item count badge.
 * @param {boolean}  props.isActive Whether this row is selected.
 * @param {Function} props.onSelect Click handler.
 * @return {JSX.Element} Row.
 */
const FacetRow = ( { label, count, isActive, onSelect } ) => (
	<button
		type="button"
		className={ `sp-shaped-patterns__facet${ isActive ? ' is-active' : '' }` }
		aria-pressed={ isActive }
		onClick={ onSelect }
	>
		<span className="sp-shaped-patterns__facet-label">{ label }</span>
		<span className="sp-shaped-patterns__badge">{ count ?? 0 }</span>
	</button>
);

/**
 * One facet group, drawn only when it has something to choose between.
 *
 * A group with a single option is the "All" row on its own — a control with one
 * choice, which is decoration rather than a filter.
 *
 * @param {Object}   props
 * @param {string}   props.title    Group heading.
 * @param {Array}    props.options  `[ { label, value, count } ]`.
 * @param {string}   props.value    Active value.
 * @param {Function} props.onChange Change handler.
 * @param {string}   props.navLabel Accessible name for the nav.
 * @return {(JSX.Element|null)} Group, or null when there is nothing to pick.
 */
const FacetGroup = ( { title, options, value, onChange, navLabel } ) => {
	if ( ! Array.isArray( options ) || options.length < 2 ) {
		return null;
	}

	return (
		<>
			<h3 className="sp-shaped-patterns__sidebar-heading">{ title }</h3>
			<nav className="sp-shaped-patterns__facets" aria-label={ navLabel }>
				{ options.map( ( option ) => (
					<FacetRow
						key={ option.value }
						label={ option.label }
						count={ option.count }
						isActive={ String( value ) === String( option.value ) }
						onSelect={ () => onChange( option.value ) }
					/>
				) ) }
			</nav>
		</>
	);
};

/**
 * @param {Object}   props
 * @param {string}   props.tier             Active tier (`all`|`free`|`pro`).
 * @param {Function} props.onTierChange     Tier handler.
 * @param {Object}   props.tierCounts       `{ all, free, pro }`.
 * @param {string}   props.search           Search query.
 * @param {Function} props.onSearchChange   Search handler.
 * @param {string}   props.layout           Active Layout Type value.
 * @param {Function} props.onLayoutChange   Layout handler.
 * @param {Array}    props.layoutOptions    Layout facet options (incl. "all").
 * @param {string}   props.category         Active Category Type value.
 * @param {Function} props.onCategoryChange Category handler.
 * @param {Array}    props.categoryOptions  Category facet options (incl. "all").
 * @return {JSX.Element} Sidebar.
 */
function Sidebar( {
	tier,
	onTierChange,
	tierCounts,
	search,
	onSearchChange,
	layout,
	onLayoutChange,
	layoutOptions,
	category,
	onCategoryChange,
	categoryOptions,
} ) {
	const tiers = [
		{ value: 'all', label: __( 'All', 'easy-lightbox-wp' ) },
		{ value: 'free', label: __( 'Free', 'easy-lightbox-wp' ) },
		{ value: 'pro', label: __( 'Pro', 'easy-lightbox-wp' ) },
	];

	const hasTiers = 0 < ( tierCounts?.pro ?? 0 );

	return (
		<aside className="sp-shaped-patterns__sidebar">
			{ hasTiers && (
				<div
					className="sp-shaped-patterns__tier"
					role="group"
					aria-label={ __( 'Filter by tier', 'easy-lightbox-wp' ) }
				>
					{ tiers.map( ( option ) => (
						<button
							key={ option.value }
							type="button"
							className={ `sp-shaped-patterns__tier-btn${
								option.value === tier ? ' is-active' : ''
							}` }
							aria-pressed={ option.value === tier }
							onClick={ () => onTierChange( option.value ) }
						>
							{ option.label }
							<span className="sp-shaped-patterns__tier-count">
								{ tierCounts?.[ option.value ] ?? 0 }
							</span>
						</button>
					) ) }
				</div>
			) }

			<div className="sp-shaped-patterns__search">
				<label className="screen-reader-text" htmlFor="sp-shaped-patterns-search">
					{ __( 'Search patterns', 'easy-lightbox-wp' ) }
				</label>
				<span className="dashicons dashicons-search" />
				<input
					type="search"
					id="sp-shaped-patterns-search"
					className="sp-shaped-patterns__search-input"
					placeholder={ __( 'Search patterns', 'easy-lightbox-wp' ) }
					value={ search }
					onChange={ ( event ) => onSearchChange( event.target.value ) }
				/>
			</div>

			<FacetGroup
				title={ __( 'Layout Type', 'easy-lightbox-wp' ) }
				navLabel={ __( 'Filter by layout', 'easy-lightbox-wp' ) }
				options={ layoutOptions }
				value={ layout }
				onChange={ onLayoutChange }
			/>

			<FacetGroup
				title={ __( 'Category Type', 'easy-lightbox-wp' ) }
				navLabel={ __( 'Filter by category', 'easy-lightbox-wp' ) }
				options={ categoryOptions }
				value={ category }
				onChange={ onCategoryChange }
			/>
		</aside>
	);
}

export default memo( Sidebar );

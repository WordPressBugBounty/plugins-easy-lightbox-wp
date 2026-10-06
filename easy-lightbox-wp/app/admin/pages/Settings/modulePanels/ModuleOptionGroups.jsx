/**
 * A module panel's body: PHP's titled groups, divider-separated, each holding rows
 * this panel knows how to draw.
 *
 * The split every module panel shares (and the reason this is one component rather
 * than one per module): group titles, row labels, row ORDER, help text and dropdown
 * options come from `DashboardConfig::module_panels()`; which CONTROL a row carries
 * is the panel's `controls` map and how it is drawn its `renderers` map. A filter can
 * reword or reorder a row, but can never conjure a control for a key the panel does
 * not know — an unknown row is dropped rather than rendered blank, and a group left
 * with no drawable rows disappears with it.
 *
 * Two maps rather than a `switch` on the row type (§11), and `bare` for a renderer
 * that draws its own labelled row (a popover trigger already is one, spacing
 * included) so the label is not printed twice.
 */
import ModuleOptionRow from './ModuleOptionRow';

/**
 * The rows of one group this panel can actually draw, for the current draft.
 *
 * Two filters, and they are different things. A row the panel has no control for
 * is dropped permanently — that is the "a filter cannot conjure a control" rule.
 * A control with a `when` predicate is dropped only for THIS draft: it is how a
 * panel expresses a row that depends on another row's value. Dropping rather than
 * disabling, because a control for a thing that does not exist is not a disabled
 * control, it is a wrong one.
 *
 * @param {Object} group    Localized group.
 * @param {Object} controls The panel's control map.
 * @param {Object} draft    Current draft, for `when` predicates.
 * @return {Array<Object>} Renderable rows.
 */
function renderableRows( group, controls, draft ) {
	return ( group?.rows || [] ).filter( ( row ) => {
		const control = controls[ row?.key ];
		return !! control && ( ! control.when || control.when( draft ) );
	} );
}

/**
 * @param {Object}   props
 * @param {Object}   props.panel     Localized panel copy (`groups`).
 * @param {Object}   props.controls  Row key → descriptor (`type`, `bare`, `when`, bounds …).
 * @param {Object}   props.renderers Descriptor `type` → component.
 * @param {Object}   props.draft     Current draft.
 * @param {Function} props.set       Draft writer, `( key, value )`.
 * @param {Object}   props.defaults  Shipped values, for a row's reset.
 * @return {JSX.Element} Body.
 */
export default function ModuleOptionGroups( {
	panel,
	controls,
	renderers,
	draft,
	set,
	defaults,
} ) {
	const groups = ( panel.groups || [] ).filter(
		( group ) => !! renderableRows( group, controls, draft ).length
	);

	return (
		<>
			{ groups.map( ( group, index ) => (
				<div className="sp-shaped-gallery-module-panel__group" key={ group.title || index }>
					{ index > 0 && (
						<span
							className="sp-shaped-gallery-module-panel__divider"
							role="presentation"
						/>
					) }
					{ !! group.title && (
						<h3 className="sp-shaped-gallery-module-panel__group-title">
							{ group.title }
						</h3>
					) }

					{ renderableRows( group, controls, draft ).map( ( row ) => {
						const control = controls[ row.key ];
						const Control = renderers[ control.type ];

						if ( ! Control ) {
							return null;
						}

						const props = { row, control, draft, set, defaults };

						// A `bare` renderer draws its own labelled row, so it is not
						// wrapped in one.
						if ( control.bare ) {
							return <Control key={ row.key } { ...props } />;
						}

						return (
							<ModuleOptionRow
								key={ row.key }
								label={ row.label }
								help={ row.help }
							>
								<Control { ...props } />
							</ModuleOptionRow>
						);
					} ) }
				</div>
			) ) }
		</>
	);
}

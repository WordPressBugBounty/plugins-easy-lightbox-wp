/**
 * One row inside a module panel — the design's "Modules Option / Smart Input
 * Field" and "Toggle & Title" instances, which are the same two-column shape: the
 * option's name (plus an optional info affordance) on the left, its control on the
 * right, and 16px below.
 *
 * The visible name is rendered here, and every control the panel puts in the right
 * column ALSO carries the same string as its own hidden label — the pattern the
 * Advanced Controls rows already use, so the control keeps an accessible name of
 * its own rather than depending on proximity.
 *
 * The info glyph is a real `<button>`, not a decorated span: it is the only thing
 * that carries the help text, so it has to be reachable by keyboard and to have an
 * accessible name. Core's `Tooltip` supplies the hover/focus bubble.
 */
import { Tooltip } from '@wordpress/components';
import { InfoIcon } from '@shaped-gallery/icons';

/**
 * @param {Object} props
 * @param {string} props.label    Option name, shown in the left column.
 * @param {string} [props.help]   Help text; renders the info affordance when set.
 * @param {Node}   props.children The control.
 * @return {JSX.Element} Row.
 */
export default function ModuleOptionRow( { label, help = '', children } ) {
	return (
		<div className="sp-shaped-gallery-module-panel__row">
			<div className="sp-shaped-gallery-module-panel__row-label">
				<span className="sp-shaped-gallery-module-panel__row-title">{ label }</span>
				{ !! help && (
					<Tooltip text={ help }>
						<button
							type="button"
							className="sp-shaped-gallery-module-panel__row-help"
							aria-label={ help }
						>
							<InfoIcon />
						</button>
					</Tooltip>
				) }
			</div>
			<div className="sp-shaped-gallery-module-panel__row-control">{ children }</div>
		</div>
	);
}

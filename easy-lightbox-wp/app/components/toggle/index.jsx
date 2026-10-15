/**
 * Toggle — labelled wrapper over the core `ToggleControl` with the brand accent.
 *
 * Dual contract: pass `checked` + `onChange` for a custom/nested boolean write,
 * OR `attributes` (current bool) + `attributesKey` + `setAttributes` for a
 * top-level attribute.
 *
 * `hideLabel` keeps the label in the DOM — it is what gives the switch its
 * accessible name — but takes it out of the visual flow, for layouts that already
 * show the name themselves (a settings row with its own title and description).
 *
 * `onlyPro` is WP Carousel Free's locked switch row: the label dimmed with a green
 * "(Pro)" link after it, the switch drawn OFF and disabled. The lock is the
 * handler, not the styling — it never calls `onChange` or `setAttributes`, so a
 * locked row cannot write a value however it is reached (keyboard, a stale
 * `disabled`, devtools). The switch keeps the label as its accessible name.
 *
 * @param {Object}   props
 * @param {string}   props.label           Toggle label.
 * @param {boolean}  [props.checked]       Current state (overrides `attributes`).
 * @param {boolean}  [props.attributes]    Current state (attributesKey form).
 * @param {string}   [props.attributesKey] Attribute name to write.
 * @param {Function} [props.setAttributes] setAttributes.
 * @param {Function} [props.onChange]      Custom change handler.
 * @param {string}   [props.help]          Help text.
 * @param {boolean}  [props.hideLabel]     Render the label for screen readers only.
 * @param {boolean}  [props.onlyPro]       Draw the row as a locked Pro teaser.
 * @return {JSX.Element} Toggle.
 */
import { memo } from '@wordpress/element';
import { ToggleControl } from '@wordpress/components';
import ProTag from '../pro/ProTag';
import '../shared.scss';
import '../pro/editor.scss';

/** A locked row's change handler: deliberately nothing. */
const noop = () => {};

function Toggle( {
	label,
	checked,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	help,
	hideLabel = false,
	onlyPro = false,
} ) {
	if ( onlyPro ) {
		return (
			<div className="sp-shaped-gallery-toggle sp-shaped-gallery-cmp-mb is-pro is-label-hidden">
				<span className="sp-shaped-gallery-toggle__pro-label">
					<span className="sp-shaped-gallery-control__title" aria-hidden="true">
						{ label }
					</span>
					<ProTag />
				</span>
				<ToggleControl
					label={ label }
					checked={ false }
					disabled
					onChange={ noop }
					help={ help }
					__nextHasNoMarginBottom
				/>
			</div>
		);
	}

	const value = checked !== undefined ? checked : !! attributes;
	const setValue = ( next ) =>
		onChange ? onChange( next ) : setAttributes( { [ attributesKey ]: next } );

	return (
		<div
			className={ `sp-shaped-gallery-toggle sp-shaped-gallery-cmp-mb${
				hideLabel ? ' is-label-hidden' : ''
			}` }
		>
			<ToggleControl
				label={ label }
				checked={ !! value }
				onChange={ setValue }
				help={ help }
				__nextHasNoMarginBottom
			/>
		</div>
	);
}

export default memo( Toggle );

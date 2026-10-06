/**
 * ResetButton — icon button that restores a control to its default value.
 * Rendered by the responsive controls (RangeControl, ComponentTopSection) only
 * when the current value differs from the default.
 *
 * @param {Object}   props
 * @param {Function} props.onClick Reset handler.
 * @param {string}   [props.label] Accessible label.
 * @return {JSX.Element} Button.
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ResetIcon } from '@shaped-gallery/icons';
import '../shared.scss';

export default function ResetButton( { onClick, label = __( 'Reset to default', 'easy-lightbox-wp' ) } ) {
	return (
		<Button className="sp-shaped-gallery-reset" label={ label } showTooltip onClick={ onClick }>
			<ResetIcon />
		</Button>
	);
}

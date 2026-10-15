/**
 * ProTag — the green "(Pro)" marker after a locked control's label.
 *
 * The only live part of a locked row: the control beside it is disabled, so this
 * link is where the click goes. A real `<a>` (new tab) rather than a button with a
 * `window.open`, so it can be middle-clicked and copied like any other link.
 */
import { __ } from '@wordpress/i18n';
import { upgradeUrl } from './upgrade';
import './editor.scss';

/**
 * @return {JSX.Element} Tag.
 */
export default function ProTag() {
	const url = upgradeUrl();
	const text = __( '(Pro)', 'easy-lightbox-wp' );

	if ( ! url ) {
		return <span className="sp-shaped-gallery-pro-tag">{ text }</span>;
	}

	return (
		<a
			className="sp-shaped-gallery-pro-tag"
			href={ url }
			target="_blank"
			rel="noopener noreferrer"
			aria-label={ __( 'Available in Pro — upgrade (opens in a new tab)', 'easy-lightbox-wp' ) }
		>
			{ text }
		</a>
	);
}

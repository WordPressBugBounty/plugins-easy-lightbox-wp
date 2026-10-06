/**
 * Ready Patterns — the control a premium pattern gets in the free build.
 *
 * Shared by the card and the preview drawer because both need the identical
 * decision, and it is the decision rather than the markup that is easy to get
 * subtly wrong: a locked pattern gets a LINK, not a disabled Insert. A dimmed
 * button says "not now" and leaves the user nowhere to go, and the server
 * refuses the id either way ({@see PatternLibrary::import()}), so explaining
 * itself is the only thing this control can usefully do.
 *
 * The fallback matters. With no upgrade URL published it degrades to a disabled
 * button, because an anchor with no `href` is not focusable — it would vanish
 * from the tab order and read as decoration (§14).
 */
import { __ } from '@wordpress/i18n';
import { LockIcon } from './icons';
import { upgradeUrl } from './tier';

/**
 * @param {Object} props
 * @param {string} props.label Call to action, shown when an upgrade URL exists.
 * @return {JSX.Element} The locked control.
 */
export default function LockedCta( { label } ) {
	const url = upgradeUrl();

	if ( ! url ) {
		return (
			<button type="button" className="sp-shaped-patterns__insert-btn is-locked" disabled>
				{ __( 'Pro only', 'easy-lightbox-wp' ) }
				<LockIcon />
			</button>
		);
	}

	return (
		<a
			className="sp-shaped-patterns__insert-btn is-locked"
			href={ url }
			target="_blank"
			rel="noreferrer noopener"
		>
			{ label }
			<LockIcon />
		</a>
	);
}

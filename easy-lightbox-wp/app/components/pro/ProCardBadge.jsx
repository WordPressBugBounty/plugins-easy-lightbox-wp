/**
 * ProCardBadge — the small crown + "PRO" pill that marks a locked item at rest.
 *
 * Two placements:
 *
 *  - default: pinned to the top-right of a full-size layout picker card, with an
 *    "Upgrade to Pro" overlay that fades in over the WHOLE card — artwork and
 *    title — on hover/focus while the pill fades out, so there is one call to
 *    action at a time. The card clips it to its own rounded corners;
 *  - `isInline`: in a row's flow — the media modal's locked source rows, where it
 *    sits at the right edge. No overlay there: the row is a single line, so the
 *    pill itself turns into the call to action, its "PRO" swapping to "Upgrade"
 *    on hover/focus.
 *
 * Both use `ProBadge`'s small size, so a locked layout and a locked media source
 * carry the same mark, a step down from the Modules screen's full-size pill.
 *
 * Presentation only: it sits inside a `.sp-shaped-gallery-pro-locked` button, which
 * owns the click and the accessible name. Every part is hidden from assistive tech
 * for that reason, and the overlay's "button" is a styled `<span>` — a real button
 * nested in the card's would be invalid markup.
 */
import { __ } from '@wordpress/i18n';
import ProBadge from './ProBadge';
import './editor.scss';

/**
 * @param {Object}  props
 * @param {boolean} [props.isInline] In the row's flow, without the overlay.
 * @return {JSX.Element} Badge.
 */
export default function ProCardBadge( { isInline = false } ) {
	if ( isInline ) {
		return (
			<span className="sp-shaped-gallery-pro-card-badge is-inline" aria-hidden="true">
				<ProBadge isInline isSmall hoverLabel={ __( 'Upgrade', 'easy-lightbox-wp' ) } />
			</span>
		);
	}

	return (
		<>
			<span className="sp-shaped-gallery-pro-card-badge" aria-hidden="true">
				<ProBadge isInline isSmall />
			</span>
			<span className="sp-shaped-gallery-pro-card-overlay" aria-hidden="true">
				<span className="sp-shaped-gallery-pro-card-overlay__button">
					{ __( 'Upgrade to Pro', 'easy-lightbox-wp' ) }
				</span>
			</span>
		</>
	);
}

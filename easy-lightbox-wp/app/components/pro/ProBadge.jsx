/**
 * ProBadge — the crown + "PRO" pill.
 *
 * Two placements, both from WP Carousel Free's teaser UI:
 *
 *  - default: centred over a `.sp-shaped-gallery-pro-locked` card and revealed on
 *    hover/focus (the locked layout cards);
 *  - `isInline`: always visible, in flow — where a control would otherwise sit (the
 *    Modules page puts it in place of a Pro module's switch).
 *
 * `isSmall` is a step down in size, for marks that sit beside dense content rather
 * than in a card's control slot: the layout picker's corner and the media modal's
 * source rows (`ProCardBadge`).
 *
 * `hoverLabel` rolls the pill over when the surrounding locked control is hovered
 * or focused (the media source rows: crown + "PRO" → "Upgrade"), so the mark itself
 * says what a click does. Both faces are in the markup, stacked in one grid cell,
 * so the pill keeps one width through the swap and CSS alone animates it — no
 * state, no handlers. The crown belongs to the resting face and leaves with it.
 *
 * Always a `<span>`, never a link: every surface that shows it already owns the
 * click (the card is a `<button>` that opens the upgrade page, the Modules badge is
 * not interactive), and a link nested in a button is invalid markup that some
 * screen readers announce twice.
 */
import { __ } from '@wordpress/i18n';
import { ProCrownIcon } from '@shaped-gallery/icons';
import './editor.scss';

/**
 * @param {Object}  props
 * @param {string}  [props.label]      Pill text.
 * @param {boolean} [props.isInline]   In-flow, always-visible placement.
 * @param {boolean} [props.isSmall]    The smaller size.
 * @param {string}  [props.hoverLabel] Text shown while the locked control is hovered.
 * @return {JSX.Element} Badge.
 */
export default function ProBadge( {
	label = __( 'PRO', 'easy-lightbox-wp' ),
	isInline = false,
	isSmall = false,
	hoverLabel = '',
} ) {
	const classes = [ 'sp-shaped-gallery-pro-badge' ];
	if ( isInline ) {
		classes.push( 'is-inline' );
	}
	if ( isSmall ) {
		classes.push( 'is-small' );
	}
	if ( hoverLabel ) {
		classes.push( 'has-hover-label' );
	}

	return (
		<span className={ classes.join( ' ' ) }>
			<span className="sp-shaped-gallery-pro-badge__pill">
				{ hoverLabel ? (
					<span className="sp-shaped-gallery-pro-badge__roll">
						<span className="sp-shaped-gallery-pro-badge__label">
							<ProCrownIcon size={ isSmall ? 10 : 14 } />
							{ label }
						</span>
						<span className="sp-shaped-gallery-pro-badge__hover-label">{ hoverLabel }</span>
					</span>
				) : (
					<>
						<ProCrownIcon size={ isSmall ? 10 : 14 } />
						{ label }
					</>
				) }
			</span>
		</span>
	);
}

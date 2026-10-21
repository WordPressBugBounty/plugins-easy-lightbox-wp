/**
 * ProNotice — the inspector / drawer upsell, in WP Carousel Free's two shapes:
 *
 *  - `features[]` — a card: title, optional subtitle, a plain bulleted list of
 *    option names (the dot is CSS, so the list adds no icon noise) and a text-only "Upgrade to Pro" link. The whole body of a locked panel
 *    (`ProPanel`), or the closing note of a working inspector panel listing what
 *    that panel gains in Pro. The link is deliberately bare text — no crown, fill
 *    or border — so the note informs without competing with the panel's own
 *    controls for attention.
 *  - otherwise   — one closing line at the foot of a working panel: `message`
 *    followed by an "Upgrade to Pro!" link.
 *
 * `message` is always a whole sentence and the link text a second one, so the two
 * are never glued into one translatable fragment (§15).
 *
 * `showOffer` adds the current Pro offer to the card's link as a small "Up to N%
 * off" pill — the one piece of chrome the link carries, because it is information
 * (a price) rather than decoration. It sits INSIDE the link, so the line is one
 * click target and the offer is part of the link's accessible name. The block
 * inspector opts in; the dashboard's Lightbox drawer does not — on the dashboard
 * the offer is the bar above the header (`admin/components/OfferBar.jsx`), and a
 * drawer note repeating it would name the same discount twice on one screen. The
 * number and the moment the offer ends
 * come from the payload only (`useCurrentOffer()`); the pill leaves at that moment,
 * from an already-open card too, and there is no pill without a link to follow.
 *
 * Reads no attributes and writes nothing; every link opens in a new tab and says
 * so to assistive tech.
 */
import { __, sprintf } from '@wordpress/i18n';
import { VisuallyHidden } from '@wordpress/components';
import { noticeUrl } from './upgrade';
import useCurrentOffer from './useCurrentOffer';
import './editor.scss';

/**
 * The upgrade link, or its bare text when no URL was published.
 *
 * Its own payload key (`noticeUrl`), not the teasers' `upgradeUrl`: a click on an
 * inspector panel's note is counted apart from one on a locked card, and the
 * dashboard payload re-tags the same key for the Lightbox panel's note.
 *
 * @param {Object} props
 * @param {string} props.className Class.
 * @param {Node}   [props.badge]   Rendered after the text, inside the link only.
 * @param {Node}   props.children  Link text.
 * @return {JSX.Element} Link.
 */
function UpgradeLink( { className, badge = null, children } ) {
	const url = noticeUrl();

	if ( ! url ) {
		return <span className={ className }>{ children }</span>;
	}

	return (
		<a className={ className } href={ url } target="_blank" rel="noopener noreferrer">
			{ children }
			{ badge }
			<VisuallyHidden as="span">
				{ ' ' }
				{ __( '(opens in a new tab)', 'easy-lightbox-wp' ) }
			</VisuallyHidden>
		</a>
	);
}

/**
 * The offer pill, or null when there is no offer to name.
 *
 * Re-renders itself at the moment the offer ends (`useCurrentOffer()`), so an
 * editor left open across the cutoff drops the pill on time instead of at the
 * next reload.
 *
 * @return {(JSX.Element|null)} Pill.
 */
function OfferBadge() {
	const { percent } = useCurrentOffer();

	if ( ! percent ) {
		return null;
	}

	// The leading space keeps "Pro" and "Up" apart in the link's accessible name; as
	// a whitespace-only run between flex items it takes no room on screen.
	return (
		<>
			{ ' ' }
			<span className="sp-shaped-gallery-pro-notice__offer">
				{ sprintf(
					/* translators: %d: discount percentage for new customers, e.g. 75. */
					__( 'Up to %d%% off', 'easy-lightbox-wp' ),
					percent
				) }
			</span>
		</>
	);
}

/**
 * @param {Object}        props
 * @param {string}        [props.title]     Card title.
 * @param {string}        [props.subtitle]  Card lead-in.
 * @param {string}        [props.message]   Closing-line sentence.
 * @param {Array<string>} [props.features]  Card bullets; selects the card shape.
 * @param {string}        [props.linkText]  Link / button text.
 * @param {boolean}       [props.showOffer] Name the current Pro offer in the card's link.
 * @param {string}        [props.className] Extra classes.
 * @return {JSX.Element} Notice.
 */
export default function ProNotice( {
	title = __( 'Unlock Pro Features!', 'easy-lightbox-wp' ),
	subtitle = '',
	message = '',
	features = [],
	linkText,
	showOffer = false,
	className = '',
} ) {
	const root = `sp-shaped-gallery-pro-notice${ className ? ` ${ className }` : '' }`;

	if ( features.length ) {
		return (
			<div className={ `${ root } is-card` }>
				<p className="sp-shaped-gallery-pro-notice__title">{ title }</p>
				{ !! subtitle && <p className="sp-shaped-gallery-pro-notice__subtitle">{ subtitle }</p> }
				<ul className="sp-shaped-gallery-pro-notice__list">
					{ features.map( ( feature ) => (
						<li key={ feature }>{ feature }</li>
					) ) }
				</ul>
				<UpgradeLink
					className="sp-shaped-gallery-pro-notice__button"
					badge={ showOffer ? <OfferBadge /> : null }
				>
					<span className="sp-shaped-gallery-pro-notice__button-text">
						{ linkText || __( 'Upgrade to Pro', 'easy-lightbox-wp' ) }
					</span>
				</UpgradeLink>
			</div>
		);
	}

	return (
		<p className={ `${ root } is-inline` }>
			{ message }{ ' ' }
			<UpgradeLink className="sp-shaped-gallery-pro-notice__link">
				{ linkText || __( 'Upgrade to Pro!', 'easy-lightbox-wp' ) }
			</UpgradeLink>
		</p>
	);
}

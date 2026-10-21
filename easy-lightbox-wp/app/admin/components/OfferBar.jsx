/**
 * OfferBar — the full-bleed strip above the header that names the current Pro
 * offer, after the finalised top-banner design (variation 1k) the pricing page it
 * links to also carries.
 *
 * Two messages and an action on one centred line: the campaign's lead sentence, a
 * hairline, the offer itself, then "Get it now". The divider is decoration
 * (`aria-hidden`), so a screen reader hears two sentences, not a rule. Without a
 * lead, the hairline goes with it and the bar names the discount alone.
 *
 * Nothing here decides the offer, or words its lead. Both come from the payload
 * (`useCurrentOffer()`, fed by `DashboardConfig::pro_offer()`): the lead is a slug in
 * `PRO_OFFER`, translated in PHP, so a new campaign's wording ships with its
 * schedule rather than lingering here. The percent follows the same schedule
 * the inspector's pill and the plugins-screen "Go Pro" link read, so all three
 * stop naming a discount at the same moment — a dashboard left open across the
 * cutoff loses the bar then rather than at the next reload.
 *
 * No countdown. The pricing page's bar counts to its own deadline, and a second
 * clock here, running from a schedule shipped with the plugin, is a second date
 * for a user to compare against it. The bar names the offer and leaves when it
 * ends; the pricing page carries the terms.
 *
 * Renders nothing without a link to follow — a price claim the user cannot act
 * on has nothing behind it.
 */
import { __, sprintf } from '@wordpress/i18n';
import { createInterpolateElement } from '@wordpress/element';
import { offerUrl } from '@shaped-gallery/components/pro/upgrade';
import useCurrentOffer from '@shaped-gallery/components/pro/useCurrentOffer';
import ExternalLink from './ExternalLink';

/**
 * @return {(JSX.Element|null)} Offer bar, or null when there is no offer to name.
 */
export default function OfferBar() {
	const { percent, lead } = useCurrentOffer();
	const url = offerUrl();

	if ( ! percent || ! url ) {
		return null;
	}

	return (
		<div className="sp-shaped-gallery-dash-offer">
			<div className="sp-shaped-gallery-dash-offer__inner">
				{ lead && (
					<>
						<span className="sp-shaped-gallery-dash-offer__access">
							<span className="sp-shaped-gallery-dash-offer__dot" aria-hidden="true" />
							<span>{ createInterpolateElement( lead, { strong: <strong /> } ) }</span>
						</span>

						<span className="sp-shaped-gallery-dash-offer__divider" aria-hidden="true" />
					</>
				) }

				<span className="sp-shaped-gallery-dash-offer__deal">
					{ createInterpolateElement(
						sprintf(
							/* translators: %d: discount percentage for new customers, e.g. 75. Keep the <small> tags around "up to" and the <strong> tags around the discount. */
							__( '<small>up to</small> <strong>%d%% off</strong> lifetime offer', 'easy-lightbox-wp' ),
							percent
						),
						{ small: <small />, strong: <strong /> }
					) }
				</span>

				<ExternalLink href={ url } className="sp-shaped-gallery-dash-offer__button" showIcon={ false }>
					{ __( 'Get it now', 'easy-lightbox-wp' ) }
				</ExternalLink>
			</div>
		</div>
	);
}

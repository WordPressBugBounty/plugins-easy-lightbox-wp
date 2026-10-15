/**
 * Where every upgrade prompt points.
 *
 * One URL, decided in PHP (`DashboardConfig::pro_url()`) and published on the shared
 * payload as `upgradeUrl` by `Core\Assets::localize_data()`, which both the block
 * editor (`shaped_gallery_data`) and the dashboard (`shaped_gallery_admin`) receive.
 * Nothing in `app/` spells the URL out, so it cannot drift between surfaces — the
 * failure WP Carousel Free's teaser UI has, with the same pricing link hard-coded in
 * several files.
 *
 * Empty when the payload failed to print. Callers degrade to a link-less label then
 * rather than an `href=""` that reloads the editor.
 */

/**
 * The upgrade URL, or '' when none was published.
 *
 * @return {string} URL.
 */
export function upgradeUrl() {
	const data = window.shaped_gallery_data || window.shaped_gallery_admin || {};
	return typeof data.upgradeUrl === 'string' ? data.upgradeUrl : '';
}

/** What `currentOffer()` returns when there is no offer to name. */
const NO_OFFER = Object.freeze( { percent: 0, endsAt: 0, lead: '' } );

/**
 * A payload number as an integer, or NaN. Only numbers and numeric strings count,
 * so `true` cannot pass as 1.
 *
 * @param {*} raw Payload value.
 * @return {number} Integer, or NaN.
 */
function wholeNumber( raw ) {
	const value = 'number' === typeof raw || 'string' === typeof raw ? Number( raw ) : NaN;
	return Number.isInteger( value ) ? value : NaN;
}

/**
 * The current Pro offer, held against the viewer's clock.
 *
 * Decided in PHP (`DashboardConfig::pro_offer()`), which drops the offer once it
 * has ended, and published as `proOffer` on the same shared payload as the URL, so
 * no file in `app/` spells a discount out. PHP only decides when the page loads, so
 * the end (`endsAt`, Unix seconds) is checked again here: an editor left open
 * across the cutoff loses the badge then, not at the next reload. A wrong client
 * clock can only hide it early — the server already refused an ended offer.
 *
 * Fails closed: a percent outside 1–99, or an `endsAt` that is present but not a
 * positive whole number, reads as no offer. `lead` is the sentence the dashboard's
 * offer bar opens with, already translated by PHP (`DashboardConfig::offer_leads()`);
 * anything but non-blank text reads as no lead, never as no offer.
 *
 * @param {number} [now] Milliseconds since the epoch; defaults to the clock.
 * @return {{percent:number, endsAt:number, lead:string}} `endsAt` in milliseconds, 0 for no end; `percent` 0 for no offer; `lead` '' for none.
 */
export function currentOffer( now = Date.now() ) {
	const data = window.shaped_gallery_data || window.shaped_gallery_admin || {};
	const offer = data.proOffer || {};
	const percent = wholeNumber( offer.percent );
	const lead = 'string' === typeof offer.lead && offer.lead.trim() ? offer.lead : '';

	if ( ! ( percent > 0 && percent < 100 ) ) {
		return NO_OFFER;
	}

	if ( undefined === offer.endsAt ) {
		return { percent, endsAt: 0, lead };
	}

	const endsAt = wholeNumber( offer.endsAt ) * 1000;

	return endsAt > 0 && now < endsAt ? { percent, endsAt, lead } : NO_OFFER;
}

/**
 * Open the upgrade page in a new tab — never in this one, so an unsaved post or an
 * unsaved settings draft is not navigated away from.
 *
 * @return {void}
 */
export function openUpgrade() {
	const url = upgradeUrl();
	if ( url ) {
		window.open( url, '_blank', 'noopener,noreferrer' );
	}
}

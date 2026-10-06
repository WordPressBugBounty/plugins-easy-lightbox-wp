/**
 * Ready Patterns — which patterns this build may insert.
 *
 * The catalogue is one list served to both builds: every row carries a `pro`
 * flag, and the free build shows the premium ones as locked teasers rather than
 * hiding them — the same treatment `app/picker/layouts.data.js` gives a `pro`
 * layout, and the reason the manifest ships them at all.
 *
 * This module is the ONLY place the editor decides that. The enforcement is on
 * the server ({@see PatternLibrary::import()}), which refuses a premium id
 * outright; everything here is presentation, so that a user sees why a button is
 * a link instead of watching an insert fail.
 *
 * A separate module rather than two more exports on `index.js`: `index.js`
 * imports `Library`, and `Library` needs these — putting them there would make
 * that a cycle.
 */

/**
 * Whether the premium build is active on this site.
 *
 * **This flag defaults CLOSED, unlike every other module read in the plugin.**
 * `readyPatternsEnabled` and its siblings (§6.9) default OPEN when the localize
 * payload is absent, because there the render-side gate is the enforcement and a
 * stale editor showing a dead control is the only failure mode. Here the
 * asymmetry is deliberate: an absent flag must not unlock premium content, and
 * since the server refuses the import anyway, defaulting open would only buy the
 * user an Insert button that reports a failure.
 *
 * @return {boolean} Whether premium patterns are available.
 */
export function isPremium() {
	return !! window.shaped_gallery_data?.patternsPremium;
}

/**
 * Where a locked card's call to action points.
 *
 * @return {string} Upgrade URL, or '' when none was published.
 */
export function upgradeUrl() {
	return window.shaped_gallery_data?.patternsUpgradeUrl || '';
}

/**
 * Whether one pattern is out of reach on this site.
 *
 * @param {Object} pattern Manifest row.
 * @return {boolean} Whether to draw the upgrade CTA in place of Insert.
 */
export function isLocked( pattern ) {
	return !! pattern?.pro && ! isPremium();
}

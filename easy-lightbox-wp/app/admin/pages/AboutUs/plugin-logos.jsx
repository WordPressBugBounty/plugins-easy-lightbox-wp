/**
 * Brand marks for the sibling products the About Us grid cross-sells.
 *
 * Only the marks the company's own site does not publish as a standalone icon live
 * here. Every other product's mark is a `logo` URL on that site (see
 * DashboardConfig::other_plugins()), so it follows the site when a mark is redrawn
 * instead of drifting in a bundled copy.
 *
 * Reno Product Category is the one such mark: shapedplugin.com ships it only inside
 * the product's horizontal lockup, so the basket is lifted out of that SVG (its two
 * gradient paths, unchanged) rather than redrawn by hand.
 *
 * Gradient ids are prefixed. An `id` inside an inline SVG is global to the
 * document, so an unprefixed one would collide with the sibling's own markup if both
 * ever rendered on one screen.
 */

/* eslint-disable max-len */

/**
 * @return {JSX.Element} Reno Product Category.
 */
export const RenoProductCategoryGlyph = () => (
	<svg width="48" height="48" viewBox="0 0 39.25 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
		<path d="M36.742 10.6165H32.7119L25.4802 0.713108C24.9153 -0.075317 23.823 -0.229156 23.0508 0.347741L22.806 0.540039C22.0339 1.11694 21.8832 2.23227 22.4482 3.0207L28.0038 10.6357H11.9586L17.5141 3.0207C18.0791 2.23227 17.9284 1.13617 17.1563 0.540039L16.9115 0.347741C16.1394 -0.229156 15.0659 -0.075317 14.4821 0.713108L7.25047 10.6165H3.258C1.46893 10.6165 0 12.0972 0 13.9433V15.5009C0 16.0778 0.451977 16.5393 1.01695 16.5393H3.12618L7.06215 33.327C7.30697 34.3077 8.15443 35 9.15254 35H30.8663C31.8644 35 32.7119 34.3077 32.9379 33.327L36.8738 16.5393H38.9831C39.548 16.5393 40 16.0778 40 15.5009V13.9433C40 12.1164 38.5499 10.6165 36.742 10.6165ZM19.5669 27.3465C19.5669 28.2888 18.8136 29.058 17.8908 29.058H15.5744C14.6516 29.058 13.8983 28.2888 13.8983 27.3465V24.9812C13.8983 24.039 14.6516 23.2698 15.5744 23.2698H17.8908C18.8136 23.2698 19.5669 24.039 19.5669 24.9812V27.3465ZM19.5669 20.6353C19.5669 21.5775 18.8136 22.3467 17.8908 22.3467H15.5744C14.6516 22.3467 13.8983 21.5775 13.8983 20.6353V18.27C13.8983 17.3277 14.6516 16.5585 15.5744 16.5585H17.8908C18.8136 16.5585 19.5669 17.3277 19.5669 18.27V20.6353ZM23.3333 29.058C21.7702 29.058 20.5085 27.7696 20.5085 26.1735C20.5085 24.5774 21.7702 23.289 23.3333 23.289C24.8964 23.289 26.1582 24.5774 26.1582 26.1735C26.1582 27.7696 24.8964 29.058 23.3333 29.058ZM26.1582 20.6353C26.1582 21.5775 25.4049 22.3467 24.4821 22.3467H22.1657C21.2429 22.3467 20.4896 21.5775 20.4896 20.6353V18.27C20.4896 17.3277 21.2429 16.5585 22.1657 16.5585H24.4821C25.4049 16.5585 26.1582 17.3277 26.1582 18.27V20.6353Z" fill="url(#shapedRenoCategoryMark0)" />
		<path d="M21.3936 26.1736C21.3936 25.0774 22.2598 24.1929 23.3333 24.1929C24.4067 24.1929 25.273 25.0774 25.273 26.1736C25.273 27.2697 24.4067 28.1542 23.3333 28.1542C22.2598 28.1542 21.3936 27.2697 21.3936 26.1736Z" fill="url(#shapedRenoCategoryMark1)" />
		<defs>
			<linearGradient id="shapedRenoCategoryMark0" x1="0" y1="17.5008" x2="39.2467" y2="17.5008" gradientUnits="userSpaceOnUse">
				<stop stopColor="#922968" />
				<stop offset="0.9" stopColor="#CA2B5E" />
			</linearGradient>
			<linearGradient id="shapedRenoCategoryMark1" x1="0.828584" y1="26.1735" x2="39.2467" y2="26.1735" gradientUnits="userSpaceOnUse">
				<stop stopColor="#922968" />
				<stop offset="0.9" stopColor="#CA2B5E" />
			</linearGradient>
		</defs>
	</svg>
);

/* eslint-enable max-len */

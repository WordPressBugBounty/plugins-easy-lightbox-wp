/**
 * About Us glyphs — one arrow, used at two sizes and two colours.
 *
 * The design draws the same mark on the "More About Us" button and on a plugin
 * card's hover affordance, differing only in colour, so it is one component taking
 * its colour from `currentColor`.
 */

/**
 * @return {JSX.Element} Diagonal "opens elsewhere" arrow.
 */
export const ArrowUpRightIcon = () => (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		focusable="false"
	>
		<path
			d="M5.39024 5.38208L5.44721 6.98286L12.1552 6.73768L4.49121 14.4018L5.62279 15.5328L13.2886 7.86683L13.0432 14.5785L14.6434 14.6355L14.9931 5.03369L5.39024 5.38208Z"
			fill="currentColor"
		/>
	</svg>
);

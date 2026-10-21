/**
 * Ready Patterns — the glyphs only this feature draws.
 *
 * Deliberately local rather than added to `@shaped-gallery/icons`: that barrel is
 * imported by both React bundles, and an icon with one consumer belongs beside
 * it. The device trio in particular MUST live here — the barrel's
 * Desktop/Tablet/Mobile are the inspector's 12–14px filled glyphs, drawn for a
 * responsive switcher inside a control row, while the preview drawer's switcher
 * is the reference library's 24px outline set drawn in a 48px tab. Two different
 * drawings for two different sizes; overwriting the barrel's would change every
 * responsive control in the plugin.
 *
 * Every path below is byte-for-byte the reference implementation's
 * (`testimonial-pro/app/ready-patterns/Icons.jsx`), which is the source of truth
 * for this modal's design. `LockIcon` is the one addition — the reference ships
 * no free tier, so it has no locked call to action to draw.
 *
 * Where the reference uses a dashicon rather than an SVG (search, heart toggle,
 * refresh, preview eye, close), so do the consumers here: the sizing rules in
 * `editor.scss` are written against dashicons' font metrics.
 */

/**
 * @param {Object} props
 * @param {string} [props.fill] Path fill.
 * @return {JSX.Element} Close cross, drawn in the preview drawer's header.
 */
export const CloseIcon = ( { fill = 'currentColor' } ) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="13"
		height="13"
		viewBox="0 0 13 13"
		fill="none"
		aria-hidden="true"
	>
		<path
			d="M6.36397 7.77819L11.3137 12.7279L12.7279 11.3137L7.77819 6.36397L12.7279 1.41423L11.3137 1.1603e-05L6.36397 4.94976L1.41421 0L0 1.41421L4.94976 6.36397L1.18415e-05 11.3137L1.41423 12.7279L6.36397 7.77819Z"
			fill={ fill }
		/>
	</svg>
);

/* Preview-width switcher icons — outline style, drawn at 24px in the 48px tab. */

/**
 * @return {JSX.Element} Desktop preview width.
 */
export const DesktopIcon = () => (
	<svg width={ 24 } height={ 24 } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<g clipPath="url(#ShapedPatternsDesktopIcon)">
			<path
				d="M22 1H2C.897 1 0 1.897 0 3v14c0 1.103.897 2 2 2h7.002c-.02.798-.173 2.074-.745 2.676A.98.98 0 0 1 7.5 22a.5.5 0 1 0 0 1h9a.5.5 0 1 0 0-1 .98.98 0 0 1-.756-.323c-.57-.6-.724-1.878-.746-2.677H22c1.103 0 2-.897 2-2V3c0-1.103-.898-2-2-2M12 18.003a1.004 1.004 0 0 1 0-2.006 1.004 1.004 0 0 1 0 2.006M2 15V3h20v12z"
				fill="currentColor"
			/>
		</g>
		<defs>
			<clipPath id="ShapedPatternsDesktopIcon">
				<path fill="#fff" d="M0 0h24v24H0z" />
			</clipPath>
		</defs>
	</svg>
);

/**
 * @return {JSX.Element} Tablet preview width.
 */
export const TabletIcon = () => (
	<svg width={ 24 } height={ 24 } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M19.152 0H4.85c-.902 0-1.627.73-1.627 1.63v20.74c0 .899.725 1.63 1.627 1.63h14.302a1.63 1.63 0 0 0 1.628-1.63V1.63C20.782.73 20.052 0 19.152 0m-7.15 23.39A.967.967 0 1 1 12 21.454a.967.967 0 0 1 .002 1.934m7.131-2.785H4.87V1.959h14.263z"
			fill="currentColor"
		/>
	</svg>
);

/**
 * @return {JSX.Element} Mobile preview width.
 */
export const MobileIcon = () => (
	<svg width={ 24 } height={ 24 } viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M17.048 0H6.95c-.967 0-1.747.784-1.747 1.748v20.505c0 .964.78 1.747 1.747 1.747h10.098c.964 0 1.746-.783 1.746-1.747V1.749C18.794.784 18.012 0 17.047 0M9.506 1.062h4.985c.126 0 .228.188.228.42 0 .233-.102.422-.228.422H9.507c-.127 0-.227-.189-.227-.422s.1-.42.227-.42m2.492 21.213a1.115 1.115 0 1 1 0-2.23 1.115 1.115 0 0 1 0 2.23m5.487-3.822H6.512V2.95h10.974z"
			fill="currentColor"
		/>
	</svg>
);

/**
 * @return {JSX.Element} Two-column grid density glyph.
 */
export const GridTwoColIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		aria-hidden="true"
		focusable="false"
	>
		<rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" />
		<rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor" />
		<rect x="3" y="13" width="8" height="8" rx="1" fill="currentColor" />
		<rect x="13" y="13" width="8" height="8" rx="1" fill="currentColor" />
	</svg>
);

/**
 * @return {JSX.Element} Three-column grid density glyph.
 */
export const GridThreeColIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		aria-hidden="true"
		focusable="false"
	>
		<rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="9" y="2" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="16" y="2" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="2" y="9" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="16" y="9" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="2" y="16" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="9" y="16" width="6" height="6" rx="1" fill="currentColor" />
		<rect x="16" y="16" width="6" height="6" rx="1" fill="currentColor" />
	</svg>
);

/**
 * @return {JSX.Element} Outline heart — a card that is not favourited.
 */
export const HeartIcon = () => (
	<svg
		width="34"
		height="24"
		viewBox="0 0 20 20"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M10 17.5l-1.45-1.32C4.4 12.36 2 10.28 2 7.5 2 5.42 3.42 4 5.5 4c1.54 0 3.04 1 3.57 2.36h1.87C11.46 5 12.96 4 14.5 4 16.58 4 18 5.42 18 7.5c0 2.78-2.4 4.86-6.55 8.68L10 17.5z"
			fill="none"
		/>
	</svg>
);

/**
 * @return {JSX.Element} Filled heart — a favourited card.
 */
export const HeartIconFull = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="23"
		height="21"
		viewBox="0 0 23 21"
		fill="currentColor"
		aria-hidden="true"
	>
		<path
			d="M20.2913 2.61183C19.7805 2.10083 19.1741 1.69547 18.5066 1.41891C17.8392 1.14235 17.1238 1 16.4013 1C15.6788 1 14.9634 1.14235 14.2959 1.41891C13.6285 1.69547 13.022 2.10083 12.5113 2.61183L11.4513 3.67183L10.3913 2.61183C9.3596 1.58013 7.96032 1.00053 6.50129 1.00053C5.04226 1.00053 3.64298 1.58013 2.61129 2.61183C1.5796 3.64352 1 5.04279 1 6.50183C1 7.96086 1.5796 9.36013 2.61129 10.3918L11.4513 19.2318L20.2913 10.3918C20.8023 9.88107 21.2076 9.27464 21.4842 8.60718C21.7608 7.93972 21.9031 7.22431 21.9031 6.50183C21.9031 5.77934 21.7608 5.06393 21.4842 4.39647C21.2076 3.72901 20.8023 3.12258 20.2913 2.61183Z"
			fill="currentColor"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

/**
 * @return {JSX.Element} Download tray — the Insert / Import call to action.
 */
export const DownloadIcon = () => (
	<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
		<path d="M1.25 12.667V10C1.25 9.58579 1.58579 9.25 2 9.25C2.41421 9.25 2.75 9.58579 2.75 10V12.667C2.75009 12.8216 2.81158 12.9698 2.9209 13.0791C3.03022 13.1884 3.17842 13.2499 3.33301 13.25H12.667C12.8216 13.2499 12.9698 13.1884 13.0791 13.0791C13.1884 12.9698 13.2499 12.8216 13.25 12.667V10C13.25 9.58579 13.5858 9.25 14 9.25C14.4142 9.25 14.75 9.58579 14.75 10V12.667C14.7499 13.2194 14.5303 13.749 14.1396 14.1396C13.749 14.5303 13.2194 14.7499 12.667 14.75H3.33301C2.78059 14.7499 2.25098 14.5303 1.86035 14.1396C1.46973 13.749 1.25009 13.2194 1.25 12.667Z" />
		<path d="M10.8037 6.13764C11.0966 5.84491 11.5714 5.8448 11.8642 6.13764C12.1569 6.43049 12.1569 6.90533 11.8642 7.19819L8.53022 10.5312C8.23732 10.8241 7.76256 10.8241 7.46967 10.5312L4.13666 7.19819C3.84377 6.90529 3.84377 6.43053 4.13666 6.13764C4.42956 5.84475 4.90432 5.84475 5.19721 6.13764L7.99994 8.94037L10.8037 6.13764Z" />
		<path d="M7.25 10V2C7.25 1.58579 7.58579 1.25 8 1.25C8.41421 1.25 8.75 1.58579 8.75 2V10C8.75 10.4142 8.41421 10.75 8 10.75C7.58579 10.75 7.25 10.4142 7.25 10Z" />
	</svg>
);

/**
 * @return {JSX.Element} Padlock, drawn on a premium pattern's CTA in the free
 *                       build. Paired with a word rather than standing alone: a
 *                       lock glyph is not a label, and §14 forbids carrying
 *                       meaning in an icon nothing names.
 */
export const LockIcon = () => (
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
		<rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
		<path
			d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7"
			stroke="currentColor"
			strokeWidth="1.4"
			strokeLinecap="round"
		/>
	</svg>
);

/* ---- Preview-footer navigation ------------------------------------------- */

/**
 * @return {JSX.Element} Small chevron, drawn beside the preview footer's Prev
 *                       label at the live library's 8x12. Stroked rather than
 *                       filled: at this size a filled chevron loses its point to
 *                       hinting.
 */
export const ChevronLeftIcon = () => (
	<svg
		width="8"
		height="12"
		viewBox="0 0 8 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		focusable="false"
	>
		<path
			d="M6.5 1.5L2 6L6.5 10.5"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

/**
 * @return {JSX.Element} The Prev chevron mirrored — drawn beside the preview
 *                       footer's Next label.
 */
export const ChevronRightIcon = () => (
	<svg
		width="8"
		height="12"
		viewBox="0 0 8 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		focusable="false"
	>
		<path
			d="M1.5 1.5L6 6L1.5 10.5"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

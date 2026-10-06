/**
 * Crisp live chat loader.
 *
 * The script is injected from JS rather than printed by PHP so it can only ever
 * load where the dashboard SPA actually mounts — one admin screen, behind the
 * `manage_options` gate — and only when a website id is configured. With no id
 * (the default) nothing is requested at all.
 *
 * Crisp is configured through two globals it reads on boot, which is why they are
 * set before the script tag is appended.
 */

const CRISP_SRC = 'https://client.crisp.chat/l.js';

/**
 * Load Crisp once.
 *
 * Idempotent: a second call while Crisp is present is a no-op, so a React
 * re-mount cannot end up with two launchers.
 *
 * @param {string} websiteId Crisp website id (a UUID, validated server-side).
 * @return {boolean} Whether Crisp is now loading or already loaded.
 */
export function initCrisp( websiteId ) {
	if ( ! websiteId ) {
		return false;
	}

	if ( window.$crisp ) {
		return true;
	}

	window.$crisp = [];
	window.CRISP_WEBSITE_ID = websiteId;

	const script = document.createElement( 'script' );
	script.src = CRISP_SRC;
	script.async = true;
	document.head.appendChild( script );

	return true;
}

/**
 * Open the chat window, if Crisp has booted.
 *
 * @return {void}
 */
export function openCrisp() {
	if ( ! window.$crisp ) {
		return;
	}
	window.$crisp.push( [ 'do', 'chat:open' ] );
}

<?php
/**
 * What the plugin tells a visitor's BROWSER to keep.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Core;

use ShapedPlugin\ShapedGallery\Includes\Functions;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Settings → Advanced Controls → **Enable Browser Caching** (`browserCaching`,
 * default ON).
 *
 * The mirror image of {@see GalleryCache}: that one decides how long the SERVER
 * keeps its own data, this one decides what the CLIENT is allowed to keep. Two
 * settings, two classes, so neither has to be read to understand the other.
 *
 * **What it can actually reach, and why the mechanism is what it is.** The plugin's
 * stylesheets and scripts are static files served by Apache/nginx, not by PHP, so no
 * amount of `header()` can change how they are cached — the only lever PHP holds is
 * the `?ver=` query string, which decides whether a repeat visit reuses the copy the
 * browser already has or requests a new URL. So:
 *
 * - **ON** — every handle keeps a version that changes only when its bytes change
 *   (webpack's content hash for scripts, file mtime for stylesheets), which is the
 *   strongest cacheable form: one URL per build, reused for as long as the server's
 *   own expiry rules allow.
 * - **OFF** — every handle gets {@see self::bust_token()} instead, a value that moves
 *   with the request, so each page view asks for a URL the browser has never seen.
 *   Nothing of the plugin's is served from cache.
 *
 * Only the plugin's own two version helpers read this, so a core or third-party
 * handle can never be caught by it — the promise the panel's copy makes ("Only
 * affects plugin assets").
 *
 * Known limit, inherent rather than fixable: on a page-cached site the HTML carrying
 * the bust token is itself cached, so the token freezes for as long as that page
 * does. Turning the setting off is a troubleshooting lever, not a guarantee.
 *
 * `/gallery-page` is deliberately out of scope. It is an API response, not an asset;
 * core already sends no-cache headers there for logged-in users, and making a
 * pagination window browser-cacheable would trade a stale back-button for nothing.
 */
class BrowserCache {

	/**
	 * Prefix on a busting version, so the value is recognisable in a URL and can
	 * never collide with a real version string or content hash.
	 *
	 * @var string
	 */
	const BUST_PREFIX = 'rg';

	/**
	 * The busting token for THIS request, once resolved.
	 *
	 * @var string|null
	 */
	private static ?string $token = null;

	/**
	 * Whether the plugin's assets may be cached by the browser.
	 *
	 * Deliberately not memoized: `shaped_gallery_settings` is an autoloaded option, so
	 * this is an array read, and a cached bool would be one more thing to reset in a
	 * request that saves the setting.
	 *
	 * A missing key defaults to TRUE — the shipped value, and the one that costs a
	 * visitor nothing if the option row is somehow incomplete. `rest_sanitize_boolean()`
	 * because a row written by WP-CLI can hold `'0'` or `'false'`, which are both
	 * truthy to a bare cast.
	 *
	 * @return bool
	 */
	public static function is_enabled(): bool {
		$raw = Functions::get_setting( 'browserCaching', true );

		/**
		 * Filter whether the plugin's own assets may be browser-cached.
		 *
		 * @since 1.0.0
		 *
		 * @param bool $enabled Whether caching is enabled.
		 */
		return (bool) apply_filters( 'shaped_gallery_browser_caching', rest_sanitize_boolean( $raw ) );
	}

	/**
	 * A version string that changes with the request, so nothing is reused.
	 *
	 * Resolved once and held for the rest of the request: every handle on one page
	 * then shares a token, which keeps the markup readable and means two assets can
	 * never straddle a tick of the clock and produce two different tokens on one page.
	 *
	 * @return string
	 */
	public static function bust_token(): string {
		if ( null === self::$token ) {
			self::$token = self::BUST_PREFIX . (string) time();
		}

		return self::$token;
	}

	/**
	 * Headers that forbid storing a response, for the one thing the plugin streams.
	 *
	 * `no-store` is the directive that actually prevents a copy being kept;
	 * `no-cache, must-revalidate, max-age=0` and the HTTP/1.0 `Pragma` are there for
	 * intermediaries that predate it or honour only part of it.
	 *
	 * @return array<string,string> Header name => value.
	 */
	public static function no_store_headers(): array {
		return array(
			'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
			'Pragma'        => 'no-cache',
		);
	}
}

<?php
/**
 * Provider embed URL allow-list.
 *
 * @package ShapedPlugin\ShapedGallery
 * @since   1.2.1
 */

namespace ShapedPlugin\ShapedGallery\Render;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Decides whether a stored provider URL may be framed.
 *
 * A YouTube item stores its player URL in `items[].full`, and the front-end runtime
 * hands that string to an `<iframe src>`. The block attribute is author-writable and
 * nothing re-checks it between the editor and the page, so without this gate an item
 * carrying `javascript:alert(1)` (or a plain `https://attacker.example/`) under a
 * provider id would run, or frame, whatever it names. The editor only ever builds URLs
 * on the hosts below, so an allow-list costs a legitimate gallery nothing.
 *
 * The same provider → host map lives in `app/frontend/embeds.js`
 * (`EMBED_PARAMS[ provider ].hosts`); `verify-embed-url.php` and `embeds.test.js` pin
 * the two to one set of cases, so a host added on one side cannot be forgotten on
 * the other.
 *
 * @since 1.2.1
 */
final class EmbedUrl {

	/**
	 * Hosts a provider's player may load from, keyed by provider id.
	 *
	 * Exact host names, never a suffix match: `endsWith( 'youtube.com' )` also admits
	 * `notyoutube.com`.
	 *
	 * @var array<string,string[]>
	 */
	private const HOSTS = array(
		'youtube' => array( 'www.youtube-nocookie.com', 'youtube-nocookie.com', 'www.youtube.com', 'youtube.com' ),
	);

	/**
	 * Whether a provider id plays through an iframe embed rather than a media file.
	 *
	 * @param string $provider Provider id from the item.
	 * @return bool
	 */
	public static function is_provider( string $provider ): bool {
		return isset( self::HOSTS[ $provider ] );
	}

	/**
	 * Return the URL when it is a safe player for the provider, else an empty string.
	 *
	 * Safe means: `https`, a host on the provider's list, and no credentials, port,
	 * whitespace, control character or backslash. The last group matters because
	 * `parse_url()` and a browser disagree about `https://evil.test\@www.youtube.com/`:
	 * PHP reads the host as `www.youtube.com`, a browser reads it as `evil.test`.
	 *
	 * @param string $provider Provider id from the item.
	 * @param string $url      The stored player URL.
	 * @return string Escaped URL, or '' when it must not be framed.
	 */
	public static function sanitize( string $provider, string $url ): string {
		if ( ! self::is_provider( $provider ) ) {
			return '';
		}

		$url = trim( $url );
		if ( '' === $url || preg_match( '/[\x00-\x20\x7f\\\\]/', $url ) ) {
			return '';
		}

		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) || 'https' !== strtolower( (string) ( $parts['scheme'] ?? '' ) ) ) {
			return '';
		}
		if ( isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['port'] ) ) {
			return '';
		}

		$host = strtolower( (string) ( $parts['host'] ?? '' ) );
		if ( ! in_array( $host, self::HOSTS[ $provider ], true ) ) {
			return '';
		}

		return esc_url_raw( $url );
	}
}

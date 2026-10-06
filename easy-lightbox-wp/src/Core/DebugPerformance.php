<?php
/**
 * Debug Performance: what the plugin did on this page, and how long it took.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Core;

use ShapedPlugin\ShapedGallery\Admin\Menu;
use ShapedPlugin\ShapedGallery\Admin\Settings;
use ShapedPlugin\ShapedGallery\Includes\Functions;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Settings → Advanced Controls → **Debug Performance** (`debugPerformance`, default OFF).
 *
 * Two outputs, both admin-only:
 *
 * - An HTML comment beside each gallery, and a page summary before `</body>`. Comments
 *   rather than a visible panel: they cost no CSS, cannot collide with a theme's
 *   layout, and "send me the page source" is what a support engineer asks for anyway.
 * - A `console.group()` carrying the same server figures plus what only the browser
 *   knows — which bundles were fetched, how big each was, whether it came from cache,
 *   and how long the measured layouts took to settle.
 *
 * **The gate is three clauses and all three matter** ({@see self::is_enabled()}): the
 * setting, `manage_options`, and not being in the admin. A public page must never
 * advertise its own internals to a visitor, which is the difference {@see self::comment()}
 * makes when it shows an administrator a notice and a visitor nothing at all.
 *
 * **`DONOTCACHEPAGE` is not belt-and-braces, it is the actual fix for the one real
 * hazard.** Without it an administrator's page view can be stored by a page cache and
 * then served, debug block and all, to visitors who were never meant to see it. Logged-in
 * users normally bypass a page cache on their auth cookie, but "normally" is not a
 * guarantee, and every major caching plugin honours that constant.
 *
 * **Producers push, this collects.** `Gallery::render()` and the two caches fire
 * {@see self::NOTE} rather than calling in, so nothing in the render path holds a
 * reference to this class and nothing accumulates when the toggle is off. That also
 * makes the hook a documented extension seam: an add-on can contribute a line.
 */
class DebugPerformance {

	/**
	 * Action a producer fires to contribute one fact set.
	 *
	 * @var string
	 */
	const NOTE = 'shaped_gallery_debug_note';

	/**
	 * Per-gallery notes, in render order.
	 *
	 * @var array<int,array<string,mixed>>
	 */
	private array $galleries = array();

	/**
	 * Page-level counters, keyed by name.
	 *
	 * Accumulated rather than per-gallery on purpose: a browse-cache hit belongs to a
	 * provider fetch, and attributing one to the gallery that happened to trigger it
	 * would mean threading a gallery id through the provider
	 * for a number nobody reads per gallery.
	 *
	 * @var array<string,int>
	 */
	private array $counters = array();

	/**
	 * Whether debug output may be produced at all.
	 *
	 * Resolved per call rather than memoized: it is cheap (an autoloaded option plus a
	 * capability check WordPress caches for the request), and a memo would be one more
	 * thing to reset in a request that changes the setting.
	 *
	 * @return bool
	 */
	public static function is_enabled(): bool {
		if ( is_admin() ) {
			return false;
		}

		/*
		 * `rest_sanitize_boolean()`, not `empty()`: a row written by WP-CLI or another
		 * plugin can hold the STRING 'false', which `empty()` reports as non-empty and
		 * would therefore switch debug output ON for a site that asked for the opposite.
		 * The same coercion `BrowserCache::is_enabled()` uses, for the same reason.
		 */
		if ( ! rest_sanitize_boolean( Functions::get_setting( 'debugPerformance', false ) ) ) {
			return false;
		}

		return current_user_can( Menu::CAPABILITY );
	}

	/**
	 * Hook registration.
	 *
	 * Priority 30 on `wp_footer`: after `wp_print_footer_scripts` (20) has flushed the
	 * frontend bundle, so the console payload can read timings the runtime has already
	 * written, and late enough that a debug block is always the last thing the plugin
	 * adds to a page.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( self::NOTE, array( $this, 'collect' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'prime_runtime' ) );
		add_action( 'wp_footer', array( $this, 'render_footer' ), 30 );
	}

	/**
	 * Attach the runtime's collection point ahead of the frontend bundle.
	 *
	 * `wp_add_inline_script()` needs the handle only REGISTERED, not enqueued — which it
	 * is by `init:5` — so this can run at the ordinary enqueue point and still be safe:
	 * a page whose galleries never enqueue `shaped-gallery-frontend` prints nothing at all.
	 * That is also why it cannot live in {@see self::render_footer()}, which runs at
	 * priority 30, long after footer scripts were flushed at 20.
	 *
	 * `'before'` is the load-bearing part: `shaped-layout.js` looks for
	 * `window.shapedGalleryDebug` as it lays each gallery out, so the object has to exist
	 * before the bundle executes rather than beside it.
	 *
	 * @return void
	 */
	public function prime_runtime(): void {
		if ( ! self::is_enabled() ) {
			return;
		}

		/*
		 * The prefix `assets()` filters resource entries by, DERIVED rather than
		 * written out.
		 *
		 * This used to be the literal `/shaped-gallery/dist/`, which stopped matching
		 * anything the moment the directory name and the product name diverged — the
		 * plugin ships from its WordPress.org slug, `easy-lightbox-wp` (§24), and the
		 * premium build serves the same engine from `shaped-gallery-pro/`. In both
		 * cases the literal produced an empty asset list that looked exactly like "no
		 * assets loaded", which is the wrong answer to the one question this tool
		 * exists to answer.
		 *
		 * Root-relative, so the match survives http/https, a changed host and a CDN
		 * rewrite; `wp_json_encode()` because this string is being embedded in
		 * JavaScript (§13).
		 */
		$dist_prefix = wp_json_encode( (string) wp_make_link_relative( SHAPED_GALLERY_DIST_URL ), JSON_UNESCAPED_SLASHES );

		/*
		 * `assets()` is defined here rather than in the footer script because it is the
		 * half that must survive being read by a human in devtools: with the group
		 * collapsed, `shapedGalleryDebug.assets()` re-runs on demand.
		 */
		wp_add_inline_script(
			'shaped-gallery-frontend',
			'window.shapedGalleryDebug={reflow:[],assets:function(){' .
			'return (performance.getEntriesByType("resource")||[])' .
			'.filter(function(e){return e.name.indexOf(' . $dist_prefix . ')>-1;})' .
			'.map(function(e){return{' .
			'file:e.name.split("/dist/")[1],' .
			'ms:Math.round(e.duration*10)/10,' .
			'transferred:e.transferSize,' .
			'fromCache:0===e.transferSize};});}};',
			'before'
		);
	}

	/**
	 * Record one fact set.
	 *
	 * A note with a `counter` key increments a page total; anything else is a gallery.
	 *
	 * @param mixed $facts Fact set from a producer.
	 * @return void
	 */
	public function collect( $facts ): void {
		if ( ! is_array( $facts ) ) {
			return;
		}

		if ( isset( $facts['counter'] ) ) {
			$name = self::counter_name( (string) $facts['counter'] );
			if ( '' === $name ) {
				return;
			}
			$this->counters[ $name ] = ( $this->counters[ $name ] ?? 0 ) + max( 1, (int) ( $facts['by'] ?? 1 ) );
			return;
		}

		$this->galleries[] = $facts;
	}

	/**
	 * Fire a note, but only when there is something to record it for.
	 *
	 * Every producer calls this instead of `do_action()` directly, so the gate lives in
	 * one place and a producer cannot forget it.
	 *
	 * @param array<string,mixed> $facts Fact set.
	 * @return void
	 */
	public static function note( array $facts ): void {
		if ( ! self::is_enabled() ) {
			return;
		}

		/**
		 * Contribute one fact set to the Debug Performance report.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string,mixed> $facts Either a gallery's figures, or
		 *                                   `[ 'counter' => name, 'by' => int ]`.
		 */
		do_action( self::NOTE, $facts );
	}

	/**
	 * Bump a page-level counter by name.
	 *
	 * @param string $name Counter name.
	 * @return void
	 */
	public static function count( string $name ): void {
		self::note( array( 'counter' => $name ) );
	}

	/**
	 * The HTML comment that sits beside one gallery.
	 *
	 * Returned to the caller rather than printed, because the caller is a
	 * `render_callback` whose return value IS the output — printing here would put the
	 * comment wherever the output buffer happened to be.
	 *
	 * `--` is stripped from every value: it is the only sequence that can end an HTML
	 * comment early, and a layout name or a gate reason reaching this point is plugin
	 * data rather than a filtered string, so one pass closes the door without mangling
	 * anything real.
	 *
	 * @param array<string,mixed> $facts Fact set.
	 * @return string
	 */
	public static function comment( array $facts ): string {
		if ( ! self::is_enabled() ) {
			return '';
		}

		$lines = array();
		foreach ( $facts as $key => $value ) {
			if ( is_array( $value ) ) {
				$value = implode( ', ', array_map( 'strval', $value ) );
			}
			$lines[] = sprintf( '%s=%s', self::safe( (string) $key ), self::safe( (string) $value ) );
		}

		return sprintf( "\n<!-- ShapedGallery debug | %s -->\n", implode( ' | ', $lines ) );
	}

	/**
	 * A counter name reduced to characters that are safe in a comment and a JSON key.
	 *
	 * Deliberately NOT `sanitize_key()`, which lowercases: every other key in the report
	 * is camelCase, and `browsecachehits` beside `cacheTimeout` reads like two different
	 * reports. The name still has to be constrained rather than trusted, because it
	 * arrives through a public action an add-on can fire.
	 *
	 * @param string $name Raw counter name.
	 * @return string Empty when nothing usable survives.
	 */
	private static function counter_name( string $name ): string {
		return (string) preg_replace( '/[^A-Za-z0-9_\-]/', '', $name );
	}

	/**
	 * Strip anything that could terminate an HTML comment or a script string.
	 *
	 * @param string $value Raw value.
	 * @return string
	 */
	private static function safe( string $value ): string {
		return trim( str_replace( array( '--', '<', '>' ), '', wp_strip_all_tags( $value, true ) ) );
	}

	/**
	 * The page summary comment, plus the console payload.
	 *
	 * Silent when no gallery rendered, so the constant and the script never appear on a
	 * page this plugin had nothing to do with — the same "did a gallery render here"
	 * discipline every asset enqueue follows.
	 *
	 * @return void
	 */
	public function render_footer(): void {
		if ( ! self::is_enabled() || empty( $this->galleries ) ) {
			return;
		}

		// Before anything is printed: a page cache must not store a response carrying
		// this block, because it would then be served to visitors.
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}

		$summary = $this->summary();

		echo self::comment( $summary ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value passes through self::safe().

		$payload = array(
			'galleries' => $this->galleries,
			'page'      => $summary,
		);

		/*
		 * `wp_json_encode()` + `wp_print_inline_script_tag()` rather than a hand-built
		 * <script>: the first cannot emit an unescaped `</script`, and the second is
		 * what carries a site's CSP nonce if one is filtered in.
		 */
		wp_print_inline_script_tag(
			sprintf(
				'(function(d){if(!d)return;d.server=%s;' .
				'console.groupCollapsed("ShapedGallery · performance");' .
				'console.table(d.server.galleries);console.log("page",d.server.page);' .
				'if(d.reflow&&d.reflow.length)console.table(d.reflow);' .
				'console.table(d.assets());console.groupEnd();})' .
				'(window.shapedGalleryDebug);',
				wp_json_encode( $payload )
			),
			array( 'id' => 'shaped-gallery-debug' )
		);
	}

	/**
	 * Page-level figures, derived from the per-gallery notes plus the counters.
	 *
	 * @return array<string,mixed>
	 */
	private function summary(): array {
		$rendered = 0;
		$ms       = 0.0;
		$queries  = 0;

		foreach ( $this->galleries as $gallery ) {
			if ( ! empty( $gallery['gated'] ) ) {
				continue;
			}
			++$rendered;
			$ms      += (float) ( $gallery['ms'] ?? 0 );
			$queries += (int) ( $gallery['queries'] ?? 0 );
		}

		$summary = array(
			'galleries'      => count( $this->galleries ),
			'rendered'       => $rendered,
			'ms'             => round( $ms, 2 ),
			'queries'        => $queries,
			'peakMemory'     => size_format( memory_get_peak_usage( true ) ),
			'cacheTimeout'   => (int) Settings::clamp_timeout( Functions::get_setting( 'cacheTimeout', Settings::TIMEOUT_DEFAULT ) ) . 'h',
			'browserCaching' => BrowserCache::is_enabled() ? 'on' : 'off',
			'mediaVersion'   => MediaCache::version(),
		);

		foreach ( $this->counters as $name => $value ) {
			$summary[ $name ] = $value;
		}

		return $summary;
	}
}

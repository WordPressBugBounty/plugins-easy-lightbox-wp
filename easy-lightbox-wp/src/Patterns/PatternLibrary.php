<?php
/**
 * Ready Patterns: the consumer half of the pattern library.
 *
 * The authoring site runs `shaped-gallery-demo-site-core` and publishes two read
 * routes; this class is everything on the customer side that is not transport.
 * {@see \ShapedPlugin\ShapedGallery\Rest\PatternController} is the transport, and
 * it is four-line handlers over this — the same split {@see
 * \ShapedPlugin\ShapedGallery\Frontend\GalleryPassword::unlock()} uses, for the
 * same reason: the decisions have to be testable without a request.
 *
 * Four jobs, and each one is a boundary the reference implementation does not
 * draw:
 *
 * 1. **The remote call happens on the server, never in the browser.** Real
 *    Testimonials' library `fetch()`es the provider straight from the editor,
 *    which needs the provider's `Access-Control-Allow-Origin: *`, breaks on a
 *    plain-HTTP admin talking to an HTTPS provider, and bakes the provider host
 *    into a shipped JS bundle where a site cannot repoint it. Going through
 *    `wp_safe_remote_*` (CLAUDE.md §13) also means one place to add a timeout,
 *    one place to cache, and one place to sanitize.
 * 2. **The manifest is hardened before it reaches React.** It is third-party
 *    JSON: every string in it ends up in the DOM, and `image` / `url` end up in
 *    an `<img src>` and an `<iframe src>`. The reference passes it through
 *    untouched. {@see self::harden()} rebuilds it key by key against a known
 *    shape and drops anything else.
 * 3. **The cache is a transient with a real invalidation story**, not a JSON file
 *    dropped in `wp-content/uploads`. It is derived data that refetches on
 *    demand, so it belongs with the plugin's other caches — including in
 *    {@see \ShapedPlugin\ShapedGallery\Core\GalleryCache}'s flush allow-list
 *    (§17), which a file in the uploads directory could never join.
 * 4. **The catalogue is narrowed to what this build can offer**, in a pass of
 *    its own ({@see self::restrict()}). The serving site publishes ONE list to
 *    both builds and has no idea which tier is calling, so without it the free
 *    library advertises premium patterns it will refuse and layouts it renders
 *    as something else.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Patterns;

use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryOptions;
use ShapedPlugin\ShapedGallery\Modules\ReadyPatterns as ReadyPatternsModule;
use WP_Error;

if ( ! defined( 'WPINC' ) ) {
	die; }

/**
 * Fetches, caches, hardens and imports the remote pattern catalogue.
 */
class PatternLibrary {

	/**
	 * Provider REST base, without a trailing slash.
	 *
	 * The demo/serving site's namespace is `shaped-gallery-patterns/v1` and NOT
	 * `shaped-gallery/v1` — that one is this plugin's own
	 * {@see \ShapedPlugin\ShapedGallery\Rest\GalleryController::NAMESPACE}, and the
	 * provider's blanket CORS header matches a whole namespace prefix.
	 *
	 * @var string
	 */
	public const PROVIDER_BASE = 'https://demo.shapedgallery.com/wp-json/shaped-gallery-patterns/v1';

	/**
	 * Transient holding the hardened, restricted manifest.
	 *
	 * Prefixed `shaped_gallery_patterns_` so `GalleryCache::flushable_prefixes()`
	 * can name the family — see this class's doc-block.
	 *
	 * The `_v2` suffix is a cache-buster, not decoration. A site updating from a
	 * build that cached the whole seven-layout catalogue would otherwise keep
	 * serving it for the three days left on that transient, and no amount of new
	 * filtering code runs on a cache hit. Bumping the key is the only
	 * invalidation that needs nothing to fire on upgrade.
	 *
	 * @var string
	 */
	public const CACHE_KEY = 'shaped_gallery_patterns_manifest_v2';

	/**
	 * The pre-`_v2` transient.
	 *
	 * Deleted by {@see self::flush()} alongside the live one so an upgraded site
	 * does not carry an unreachable copy of the old catalogue around until it
	 * expires on its own.
	 *
	 * @var string
	 */
	public const LEGACY_CACHE_KEY = 'shaped_gallery_patterns_manifest';

	/**
	 * Transient holding a failed fetch, so a provider that is down is not retried
	 * on every editor load.
	 *
	 * @var string
	 */
	public const FAIL_KEY = 'shaped_gallery_patterns_fail';

	/**
	 * Option holding this site's favourited pattern ids.
	 *
	 * Its own option row rather than a `shaped_gallery_settings` branch: it is
	 * per-user-ish scratch state written from the editor, and `Settings::sanitize()`
	 * is an allow-list that would drop it.
	 *
	 * @var string
	 */
	public const FAVOURITES_OPTION = 'shaped_gallery_pattern_favorites';

	/**
	 * Manifest cache lifetime.
	 *
	 * Three days, matching the reference. The catalogue changes when the team
	 * publishes a pattern, which is not something a customer site can be told
	 * about — and the library's Refresh button is the manual escape hatch, so the
	 * clock only has to bound how stale an untouched install gets.
	 *
	 * @var int
	 */
	private const CACHE_TTL = 3 * DAY_IN_SECONDS;

	/**
	 * Negative cache lifetime after an unreachable provider.
	 *
	 * @var int
	 */
	private const FAIL_TTL = 10 * MINUTE_IN_SECONDS;

	/**
	 * Outbound request timeout, in seconds.
	 *
	 * @var int
	 */
	private const TIMEOUT = 20;

	/**
	 * Whether the catalogue may show patterns this build cannot insert.
	 *
	 * OFF for 1.0, and this constant is the whole switch. Flip it to `true` on the
	 * day ShapedGallery Pro is on sale and the locked cards, the Pro badge and the
	 * tier pills all come back on their own — every one of them was already
	 * conditional on a premium row EXISTING, so removing the rows removed the
	 * chrome. Nothing was deleted to turn this off, which is the property that
	 * makes turning it back on a one-line change rather than a revert.
	 *
	 * That flip is NOT for the WordPress.org build. It must be false in anything
	 * distributed there, so `build-zip.js` reads this line and refuses to package
	 * otherwise: turning it on is a decision about a build distributed some other
	 * way, never something that reaches the .org zip by being forgotten.
	 * `verify-patterns.php` pins the value, `verify-package.php` pins the packager's
	 * guard, so neither the switch nor its enforcement can go quiet on its own.
	 *
	 * Presentation only. {@see self::import()} refuses a premium id in either
	 * state, so this decides what to ADVERTISE and never what to enforce — which
	 * is also why it is a constant and not a filter. A hook here would read as a
	 * display preference and behave as a licence bypass.
	 *
	 * @var bool
	 */
	public const SHOW_LOCKED_PATTERNS = false;

	/**
	 * Most favourites a site may store.
	 *
	 * The option is written from an authenticated editor request, so this is a
	 * bound on accidental growth rather than on an attacker.
	 *
	 * @var int
	 */
	private const MAX_FAVOURITES = 500;

	/**
	 * Whether the library is available at all.
	 *
	 * The module switch is the one answer (§6.9). Off means the REST routes 403
	 * and the editor never draws the button — the render side is what enforces it,
	 * the editor read is a courtesy.
	 *
	 * @return bool
	 */
	public static function is_enabled(): bool {
		return ReadyPatternsModule::is_enabled();
	}

	/**
	 * Whether the premium build is active on this site.
	 *
	 * Always `false` in practice while THIS copy is executing, and that is not a
	 * dead branch — it is the honest answer. The two plugins never run together
	 * (§6.21: the free bootstrap returns before its own autoloader the moment it
	 * sees Pro active), so if this file is running, Pro is not. The method exists
	 * anyway for two reasons: it states the tier in one place instead of spreading
	 * a bare `false` through the gate, and it is the single line that has to
	 * differ when the two `src/` trees are reconciled — Pro's copy answers `true`
	 * and every caller here is then already correct.
	 *
	 * There is deliberately NO filter. A hook that unlocks premium patterns is a
	 * licence bypass wearing an extension seam's clothes.
	 *
	 * @return bool
	 */
	public static function premium_active(): bool {
		if ( function_exists( 'shaped_gallery_premium_is_active' ) ) {
			return (bool) shaped_gallery_premium_is_active();
		}

		return defined( 'SHAPED_GALLERY_PRO_VERSION' );
	}

	/**
	 * The layout slugs this build can actually render.
	 *
	 * `GalleryOptions::LAYOUTS` rather than a second list here, because that is the
	 * allow-list `GalleryOptions::normalize()` enforces at render time and the
	 * library must not be able to drift from what an import would produce. It also
	 * needs no tier branch: the Pro tree's copy of that constant carries all seven
	 * layouts, so the same line answers correctly in both builds.
	 *
	 * @return string[]
	 */
	public static function supported_layouts(): array {
		return GalleryOptions::LAYOUTS;
	}

	/**
	 * The provider REST base for this site.
	 *
	 * Overridable the same way as any other provider-host constant in this
	 * codebase: a constant in `wp-config.php` for a site or a staging environment,
	 * a filter for code.
	 *
	 * @return string Base URL, no trailing slash.
	 */
	public static function provider_base(): string {
		$base = defined( 'SHAPED_GALLERY_PATTERNS_URL' ) && is_string( SHAPED_GALLERY_PATTERNS_URL )
			? SHAPED_GALLERY_PATTERNS_URL
			: self::PROVIDER_BASE;

		/**
		 * Filter the Ready Patterns provider REST base.
		 *
		 * @since 1.0.0
		 *
		 * @param string $base Base URL, without a trailing slash.
		 */
		$base = (string) apply_filters( 'shaped_gallery_patterns_provider_base', $base );

		return untrailingslashit( esc_url_raw( $base ) );
	}

	/**
	 * The hardened manifest, from cache unless a refresh is asked for.
	 *
	 * @param bool $force Skip the cache and refetch.
	 * @return array<string,mixed>|WP_Error
	 */
	public function manifest( bool $force = false ) {
		if ( ! $force ) {
			$cached = get_transient( self::CACHE_KEY );
			if ( is_array( $cached ) ) {
				return $cached;
			}

			// A provider that just failed is not asked again on every editor load.
			$failed = get_transient( self::FAIL_KEY );
			if ( is_string( $failed ) && '' !== $failed ) {
				return new WP_Error(
					'shaped_gallery_patterns_unavailable',
					$failed,
					array( 'status' => 503 )
				);
			}
		}

		$body = $this->request( 'GET', '/pattern-list' );
		if ( is_wp_error( $body ) ) {
			set_transient( self::FAIL_KEY, $body->get_error_message(), self::FAIL_TTL );
			return $body;
		}

		$manifest = $this->restrict( $this->harden( $body ) );

		delete_transient( self::FAIL_KEY );
		set_transient( self::CACHE_KEY, $manifest, self::CACHE_TTL );

		return $manifest;
	}

	/**
	 * One pattern's block markup, ready to `parse()` in the editor.
	 *
	 * Never cached: it is a single request made when a human clicks Insert, and
	 * the provider bumps a popularity counter on it — caching would both waste a
	 * row per pattern and silently stop reporting imports.
	 *
	 * @param int $id Pattern post id on the provider.
	 * @return string|WP_Error Block markup.
	 */
	public function import( int $id ) {
		if ( $id < 1 ) {
			return new WP_Error(
				'shaped_gallery_patterns_bad_id',
				__( 'A pattern id is required.', 'easy-lightbox-wp' ),
				array( 'status' => 400 )
			);
		}

		/*
		 * The gate, and it is HERE rather than in the editor because this is the
		 * only half that enforces anything: the library does not draw a row it may
		 * not insert ({@see self::restrict()}), but the request is what has to be
		 * refused. It also runs before the outbound call, so a refused id never
		 * costs the provider a request or bumps its import counter.
		 *
		 * The lookup is against the RESTRICTED catalogue, so it answers both
		 * questions in one pass: a premium row and an unsupported-layout row are
		 * alike absent from it. The `pro` re-check underneath is not redundant —
		 * it is what still refuses a premium id on the day SHOW_LOCKED_PATTERNS is
		 * flipped back on and those rows return to the manifest.
		 */
		if ( ! self::premium_active() ) {
			$manifest = $this->manifest();

			if ( is_wp_error( $manifest ) ) {
				return new WP_Error(
					'shaped_gallery_patterns_tier_unknown',
					__( 'That pattern could not be checked. Refresh the library and try again.', 'easy-lightbox-wp' ),
					array( 'status' => 409 )
				);
			}

			$row = $this->find_row( $manifest, $id );

			if ( null === $row ) {
				return new WP_Error(
					'shaped_gallery_patterns_not_offered',
					__( 'That pattern is not available in this version of ShapedGallery.', 'easy-lightbox-wp' ),
					array( 'status' => 403 )
				);
			}

			if ( ! empty( $row['pro'] ) ) {
				return new WP_Error(
					'shaped_gallery_patterns_pro_only',
					__( 'That pattern is available in ShapedGallery Pro.', 'easy-lightbox-wp' ),
					array( 'status' => 403 )
				);
			}
		}

		$body = $this->request( 'POST', '/single-pattern', array( 'template_id' => $id ) );
		if ( is_wp_error( $body ) ) {
			return $body;
		}

		if ( empty( $body['success'] ) || ! isset( $body['rawData'] ) || ! is_string( $body['rawData'] ) ) {
			return new WP_Error(
				'shaped_gallery_patterns_import_failed',
				isset( $body['message'] ) && is_string( $body['message'] )
					? sanitize_text_field( $body['message'] )
					: __( 'That pattern could not be imported.', 'easy-lightbox-wp' ),
				array( 'status' => 502 )
			);
		}

		return $body['rawData'];
	}

	/**
	 * The site's favourited pattern ids.
	 *
	 * @return int[]
	 */
	public function favorites(): array {
		$stored = get_option( self::FAVOURITES_OPTION, array() );

		return $this->clean_ids( is_array( $stored ) ? $stored : array() );
	}

	/**
	 * Add or remove one favourite.
	 *
	 * @param int    $id     Pattern id.
	 * @param string $action `remove` to drop it, anything else to add it.
	 * @return int[] The stored list after the write.
	 */
	public function toggle_favorite( int $id, string $action = '' ): array {
		$list = $this->favorites();

		if ( $id < 1 ) {
			return $list;
		}

		if ( 'remove' === $action ) {
			$list = array_values( array_diff( $list, array( $id ) ) );
		} elseif ( ! in_array( $id, $list, true ) ) {
			$list[] = $id;
			$list   = array_slice( $list, -self::MAX_FAVOURITES );
		}

		update_option( self::FAVOURITES_OPTION, $list, false );

		return $list;
	}

	/**
	 * Drop the cached manifest.
	 *
	 * Called by the Refresh button and by Clear Gallery Cache's sweep.
	 *
	 * @return void
	 */
	public static function flush(): void {
		delete_transient( self::CACHE_KEY );
		delete_transient( self::LEGACY_CACHE_KEY );
		delete_transient( self::FAIL_KEY );
	}

	/**
	 * One catalogue row by id, or `null` when this build is not offering it.
	 *
	 * The manifest is the source rather than the provider: the serving site
	 * publishes ONE catalogue to both builds and has no idea which tier is
	 * calling, so its `pro` flag is the only tier fact in the system. The caller
	 * hands in a manifest it has already read, so a warm cache costs nothing and a
	 * cold one is a single fetch — the same one the editor made moments ago to
	 * draw the grid.
	 *
	 * Fails CLOSED, and that is the whole point: an id the catalogue never carried
	 * and an id {@see self::restrict()} dropped are both `null`, and the caller
	 * refuses on `null`. The alternative is that flushing one transient unlocks
	 * every premium pattern.
	 *
	 * @param array<string,mixed> $manifest Restricted manifest.
	 * @param int                 $id       Pattern id.
	 * @return array<string,mixed>|null The row, or null when it is not on offer.
	 */
	private function find_row( array $manifest, int $id ): ?array {
		if ( ! isset( $manifest['patterns'] ) || ! is_array( $manifest['patterns'] ) ) {
			return null;
		}

		foreach ( $manifest['patterns'] as $rows ) {
			if ( ! is_array( $rows ) ) {
				continue;
			}

			foreach ( $rows as $row ) {
				if ( is_array( $row ) && isset( $row['ID'] ) && $id === (int) $row['ID'] ) {
					return $row;
				}
			}
		}

		return null;
	}

	/**
	 * One request to the provider, decoded.
	 *
	 * `wp_safe_remote_*` (§13) — the URL is site-overridable, so it is exactly the
	 * kind of outbound call that must keep WordPress's SSRF guard. The response is
	 * read defensively: `json_decode()` of an HTML error page is `null`, and
	 * reading a key off that is a fatal on PHP 8.
	 *
	 * @param string              $method HTTP method.
	 * @param string              $path   Route path, leading slash.
	 * @param array<string,mixed> $body   Request body for POST.
	 * @return array<string,mixed>|WP_Error Decoded body.
	 */
	private function request( string $method, string $path, array $body = array() ) {
		$url  = self::provider_base() . $path;
		$args = array(
			'timeout' => self::TIMEOUT,
			'headers' => array( 'Accept' => 'application/json' ),
		);

		$response = 'POST' === $method
			? wp_safe_remote_post( $url, array_merge( $args, array( 'body' => $body ) ) )
			: wp_safe_remote_get( $url, $args );

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'shaped_gallery_patterns_unreachable',
				__( 'The pattern library could not be reached. Please try again.', 'easy-lightbox-wp' ),
				array( 'status' => 502 )
			);
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code > 299 ) {
			return new WP_Error(
				'shaped_gallery_patterns_http_error',
				sprintf(
					/* translators: %d: HTTP status code. */
					__( 'The pattern library answered with an error (HTTP %d).', 'easy-lightbox-wp' ),
					$code
				),
				array( 'status' => 502 )
			);
		}

		$decoded = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $decoded ) ) {
			return new WP_Error(
				'shaped_gallery_patterns_bad_response',
				__( 'The pattern library returned an unreadable response.', 'easy-lightbox-wp' ),
				array( 'status' => 502 )
			);
		}

		return $decoded;
	}

	/**
	 * Rebuild the remote manifest against a known shape.
	 *
	 * Everything here is written by a machine this site does not control and read
	 * by React that puts it in the DOM, so nothing is copied across: each field is
	 * cast or escaped, and an unknown key is dropped rather than forwarded. In
	 * particular `image` and `url` go through `esc_url_raw()`, which is what stops
	 * a `javascript:` value ever reaching an `<img src>` or the preview `<iframe>`.
	 *
	 * A layout slug is deliberately NOT judged here. This pass asks whether a row
	 * is safe to put in the DOM, and an unfamiliar slug is not dangerous — it
	 * simply groups under its own facet. Whether this build can RENDER it is a
	 * different question with a different answer, asked once, in
	 * {@see self::restrict()}.
	 *
	 * @param array<string,mixed> $raw Decoded provider response.
	 * @return array<string,mixed> Hardened manifest.
	 */
	private function harden( array $raw ): array {
		$meta = isset( $raw['meta_data'] ) && is_array( $raw['meta_data'] ) ? $raw['meta_data'] : array();

		$manifest = array(
			'meta_data' => array(
				'layouts'    => $this->harden_terms( $meta['layouts'] ?? array() ),
				'categories' => $this->harden_terms( $meta['categories'] ?? array() ),
			),
			'patterns'  => array(),
			'fetchedAt' => time(),
		);

		$groups = isset( $raw['patterns'] ) && is_array( $raw['patterns'] ) ? $raw['patterns'] : array();

		foreach ( $groups as $slug => $items ) {
			if ( ! is_array( $items ) ) {
				continue;
			}

			$key  = sanitize_key( (string) $slug );
			$rows = array();

			foreach ( $items as $item ) {
				if ( ! is_array( $item ) ) {
					continue;
				}

				$row = $this->harden_pattern( $item, $key );
				if ( null !== $row ) {
					$rows[] = $row;
				}
			}

			if ( '' !== $key && $rows ) {
				$manifest['patterns'][ $key ] = $rows;
			}
		}

		return $manifest;
	}

	/**
	 * Narrow the hardened catalogue to what THIS build can actually offer.
	 *
	 * A separate pass from {@see self::harden()} on purpose. Hardening is a
	 * security concern and answers "is this row safe to put in the DOM"; this is a
	 * product concern and answers "can this build insert it". They change for
	 * different reasons, and keeping them apart is what lets each be tested
	 * against its own adversary.
	 *
	 * Two rules, both of them consequences of the serving site publishing ONE
	 * catalogue to both builds:
	 *
	 * 1. **A layout this build cannot render is dropped.** `GalleryOptions::LAYOUTS`
	 *    is an allow-list that FORGIVES: an imported `metro` pattern comes back
	 *    through `GalleryOptions::enum()` as the DEFAULT layout with every
	 *    metro-only attribute discarded. It renders — as something else — with no
	 *    error anywhere, which is the worst outcome a demo pattern can have,
	 *    because nothing about the result looks broken enough to report. Offering
	 *    the card is the defect; refusing it is not a limitation.
	 * 2. **A premium row is dropped while {@see self::SHOW_LOCKED_PATTERNS} is
	 *    off.** {@see self::import()} refuses the id either way; this is what stops
	 *    the library advertising cards it is going to refuse.
	 *
	 * The facet lists are then rebuilt from the rows that SURVIVED. Filtering the
	 * grid and leaving the sidebar alone would ship a `Metro 6` chip whose only
	 * possible result is an empty grid, and a term with nothing behind it is worse
	 * than no term at all — the user reads an empty result as a broken library
	 * rather than as a filter that matched nothing. The serving site's own
	 * `ItemFilter` drops an empty category for exactly this reason.
	 *
	 * @param array<string,mixed> $manifest Hardened manifest.
	 * @return array<string,mixed> The catalogue this build may show.
	 */
	private function restrict( array $manifest ): array {
		$layouts  = self::supported_layouts();
		$show_pro = self::premium_active() || self::SHOW_LOCKED_PATTERNS;
		$groups   = isset( $manifest['patterns'] ) && is_array( $manifest['patterns'] )
			? $manifest['patterns']
			: array();

		$kept           = array();
		$category_count = array();

		foreach ( $groups as $slug => $rows ) {
			if ( ! is_array( $rows ) || ! in_array( (string) $slug, $layouts, true ) ) {
				continue;
			}

			$offerable = array();

			foreach ( $rows as $row ) {
				if ( ! $show_pro && ! empty( $row['pro'] ) ) {
					continue;
				}

				$offerable[] = $row;

				foreach ( (array) ( $row['category'] ?? array() ) as $term_id ) {
					$key                    = (string) $term_id;
					$category_count[ $key ] = ( $category_count[ $key ] ?? 0 ) + 1;
				}
			}

			if ( $offerable ) {
				$kept[ (string) $slug ] = $offerable;
			}
		}

		$meta = isset( $manifest['meta_data'] ) && is_array( $manifest['meta_data'] )
			? $manifest['meta_data']
			: array();

		$manifest['patterns']  = $kept;
		$manifest['meta_data'] = array(
			'layouts'    => $this->recount_terms( $meta['layouts'] ?? array(), array_map( 'count', $kept ) ),
			'categories' => $this->recount_terms( $meta['categories'] ?? array(), $category_count ),
		);

		return $manifest;
	}

	/**
	 * Re-count one facet list against the surviving rows, dropping the empty ones.
	 *
	 * The provider's `count` is `$term->count` — every published pattern in that
	 * term, across both tiers and all seven layouts. Carrying it through a filter
	 * unchanged is how a badge comes to promise six results and deliver two.
	 *
	 * @param mixed             $terms  Hardened term list.
	 * @param array<string,int> $counts Surviving row count, keyed by term value.
	 * @return array<int,array<string,mixed>>
	 */
	private function recount_terms( $terms, array $counts ): array {
		if ( ! is_array( $terms ) ) {
			return array();
		}

		$kept = array();

		foreach ( $terms as $term ) {
			$value = is_array( $term ) && isset( $term['value'] ) ? (string) $term['value'] : '';

			if ( '' === $value || empty( $counts[ $value ] ) ) {
				continue;
			}

			$term['count'] = (int) $counts[ $value ];
			$kept[]        = $term;
		}

		return $kept;
	}

	/**
	 * Harden one manifest term list (`meta_data.layouts` / `.categories`).
	 *
	 * `value` is a slug for layouts and a term id for categories, so it is kept as
	 * a STRING either way — the grid compares it against the pattern's own values
	 * with a string compare, and casting an id to int here would only move the
	 * coercion into JavaScript.
	 *
	 * @param mixed $terms Raw list.
	 * @return array<int,array<string,mixed>>
	 */
	private function harden_terms( $terms ): array {
		if ( ! is_array( $terms ) ) {
			return array();
		}

		$clean = array();

		foreach ( $terms as $term ) {
			if ( ! is_array( $term ) || ! isset( $term['value'] ) ) {
				continue;
			}

			$value = is_scalar( $term['value'] ) ? (string) $term['value'] : '';
			if ( '' === $value ) {
				continue;
			}

			$clean[] = array(
				'label' => sanitize_text_field( (string) ( $term['label'] ?? $value ) ),
				'value' => sanitize_text_field( $value ),
				'count' => isset( $term['count'] ) ? (int) $term['count'] : 0,
			);
		}

		return $clean;
	}

	/**
	 * Harden one pattern row.
	 *
	 * @param array<string,mixed> $item  Raw row.
	 * @param string              $group The group key it arrived under.
	 * @return array<string,mixed>|null Null when the row has no usable id.
	 */
	private function harden_pattern( array $item, string $group ): ?array {
		// Cast, never `absint()`: `absint( -3 )` is 3, which would turn a negative,
		// invalid id into a plausible positive one instead of dropping the row.
		$id = isset( $item['ID'] ) ? (int) $item['ID'] : 0;
		if ( $id < 1 ) {
			return null;
		}

		/*
		 * Cast, never `absint()`. `absint( -3 )` is 3 and `absint( 'x' )` is 0, so
		 * that helper turns a nonsense value into a plausible term id instead of
		 * discarding it — and a bogus id here silently puts a pattern into a
		 * category facet it does not belong to. Anything that is not a positive
		 * integer is dropped.
		 */
		$categories = array();
		if ( isset( $item['category'] ) && is_array( $item['category'] ) ) {
			foreach ( $item['category'] as $term_id ) {
				if ( ! is_scalar( $term_id ) ) {
					continue;
				}
				$term_id = (int) $term_id;
				if ( $term_id > 0 ) {
					$categories[] = (string) $term_id;
				}
			}
		}

		return array(
			'ID'       => $id,
			'name'     => sanitize_text_field( (string) ( $item['name'] ?? '' ) ),
			'image'    => esc_url_raw( (string) ( $item['image'] ?? '' ) ),
			'url'      => esc_url_raw( (string) ( $item['url'] ?? '' ) ),
			'pro'      => ! empty( $item['pro'] ),
			'hit'      => isset( $item['hit'] ) ? max( 0, (int) $item['hit'] ) : 0,
			// The group key is authoritative: the row's own `layout` is the same
			// value, and disagreeing copies of one fact is how a facet count stops
			// matching the grid under it.
			'layout'   => $group,
			'category' => array_values( array_unique( $categories ) ),
		);
	}

	/**
	 * Cast a raw list to a de-duplicated list of positive ints.
	 *
	 * `(int)`, not `absint()`, for the reason {@see self::harden_pattern()} gives:
	 * `absint( -3 )` is 3, so a junk value written into the option by hand or by
	 * WP-CLI would come back as a real-looking pattern id rather than being
	 * discarded.
	 *
	 * @param array<int|string,mixed> $ids Raw ids.
	 * @return int[]
	 */
	private function clean_ids( array $ids ): array {
		$clean = array();

		foreach ( $ids as $id ) {
			if ( ! is_scalar( $id ) ) {
				continue;
			}
			$id = (int) $id;
			if ( $id > 0 ) {
				$clean[ $id ] = $id;
			}
		}

		return array_values( $clean );
	}
}

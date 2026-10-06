<?php
/**
 * Global helper functions.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Includes;

use ShapedPlugin\ShapedGallery\Core\BrowserCache;
use ShapedPlugin\ShapedGallery\Core\GalleryCache;
use ShapedPlugin\ShapedGallery\Core\MediaCache;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Small collection of static helpers used across the plugin.
 */
class Functions {

	/**
	 * The core layouts, mapped to their human label.
	 *
	 * @return array<string,string>
	 */
	public static function layouts(): array {
		return array(
			'justified' => __( 'Automatic Justified', 'easy-lightbox-wp' ),
			'grid'      => __( 'Grid', 'easy-lightbox-wp' ),
			'masonry'   => __( 'Masonry', 'easy-lightbox-wp' ),
		);
	}

	/**
	 * Human label for a layout id (falls back to the id, title-cased).
	 *
	 * @param string $layout Layout id.
	 * @return string
	 */
	public static function layout_label( string $layout ): string {
		$layouts = self::layouts();
		return $layouts[ $layout ] ?? ucwords( str_replace( array( '-', '_' ), ' ', $layout ) );
	}

	/**
	 * Month buckets that have at least one attachment, newest first.
	 *
	 * Drives the media manager's "Filter by date" dropdown. Cached so the grouped
	 * query doesn't run on every admin/editor page load — for the Clear Cache Timeout
	 * the site configured ({@see GalleryCache::ttl()}), which is safe at any length
	 * because {@see MediaCache} drops this entry outright on every attachment
	 * create/update/delete, i.e. on every event that can change a bucket.
	 *
	 * @return array<int,array{value:string,label:string}> e.g. [ ['value'=>'202606','label'=>'June 2026'] ].
	 */
	public static function media_months(): array {
		$cache_key = MediaCache::MONTHS_TRANSIENT;
		$cached    = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		global $wpdb, $wp_locale;

		// Identifiers are static; the two values are bound via prepare(). A direct
		// query because core exposes no API for "which months have an attachment",
		// and the result is cached in the transient read above.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT DISTINCT YEAR( post_date ) AS year, MONTH( post_date ) AS month
				FROM {$wpdb->posts}
				WHERE post_type = %s AND post_status = %s
				ORDER BY year DESC, month DESC",
				'attachment',
				'inherit'
			)
		);

		$months = array();
		foreach ( (array) $rows as $row ) {
			$year  = (int) $row->year;
			$month = (int) $row->month;
			if ( ! $year || $month < 1 || $month > 12 ) {
				continue;
			}
			$months[] = array(
				'value' => sprintf( '%04d%02d', $year, $month ),
				'label' => sprintf(
					/* translators: 1: month name, 2: four-digit year. */
					'%1$s %2$d',
					$wp_locale->get_month( $month ),
					$year
				),
			);
		}

		set_transient( $cache_key, $months, GalleryCache::ttl() );
		return $months;
	}

	/**
	 * Get a plugin option (settings array) value.
	 *
	 * @param string $key     Setting key.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	public static function get_setting( string $key, $default = '' ) {
		$settings = get_option( 'shaped_gallery_settings', array() );
		return $settings[ $key ] ?? $default;
	}

	/**
	 * The `?ver=` a plugin STYLESHEET is registered with.
	 *
	 * Together with {@see self::asset_manifest()} this is the ONE seam Enable Browser
	 * Caching acts through, which is why neither of the twelve registration sites has
	 * to know the setting exists — and why a core or third-party handle can never be
	 * caught by it.
	 *
	 * Caching off → a token that moves with the request ({@see BrowserCache}), so the
	 * browser is asked for a URL it has never seen.
	 *
	 * Caching on → the file's own mtime. This used to be `WP_DEBUG`-only, with releases
	 * falling back to `SHAPED_GALLERY_VERSION` — which pinned six stylesheets to a string
	 * that only moves on a version bump, so a CSS-only patch inside a release served
	 * stale CSS out of every visitor's cache. The scripts never had that problem
	 * (webpack stamps a content hash into their manifest), so the fix is to give the
	 * stylesheets the same property. The trade is that the token is per-install rather
	 * than per-build — a shared CDN cannot dedupe one site's stylesheet against
	 * another's — which is worth far less than serving the right bytes.
	 *
	 * `SHAPED_GALLERY_VERSION` remains the fallback for a caller with no path, and for a
	 * file that is somehow missing: a wrong-but-stable version beats emitting nothing.
	 *
	 * @param string $relative_path Path relative to the dist/ directory.
	 * @return string
	 */
	public static function asset_version( string $relative_path = '' ): string {
		if ( ! BrowserCache::is_enabled() ) {
			return BrowserCache::bust_token();
		}

		if ( '' !== $relative_path ) {
			$file = SHAPED_GALLERY_DIST_PATH . ltrim( $relative_path, '/' );
			if ( file_exists( $file ) ) {
				$modified = filemtime( $file );
				if ( false !== $modified ) {
					return (string) $modified;
				}
			}
		}

		return SHAPED_GALLERY_VERSION;
	}

	/**
	 * Read a webpack-generated *.asset.php manifest.
	 *
	 * The `version` webpack writes is a CONTENT HASH, i.e. already the ideal cacheable
	 * value — so Enable Browser Caching only ever replaces it, never improves on it.
	 * The dependency list is passed through untouched: it decides what loads, not how
	 * long it is kept.
	 *
	 * @param string $handle_path Path relative to dist/ without extension, e.g. 'block/index'.
	 * @return array{dependencies:array,version:string}
	 */
	public static function asset_manifest( string $handle_path ): array {
		$manifest = array(
			'dependencies' => array(),
			'version'      => SHAPED_GALLERY_VERSION,
		);

		$file = SHAPED_GALLERY_DIST_PATH . $handle_path . '.asset.php';
		if ( file_exists( $file ) ) {
			$loaded = include $file;
			if ( is_array( $loaded ) ) {
				$manifest = wp_parse_args( $loaded, $manifest );
			}
		}

		if ( ! BrowserCache::is_enabled() ) {
			$manifest['version'] = BrowserCache::bust_token();
		}

		return $manifest;
	}
}

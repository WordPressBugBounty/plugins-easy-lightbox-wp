<?php
/**
 * Media cache versioning + a version-keyed per-request browse cache.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Core;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns a single "media version" token that is bumped on any Media Library CRUD
 * (upload / edit / delete). Two things key off it:
 *
 * - The editor's client cache bakes the version into its query keys, so a fresh
 *   page load after an external change lands on brand-new keys (auto-bust).
 * - The provider's browse cache (see MediaLibraryProvider::fetch) embeds the
 *   version in its cache key, so a bump makes every prior cached page unreachable
 *   without having to enumerate and delete keys — stale entries just expire.
 *
 * It also invalidates the `shaped_gallery_media_months` date-filter transient on every
 * attachment CRUD event, which is what lets that entry be cached for the site's
 * Clear Cache Timeout ({@see GalleryCache}) instead of a fixed hour.
 */
class MediaCache {

	/**
	 * Option holding the monotonic media version token.
	 *
	 * @var string
	 */
	const OPTION = 'shaped_gallery_media_version';

	/**
	 * Object-cache group + transient-name prefix for browse results.
	 *
	 * @var string
	 */
	const GROUP = 'shaped_gallery_media';

	/**
	 * Transient key for the "Filter by date" month buckets.
	 *
	 * Canonical: {@see \ShapedPlugin\ShapedGallery\Includes\Functions::media_months()}
	 * reads this constant rather than re-spelling the name, so the writer and the
	 * three invalidation points below cannot drift apart.
	 *
	 * @var string
	 */
	const MONTHS_TRANSIENT = 'shaped_gallery_media_months';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'add_attachment', array( $this, 'on_add' ) );
		add_action( 'attachment_updated', array( $this, 'on_update' ) );
		add_action( 'delete_attachment', array( $this, 'on_delete' ) );
	}

	/**
	 * A new attachment was created: bump the version and drop the month buckets
	 * (a new date bucket may now exist).
	 *
	 * @param int $post_id Attachment id.
	 * @return void
	 */
	public function on_add( int $post_id ): void {
		unset( $post_id );
		$this->bump_version();
		delete_transient( self::MONTHS_TRANSIENT );
	}

	/**
	 * An attachment's post fields changed (title/caption/description/slug/date). Bump
	 * the version so caches refetch, and drop the month buckets.
	 *
	 * The buckets used to be left alone here on the grounds that an edit cannot move
	 * one — but `post_date` IS a post field, and the bucket list is now cached for the
	 * site's Clear Cache Timeout ({@see \ShapedPlugin\ShapedGallery\Core\GalleryCache::ttl()})
	 * rather than a fixed hour. A wrong month in the "Filter by date" dropdown for up
	 * to thirty days is a worse trade than one extra `delete_transient()` per
	 * attachment edit.
	 *
	 * NOTE: alt text saved via update_post_meta('_wp_attachment_image_alt') does
	 * NOT fire this hook. In the editor an alt change is still reflected live by
	 * the client's wp.media `change` listener; cross-session it is a rare, cosmetic
	 * staleness bounded by the browse cache's short TTL — not worth hooking
	 * updated_post_meta for the MVP. (That short TTL is deliberately NOT governed by
	 * the Clear Cache Timeout — see GalleryCache for why.)
	 *
	 * @param int $post_id Attachment id.
	 * @return void
	 */
	public function on_update( int $post_id ): void {
		unset( $post_id );
		$this->bump_version();
		delete_transient( self::MONTHS_TRANSIENT );
	}

	/**
	 * An attachment was deleted: bump the version and drop the month buckets (a
	 * date bucket may now be empty).
	 *
	 * @param int $post_id Attachment id.
	 * @return void
	 */
	public function on_delete( int $post_id ): void {
		unset( $post_id );
		$this->bump_version();
		delete_transient( self::MONTHS_TRANSIENT );
	}

	/**
	 * Bump the media version token. `time()` guarantees a value strictly greater
	 * than the previous one across a CRUD event, which is all the cache keys need.
	 *
	 * @return void
	 */
	private function bump_version(): void {
		self::bump();
	}

	/**
	 * Invalidate every version-keyed cache entry, from anywhere.
	 *
	 * Static because the hooked instance above is not the only caller: Clear Gallery
	 * Cache ({@see GalleryCache::flush()}) needs the same one-write invalidation, and a
	 * second `update_option()` spelled at that call site is a second definition of what
	 * bumping means.
	 *
	 * @return void
	 */
	public static function bump(): void {
		update_option( self::OPTION, time(), false );
	}

	/**
	 * Current media version token.
	 *
	 * @return int
	 */
	public static function version(): int {
		return (int) get_option( self::OPTION, 0 );
	}

	/**
	 * Build a version-scoped cache key for a set of browse query args.
	 *
	 * @param array<string,mixed> $query_args WP_Query args for the browse fetch.
	 * @return string
	 */
	public static function cache_key( array $query_args ): string {
		return md5( (string) wp_json_encode( $query_args ) ) . ':' . self::version();
	}

	/**
	 * Read a cached browse result. Prefers a persistent object cache, falling back
	 * to a transient (the only cross-request layer on hosts without one, e.g. local
	 * MAMP). Returns null on a miss so an empty-but-cached page (a real array) is
	 * distinguishable from "not cached".
	 *
	 * @param string $key Cache key from cache_key().
	 * @return array<int,array<string,mixed>>|null
	 */
	public static function get( string $key ): ?array {
		$found  = false;
		$cached = wp_cache_get( $key, self::GROUP, false, $found );
		if ( $found && is_array( $cached ) ) {
			DebugPerformance::count( 'browseCacheHits' );
			return $cached;
		}

		$transient = get_transient( self::GROUP . '_' . $key );

		// Counted here rather than at the caller because this method is the one place
		// that knows which of the two layers answered, and "is the browse cache working"
		// is the question Debug Performance exists to answer. A no-op when the toggle
		// is off ({@see DebugPerformance::note()}).
		DebugPerformance::count( is_array( $transient ) ? 'browseCacheHits' : 'browseCacheMisses' );

		return is_array( $transient ) ? $transient : null;
	}

	/**
	 * Store a browse result in both cache layers with a short TTL. The version in
	 * the key means a CRUD bump makes this entry unreachable immediately; the TTL
	 * merely bounds how long orphaned rows linger.
	 *
	 * Fixed at five minutes on purpose, i.e. NOT the site's Clear Cache Timeout: a
	 * longer lifetime here keeps nothing usable alive (the version in the key already
	 * decided that), it only leaves bigger unreadable rows in `wp_options`. It is also
	 * the one bound on a change no hook sees — WP-CLI, a direct query, a bulk-edit
	 * plugin — so shortening it to the timeout's floor would be no gain and
	 * lengthening it a real regression. See {@see GalleryCache}.
	 *
	 * @param string                         $key   Cache key from cache_key().
	 * @param array<int,array<string,mixed>> $value Mapped MediaItem[].
	 * @return void
	 */
	public static function set( string $key, array $value ): void {
		$ttl = 5 * MINUTE_IN_SECONDS;
		wp_cache_set( $key, $value, self::GROUP, $ttl );
		set_transient( self::GROUP . '_' . $key, $value, $ttl );
	}
}

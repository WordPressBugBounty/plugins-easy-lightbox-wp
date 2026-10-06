<?php
/**
 * Native WordPress Media Library provider (the only MVP provider).
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Providers;

use ShapedPlugin\ShapedGallery\Core\MediaCache;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Loads images and videos from the native Media Library and normalizes them
 * into the MediaItem[] contract.
 */
class MediaLibraryProvider extends Abstract_Media_Provider {

	/**
	 * {@inheritDoc}
	 */
	public function get_id(): string {
		return 'media_library';
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_label(): string {
		return __( 'Media Library', 'easy-lightbox-wp' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_description(): string {
		return __( 'Add images and videos from your WordPress Media Library.', 'easy-lightbox-wp' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function get_icon(): string {
		return '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14zM8.5 11l2.5 3 3.5-4.5L19 16H6l2.5-5z"/></svg>';
	}

	/**
	 * {@inheritDoc}
	 */
	public function is_available(): bool {
		return true;
	}

	/**
	 * {@inheritDoc}
	 */
	public function is_pro(): bool {
		return false;
	}

	/**
	 * Fetch attachments and normalize them.
	 *
	 * Supported $args: ids (int[]), size (string), srcset (bool), search (string),
	 * per_page (int), page (int). `size` is the display size `url` resolves to (the
	 * block's Image Resolution setting); it defaults to `medium`, which is what the
	 * media-manager browse grid wants, so only the render path changes it. `srcset`
	 * adds the responsive candidate strings — opt-in, since the browse payload is
	 * what the editor persists into the block's `items` attribute.
	 *
	 * @param array $args Query args.
	 * @return array<int,array<string,mixed>>
	 */
	public function fetch( array $args ): array {
		// An unregistered size name makes wp_get_attachment_image_src() fall back to
		// the full size, so a key-sanitized value needs no further allow-list here —
		// and a theme's custom size keeps working.
		$size   = isset( $args['size'] ) ? sanitize_key( (string) $args['size'] ) : 'medium';
		$srcset = ! empty( $args['srcset'] );

		// Fast path: explicit ids (the common case — the block stores ids).
		if ( ! empty( $args['ids'] ) && is_array( $args['ids'] ) ) {
			$items = array();
			foreach ( $args['ids'] as $id ) {
				$item = $this->map_attachment( (int) $id, $size, $srcset );
				if ( $item ) {
					$items[] = $item;
				}
			}
			return $items;
		}

		// Browse path: query the library (used by the media manager grid).
		// The grid paginates client-stop (never reads a total) and reads no
		// attachment terms, so skip the found-rows COUNT and the term-cache prime.
		$query_args = array(
			'post_type'              => 'attachment',
			'post_status'            => 'inherit',
			'post_mime_type'         => array( 'image', 'video' ),
			'posts_per_page'         => isset( $args['per_page'] ) ? (int) $args['per_page'] : 40,
			'paged'                  => isset( $args['page'] ) ? max( 1, (int) $args['page'] ) : 1,
			'orderby'                => 'date',
			'order'                  => 'DESC',
			'no_found_rows'          => true,
			'update_post_term_cache' => false,
		);

		// Narrow to a single media type when the sidebar source asks for it.
		$type = isset( $args['type'] ) ? (string) $args['type'] : '';
		if ( 'image' === $type || 'video' === $type ) {
			$query_args['post_mime_type'] = $type;
		}

		// Month bucket (YYYYMM) from the "Filter by date" dropdown.
		if ( ! empty( $args['month'] ) && preg_match( '/^\d{6}$/', (string) $args['month'] ) ) {
			$query_args['m'] = (int) $args['month'];
		}

		if ( ! empty( $args['search'] ) ) {
			$query_args['s'] = sanitize_text_field( $args['search'] );
		}

		// Version-keyed per-request cache: identical browse queries (repeat opens,
		// concurrent editors) skip the WP_Query + per-item map_attachment() work
		// (~2x wp_get_attachment_image_src + several meta reads each). Any media
		// CRUD bumps MediaCache::version(), so a stale key is simply never hit.
		$cache_key = MediaCache::cache_key( $query_args );
		$cached    = MediaCache::get( $cache_key );
		if ( null !== $cached ) {
			return $cached;
		}

		$query = new \WP_Query( $query_args );
		$items = array();
		foreach ( $query->posts as $post ) {
			$item = $this->map_attachment( $post );
			if ( $item ) {
				$items[] = $item;
			}
		}

		MediaCache::set( $cache_key, $items );
		return $items;
	}

	/**
	 * Map a single attachment to the MediaItem contract.
	 *
	 * Accepts a resolved WP_Post (browse path, already loaded by WP_Query) or an
	 * id (ids fast-path), so the browse loop doesn't re-`get_post()` each item.
	 *
	 * `$size` selects which registered image size `url` (the display source) points
	 * at; `thumb` stays `medium` and `full` stays the original, so the Image
	 * Resolution setting never affects the lightbox source or the thumbnail strip.
	 * `width`/`height` remain the intrinsic full-size dimensions — the renderer uses
	 * them for the intrinsic aspect ratio the measured layouts need.
	 *
	 * @param \WP_Post|int $attachment Attachment post object or id.
	 * @param string       $size       Display size for `url` (default `medium`).
	 * @param bool         $srcset     Also return the `srcset`/`sizes` candidates.
	 * @return array<string,mixed>|null
	 */
	private function map_attachment( $attachment, string $size = 'medium', bool $srcset = false ): ?array {
		$post = $attachment instanceof \WP_Post ? $attachment : get_post( (int) $attachment );
		if ( ! $post || 'attachment' !== $post->post_type ) {
			return null;
		}

		$id = (int) $post->ID;

		// Mime-based type check: we already filtered to image/video and hold the
		// post, so this avoids wp_attachment_is()'s per-item file + filetype work.
		$is_video = str_starts_with( (string) $post->post_mime_type, 'video/' );
		$type     = $is_video ? 'video' : 'image';

		// An image resolves its own sizes; a video resolves its POSTER's (a video has
		// no image sizes of its own), so both paths share one lookup below.
		$source_id = $is_video ? (int) get_post_thumbnail_id( $id ) : $id;

		$full_src  = $source_id ? wp_get_attachment_image_src( $source_id, 'full' ) : false;
		$thumb_src = $source_id ? wp_get_attachment_image_src( $source_id, 'medium' ) : false;
		$disp_src  = $this->sized_src( $source_id, $size, $full_src, $thumb_src );

		$poster_url = ( $is_video && $full_src ) ? $full_src[0] : '';

		$full_url  = $full_src ? $full_src[0] : wp_get_attachment_url( $id );
		$thumb_url = $thumb_src ? $thumb_src[0] : $full_url;
		$disp_url  = $disp_src ? $disp_src[0] : $thumb_url;
		$width     = $full_src ? (int) $full_src[1] : 0;
		$height    = $full_src ? (int) $full_src[2] : 0;

		// A video with no featured image has no poster to size from — but it still has
		// its OWN intrinsic dimensions (WP reads these from the file itself on upload).
		// Falling back to them keeps the measured layouts (justified/masonry) sizing the
		// tile by the video's real aspect ratio instead of the renderer's generic 4:3
		// placeholder, which is what every video without a manually-set featured image
		// would otherwise get.
		if ( $is_video && ! $width ) {
			$video_meta = wp_get_attachment_metadata( $id );
			$width      = (int) ( $video_meta['width'] ?? 0 );
			$height     = (int) ( $video_meta['height'] ?? 0 );
		}

		$item = array(
			'id'          => $id,
			'type'        => $type,
			'url'         => $disp_url,
			'thumb'       => $thumb_url,
			'full'        => $is_video ? wp_get_attachment_url( $id ) : $full_url,
			'poster'      => $poster_url,
			'width'       => $width,
			'height'      => $height,
			'alt'         => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
			'title'       => get_the_title( $id ),
			'caption'     => wp_get_attachment_caption( $id ) ?: '',
			'description' => $post->post_content,
			'link'        => '',
			'provider'    => $this->get_id(),
		);

		/*
		 * Responsive candidates for the DISPLAY size (opt-in). Derived from the same
		 * `$source_id` as `url`, so a video's candidates describe its poster. Both
		 * helpers return false when the image has no other candidate widths, in which
		 * case the keys stay absent and the renderer emits a plain `src`.
		 *
		 * Capped at the display width, because `srcset` OVERRULES `src` — and without
		 * the cap that made the Image Resolution setting a no-op for three of its four
		 * values. `wp_get_attachment_image_srcset()` builds its list from every
		 * registered size sharing the image's aspect ratio PLUS the original, and the
		 * requested `$size` only picks the ratio to match; measured on a real library,
		 * `medium`, `large` and `full` returned byte-for-byte the same seven candidates
		 * in a different order. So a gallery set to Medium still let the browser choose
		 * the 1000px original, and switching the control changed nothing a visitor could
		 * see. (Only `thumbnail` differed, because its hard square crop has a candidate
		 * family of its own.)
		 *
		 * Retina still works: the browser multiplies the `sizes` width by the display's
		 * pixel ratio and takes the largest candidate that covers it — now bounded by
		 * the size the gallery actually asked for, which is what "Resolution" says on
		 * the tin. Full keeps every candidate, so the default retina behaviour on the
		 * largest setting is unchanged.
		 */
		if ( $srcset && $source_id ) {
			$candidates = self::cap_srcset(
				(string) wp_get_attachment_image_srcset( $source_id, $size ),
				$disp_src ? (int) $disp_src[1] : 0
			);
			if ( '' !== $candidates ) {
				$item['srcset'] = $candidates;
				$hint           = wp_get_attachment_image_sizes( $source_id, $size );
				if ( $hint ) {
					$item['sizes'] = $hint;
				}
			}
		}

		return $item;
	}

	/**
	 * Resolve the display-size image source, reusing the sizes already looked up.
	 *
	 * `full` and `medium` are fetched by the caller for `full`/`thumb`, so choosing
	 * either costs no extra lookup; only a third size adds one.
	 *
	 * @param int         $source_id Attachment id carrying the image sizes.
	 * @param string      $size      Requested size name.
	 * @param array|false $full_src  Already-resolved `full` source.
	 * @param array|false $thumb_src Already-resolved `medium` source.
	 * @return array|false Image source triple, or false.
	 */
	private function sized_src( int $source_id, string $size, $full_src, $thumb_src ) {
		if ( ! $source_id ) {
			return false;
		}
		if ( 'full' === $size ) {
			return $full_src;
		}
		if ( 'medium' === $size ) {
			return $thumb_src;
		}
		return wp_get_attachment_image_src( $source_id, $size );
	}

	/**
	 * Drop `srcset` candidates wider than the display size.
	 *
	 * The chosen Image Resolution is a CEILING on delivery, not merely the `src`: a
	 * candidate wider than it would be picked in preference on any HiDPI display and
	 * the setting would have no observable effect (see the call site).
	 *
	 * Only `w`-descriptor candidates are understood, which is all
	 * {@see wp_get_attachment_image_srcset()} emits. Anything unparseable is KEPT
	 * rather than dropped — a filter may have added a descriptor shape this does not
	 * model, and silently discarding it would be worse than a slightly loose cap.
	 * A single remaining candidate is still returned: it is what `src` already points
	 * at, so the browser's choice is unaffected either way and dropping it would just
	 * make the two seams disagree about whether candidates exist.
	 *
	 * @param string $srcset Candidate list from core ('' when none).
	 * @param int    $width  Display width in px (0 = unknown, no cap applied).
	 * @return string Capped candidate list, or ''.
	 */
	private static function cap_srcset( string $srcset, int $width ): string {
		if ( '' === $srcset || $width < 1 ) {
			return $srcset;
		}

		$kept = array();
		foreach ( explode( ',', $srcset ) as $candidate ) {
			$candidate = trim( $candidate );
			if ( '' === $candidate ) {
				continue;
			}
			if ( ! preg_match( '/\s(\d+)w$/', $candidate, $match ) || (int) $match[1] <= $width ) {
				$kept[] = $candidate;
			}
		}

		return implode( ', ', $kept );
	}
}

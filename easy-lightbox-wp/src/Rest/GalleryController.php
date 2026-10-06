<?php
/**
 * REST API: galleries, media and provider catalog.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Rest;

use ShapedPlugin\ShapedGallery\Admin\GalleryEditor;
use ShapedPlugin\ShapedGallery\Core\GalleryCache;
use ShapedPlugin\ShapedGallery\Core\GalleryMeta;
use ShapedPlugin\ShapedGallery\Core\PostType;
use ShapedPlugin\ShapedGallery\Frontend\Frontend;
use ShapedPlugin\ShapedGallery\Frontend\GalleryVisibility;
use ShapedPlugin\ShapedGallery\Includes\Functions;
use ShapedPlugin\ShapedGallery\Providers\Provider_Registry;
use ShapedPlugin\ShapedGallery\Render\LayoutRenderer;
use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryOptions;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the plugin's REST routes under `shaped-gallery/v1`.
 */
class GalleryController {

	const NAMESPACE = 'shaped-gallery/v1';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Capability gate for all write/admin routes.
	 *
	 * @return bool
	 */
	public function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Permission gate for the public, read-only pagination endpoint.
	 *
	 * Ajax Pagination serves already-published gallery content to frontend
	 * visitors (logged-out included), so — unlike every other route here, which
	 * exposes admin/write surface behind `can_manage()` — this one is intentionally
	 * public, exactly like core's read routes for published posts. Documented
	 * deviation from CLAUDE.md §9 (whose rule targets writes / admin data, not
	 * public reads).
	 *
	 * **Public here means "no capability required to ASK", not "no authorization".**
	 * That distinction is the whole lesson of this route: resolving the render
	 * context — a live server-owned transient, or a *published* gallery CPT — proves
	 * the context EXISTS and says nothing about whether the caller may see it, and
	 * for a while that was the only check there was. So the per-gallery gate moved
	 * to {@see resolve_render_context()}, which applies
	 * {@see \ShapedPlugin\ShapedGallery\Frontend\GalleryVisibility} — the same Private
	 * and Password gate the block's own render_callback applies — and reports a gated
	 * gallery as unresolved. `render_window()` asks again on its own account.
	 *
	 * What this method's `true` therefore delegates, and what still holds: the
	 * handler owns the window size, clamps the offset to the item count, and only
	 * ever emits escaped markup. Anything added here that is not a *public* read of
	 * an *unrestricted* gallery needs its own gate, not this one.
	 *
	 * @return bool
	 */
	public function can_read(): bool {
		return true;
	}

	/**
	 * Register routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/providers',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_providers' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/media',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_media' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'args'                => array(
					'provider' => array(
						'type'    => 'string',
						'default' => 'media_library',
					),
					'ids'      => array(
						'type'    => 'string',
						'default' => '',
					),
					'type'     => array(
						'type'              => 'string',
						'default'           => '',
						'enum'              => array( '', 'image', 'video' ),
						'sanitize_callback' => 'sanitize_key',
					),
					'month'    => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => static function ( $value ) {
							return '' === $value || ( is_string( $value ) && (bool) preg_match( '/^\d{6}$/', $value ) );
						},
					),
					'search'   => array(
						'type'    => 'string',
						'default' => '',
					),
					'page'     => array(
						'type'    => 'integer',
						'default' => 1,
					),
					'per_page' => array(
						'type'    => 'integer',
						'default' => 40,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/gallery-page',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_gallery_page' ),
				'permission_callback' => array( $this, 'can_read' ),
				'args'                => array(
					'ctx'       => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => static function ( $value ) {
							return preg_replace( '/[^a-f0-9]/', '', (string) $value );
						},
					),
					'galleryId' => array(
						'type'    => 'integer',
						'default' => 0,
					),
					'offset'    => array(
						'type'    => 'integer',
						'default' => 0,
					),
					'device'    => array(
						'type'              => 'string',
						'default'           => 'desktop',
						'enum'              => array( 'desktop', 'tablet', 'mobile' ),
						'sanitize_callback' => 'sanitize_key',
					),
					/*
					 * Random-order permutation seed, minted by the SSR render and echoed
					 * back so every window of one page load slices the same deck (see
					 * Render\ItemOrder). Safe to accept from the client: it only permutes
					 * the item set this gallery already exposes — it cannot add, remove or
					 * reveal an item, so the worst a forged value does is reorder a
					 * visitor's own view.
					 */
					'seed'      => array(
						'type'    => 'integer',
						'default' => 0,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/cache/purge',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'purge_gallery_cache' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'args'                => array(
					// The panel re-POSTs while `remaining` is true, so one click can
					// clear a cache far larger than a single request could survive.
					'max_rows' => array(
						'type'    => 'integer',
						'default' => 300,
						'minimum' => 1,
						'maximum' => 2000,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/galleries',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_galleries' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'args'                => array(
					'page'     => array(
						'type'    => 'integer',
						'default' => 1,
						'minimum' => 1,
					),
					'per_page' => array(
						'type'    => 'integer',
						'default' => 20,
						'minimum' => 1,
						'maximum' => 100,
					),
					'search'   => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'orderby'  => array(
						'type'              => 'string',
						'default'           => 'date',
						'enum'              => array( 'date', 'title' ),
						'sanitize_callback' => 'sanitize_key',
					),
					'order'    => array(
						'type'              => 'string',
						'default'           => 'desc',
						'enum'              => array( 'asc', 'desc' ),
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		// Registered BEFORE the id route only for readability; `bulk` can never match
		// `(?P<id>\d+)`, so the order carries no meaning.
		register_rest_route(
			self::NAMESPACE,
			'/galleries/bulk',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'bulk_galleries' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'args'                => array(
					'action' => array(
						'type'              => 'string',
						'required'          => true,
						'enum'              => array( 'delete', 'duplicate' ),
						'sanitize_callback' => 'sanitize_key',
					),
					'ids'    => array(
						'type'     => 'array',
						'required' => true,
						'items'    => array( 'type' => 'integer' ),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/galleries/(?P<id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_gallery' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_gallery' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/galleries/(?P<id>\d+)/duplicate',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'duplicate_gallery' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
	}

	/**
	 * GET /providers → the provider catalog for the Connect & Import rail.
	 *
	 * @return \WP_REST_Response
	 */
	public function get_providers(): \WP_REST_Response {
		return rest_ensure_response( Provider_Registry::catalog() );
	}

	/**
	 * GET /media → normalized MediaItem[] from a provider.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_media( \WP_REST_Request $request ) {
		$provider_id = sanitize_key( $request->get_param( 'provider' ) );
		$provider    = Provider_Registry::get( $provider_id );

		if ( ! $provider || ! $provider->is_available() ) {
			return new \WP_Error( 'shaped_gallery_provider_unavailable', __( 'Media provider is not available.', 'easy-lightbox-wp' ), array( 'status' => 400 ) );
		}

		$ids_raw = (string) $request->get_param( 'ids' );
		$type    = sanitize_key( (string) $request->get_param( 'type' ) );
		$month   = preg_replace( '/[^0-9]/', '', (string) $request->get_param( 'month' ) );
		$args    = array(
			'search'   => (string) $request->get_param( 'search' ),
			'page'     => (int) $request->get_param( 'page' ),
			'per_page' => (int) $request->get_param( 'per_page' ),
			'type'     => in_array( $type, array( 'image', 'video' ), true ) ? $type : '',
			'month'    => 6 === strlen( (string) $month ) ? $month : '',
		);
		if ( '' !== $ids_raw ) {
			$args['ids'] = array_filter( array_map( 'absint', explode( ',', $ids_raw ) ) );
		}

		return rest_ensure_response( $provider->fetch( $args ) );
	}

	/**
	 * GET /gallery-page → an Ajax-pagination window as an escaped HTML fragment.
	 *
	 * Public read (see {@see can_read()}). Resolves the render context server-side
	 * from a live transient (any block) or a published gallery CPT (fallback),
	 * verifies pagination is actually enabled, then delegates to the shared
	 * {@see LayoutRenderer::render_window()} — so the appended figures come from the
	 * exact same escaped render path as the SSR markup. The client supplies only a
	 * context reference, an offset (position into public content) and its device.
	 * The window size stays server-owned.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_gallery_page( \WP_REST_Request $request ) {
		$ctx        = (string) $request->get_param( 'ctx' );
		$gallery_id = absint( $request->get_param( 'galleryId' ) );
		$offset     = max( 0, (int) $request->get_param( 'offset' ) );
		$device     = sanitize_key( (string) $request->get_param( 'device' ) );
		if ( ! in_array( $device, array( 'desktop', 'tablet', 'mobile' ), true ) ) {
			$device = 'desktop';
		}

		$attributes = $this->resolve_render_context( $ctx, $gallery_id );
		if ( null === $attributes ) {
			return new \WP_Error(
				'shaped_gallery_context_expired',
				__( 'This gallery view is no longer available. Please reload the page.', 'easy-lightbox-wp' ),
				array( 'status' => 410 )
			);
		}

		// Only paginate a gallery that actually has pagination enabled.
		if ( ! GalleryOptions::ajax_active( GalleryOptions::normalize( $attributes ) ) ) {
			return new \WP_Error(
				'shaped_gallery_pagination_disabled',
				__( 'Pagination is not enabled for this gallery.', 'easy-lightbox-wp' ),
				array( 'status' => 400 )
			);
		}

		$renderer = new LayoutRenderer();
		$window   = $renderer->render_window(
			$attributes,
			$offset,
			$device,
			max( 0, (int) $request->get_param( 'seed' ) )
		);

		/**
		 * Filter the pagination response payload before it is sent.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string,mixed> $response   { html, hasMore, next, total }.
		 * @param array<string,mixed> $attributes Server-owned block attributes.
		 * @param int                 $offset     Requested offset.
		 * @param string              $device     desktop|tablet|mobile.
		 */
		$response = (array) apply_filters(
			'shaped_gallery_ajax_response',
			array(
				'html'    => $window['html'],
				'hasMore' => $window['hasMore'],
				'next'    => $window['next'],
				'total'   => $window['total'],
			),
			$attributes,
			$offset,
			$device
		);

		return rest_ensure_response( $response );
	}

	/**
	 * POST /cache/purge → Clear Gallery Cache.
	 *
	 * POST rather than DELETE: this is an action on
	 * a derived cache, not the removal of an addressable resource. Idempotent, and an
	 * already-empty cache is a 200 — "there was nothing to delete" is a normal outcome,
	 * not a failure.
	 *
	 * Never a `WP_Error` for an empty result, and never partial-failure reporting: the
	 * invalidation half of {@see GalleryCache::flush()} always succeeds (one option
	 * write), so the only thing a batch can come up short on is row reclamation, which
	 * is what `remaining` is for.
	 *
	 * @param \WP_REST_Request $request REST request.
	 * @return \WP_REST_Response
	 */
	public function purge_gallery_cache( \WP_REST_Request $request ): \WP_REST_Response {
		$result = GalleryCache::flush( (int) $request->get_param( 'max_rows' ) );

		return rest_ensure_response(
			array(
				'deleted'   => (int) $result['deleted'],
				'remaining' => (bool) $result['remaining'],
				'message'   => $this->flush_message( (int) $result['deleted'], (bool) $result['remaining'] ),
			)
		);
	}

	/**
	 * Human-readable outcome for a cache-flush batch.
	 *
	 * Built server-side so the panel needs no plural rules in JavaScript and every
	 * string stays translatable in one place.
	 *
	 * "Cleared" rather than "deleted N rows" on the final message, because the row count
	 * is an implementation detail a user cannot verify and 0 rows still means the cache
	 * was invalidated — the version bump does that whether or not anything was stored.
	 *
	 * @param int  $deleted   Transient rows removed.
	 * @param bool $remaining Whether more remain.
	 * @return string
	 */
	private function flush_message( int $deleted, bool $remaining ): string {
		if ( $remaining ) {
			return sprintf(
				/* translators: %s: number of cache entries cleared so far. */
				__( 'Cleared %s cache entries so far…', 'easy-lightbox-wp' ),
				number_format_i18n( $deleted )
			);
		}

		return __( 'Gallery cache cleared.', 'easy-lightbox-wp' );
	}

	/**
	 * Resolve the render context for a pagination request.
	 *
	 * Prefers the server-owned transient the renderer stashed at SSR (works for
	 * every block, including inline ones with no saved gallery); falls back to a
	 * published gallery CPT so saved galleries survive transient eviction. Never
	 * trusts client-supplied attributes.
	 *
	 * Resolving is only half the job, and the half that used to be missing is the
	 * important one: a context that resolves still has to be one this REQUEST may
	 * see. Neither branch below is an authorization check — the transient is a
	 * content hash and the CPT lookup only asks "is this a published gallery" — so
	 * both are followed by the visibility gate, which is the same gate
	 * {@see \ShapedPlugin\ShapedGallery\Blocks\BlockTypes\Gallery::render()} applies
	 * before it renders anything. Without it, `?galleryId=<n>` served the full
	 * contents of a private or password-protected gallery to an anonymous caller.
	 *
	 * A gated gallery is reported as unresolved rather than as forbidden, which is
	 * deliberate: the caller answers one 410 for "expired, missing, or not yours",
	 * so the response distinguishes none of them and the item total is never sent.
	 *
	 * @param string $ctx        Content-hash context key.
	 * @param int    $gallery_id Gallery CPT id (0 when absent).
	 * @return array<string,mixed>|null Block attributes, or null when unresolved
	 *                                  or not viewable by the current request.
	 */
	private function resolve_render_context( string $ctx, int $gallery_id ): ?array {
		$attributes = null;

		if ( '' !== $ctx ) {
			$cached = get_transient( GalleryCache::ctx_name( $ctx ) );
			if ( is_array( $cached ) ) {
				$attributes = $cached;
			}
		}

		if ( null === $attributes && $gallery_id > 0 ) {
			$attributes = $this->attrs_from_gallery( $gallery_id );
		}

		if ( null === $attributes ) {
			return null;
		}

		if ( ! GalleryVisibility::is_viewable( GalleryOptions::normalize( $attributes ) ) ) {
			return null;
		}

		return $attributes;
	}

	/**
	 * Extract the gallery block's attributes from a published gallery CPT.
	 *
	 * @param int $gallery_id Gallery CPT id.
	 * @return array<string,mixed>|null Block attributes, or null when not found.
	 */
	private function attrs_from_gallery( int $gallery_id ): ?array {
		$post = get_post( $gallery_id );
		if ( ! $post || PostType::POST_TYPE !== $post->post_type || 'publish' !== $post->post_status ) {
			return null;
		}

		// Same extraction the cached list meta uses — one parser, one definition of
		// "the gallery block in this post".
		return GalleryMeta::gallery_attributes( (string) $post->post_content );
	}

	/**
	 * GET /galleries → a paginated page of stored galleries for Saved Galleries.
	 *
	 * Returns an envelope rather than a bare array because the screen renders a
	 * pager: the client needs the total, and a header-only total forces every
	 * consumer to read `X-WP-Total` by hand.
	 *
	 * `totalAll` is the same count with the search term ignored. The screen needs
	 * both, and cannot derive one from the other: `total` decides the pager, while
	 * `totalAll` decides whether to draw the table at all or the first-run banner in
	 * its place. Answering that second question with `total` would replace the table
	 * with "create your first gallery" the moment a search matched nothing, which
	 * reads as data loss.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function list_galleries( \WP_REST_Request $request ): \WP_REST_Response {
		$per_page = min( 100, max( 1, (int) $request->get_param( 'per_page' ) ) );
		$page     = max( 1, (int) $request->get_param( 'page' ) );
		$orderby  = sanitize_key( (string) $request->get_param( 'orderby' ) );
		$order    = sanitize_key( (string) $request->get_param( 'order' ) );
		$search   = sanitize_text_field( (string) $request->get_param( 'search' ) );

		$query = new \WP_Query(
			array(
				'post_type'      => PostType::POST_TYPE,
				'post_status'    => array( 'publish', 'draft' ),
				'posts_per_page' => $per_page,
				'paged'          => $page,
				'orderby'        => in_array( $orderby, array( 'date', 'title' ), true ) ? $orderby : 'date',
				'order'          => 'asc' === $order ? 'ASC' : 'DESC',
				's'              => $search,
				// The pager needs found_posts, so the COUNT query stays on.
				'no_found_rows'  => false,
			)
		);

		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->gallery_item( $post );
		}

		return rest_ensure_response(
			array(
				'items'      => $items,
				'total'      => (int) $query->found_posts,
				'totalAll'   => '' === $search
					? (int) $query->found_posts
					: $this->count_galleries(),
				'totalPages' => (int) $query->max_num_pages,
				'page'       => $page,
				'perPage'    => $per_page,
			)
		);
	}

	/**
	 * Every gallery on the site, in the two statuses the list screen shows.
	 *
	 * `wp_count_posts()` and not a second `WP_Query`: it is one cached `GROUP BY`
	 * over `post_status`, so the unfiltered count costs nothing next to the paged
	 * query that has already run — and only runs at all when a search is active
	 * (without one, `found_posts` is already this number).
	 *
	 * @return int
	 */
	private function count_galleries(): int {
		$counts = wp_count_posts( PostType::POST_TYPE );

		return (int) ( $counts->publish ?? 0 ) + (int) ( $counts->draft ?? 0 );
	}

	/**
	 * DELETE /galleries/{id} → permanently delete a gallery. There is no Trash for
	 * this CPT: the confirm dialog on the other end of this route already tells the
	 * user so, and a reversible delete this route did not actually offer would be
	 * worse than none.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_gallery( \WP_REST_Request $request ) {
		$post = $this->gallery_post( (int) $request->get_param( 'id' ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		if ( ! wp_delete_post( $post->ID, true ) ) {
			return new \WP_Error(
				'shaped_gallery_delete_failed',
				__( 'Could not delete the gallery.', 'easy-lightbox-wp' ),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'id'      => $post->ID,
				'deleted' => true,
			)
		);
	}

	/**
	 * POST /galleries/{id}/duplicate → copy a gallery, content and all.
	 *
	 * The copy keeps the source's status so its shortcode works immediately, and its
	 * cached meta is recomputed by {@see \ShapedPlugin\ShapedGallery\Core\GalleryMeta}
	 * from the copied content — nothing here duplicates that derivation.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function duplicate_gallery( \WP_REST_Request $request ) {
		$post = $this->gallery_post( (int) $request->get_param( 'id' ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$copy_id = $this->duplicate( $post );
		if ( is_wp_error( $copy_id ) ) {
			return $copy_id;
		}

		$copy = get_post( $copy_id );

		return rest_ensure_response(
			array(
				'id'   => (int) $copy_id,
				'item' => $copy instanceof \WP_Post ? $this->gallery_item( $copy ) : null,
			)
		);
	}

	/**
	 * POST /galleries/bulk → apply one action to a set of galleries.
	 *
	 * Ids that are not galleries are reported in `failed` rather than aborting the
	 * batch, so one stale row in the browser cannot block the rest of the action.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function bulk_galleries( \WP_REST_Request $request ) {
		$action = sanitize_key( (string) $request->get_param( 'action' ) );
		$ids    = array_slice( array_unique( array_filter( array_map( 'absint', (array) $request->get_param( 'ids' ) ) ) ), 0, 100 );

		if ( ! $ids ) {
			return new \WP_Error(
				'shaped_gallery_no_ids',
				__( 'No galleries were selected.', 'easy-lightbox-wp' ),
				array( 'status' => 400 )
			);
		}

		$done   = array();
		$failed = array();

		foreach ( $ids as $id ) {
			$post = $this->gallery_post( $id );
			if ( is_wp_error( $post ) ) {
				$failed[] = $id;
				continue;
			}

			if ( 'duplicate' === $action ) {
				$result = $this->duplicate( $post );
			} else {
				// Permanent, matching the single-gallery route — no Trash for this CPT.
				$result = wp_delete_post( $post->ID, true ) ? $post->ID : new \WP_Error( 'shaped_gallery_delete_failed', '' );
			}

			if ( is_wp_error( $result ) || ! $result ) {
				$failed[] = $id;
				continue;
			}

			$done[] = $id;
		}

		return rest_ensure_response(
			array(
				'action' => $action,
				'done'   => $done,
				'failed' => $failed,
			)
		);
	}

	/**
	 * GET /galleries/{id} → a single gallery with its serialized block content.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_gallery( \WP_REST_Request $request ) {
		$post = $this->gallery_post( (int) $request->get_param( 'id' ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		return rest_ensure_response(
			array_merge(
				$this->gallery_item( $post ),
				array( 'content' => $post->post_content )
			)
		);
	}

	/**
	 * A gallery post by id, or a 404 WP_Error when the id is not one.
	 *
	 * Every route that takes an id goes through this — the id comes from the browser,
	 * and `wp_delete_post()` would happily delete a page.
	 *
	 * @param int $id Candidate post id.
	 * @return \WP_Post|\WP_Error
	 */
	private function gallery_post( int $id ) {
		$post = $id > 0 ? get_post( $id ) : null;

		if ( ! $post instanceof \WP_Post || PostType::POST_TYPE !== $post->post_type ) {
			return new \WP_Error(
				'shaped_gallery_not_found',
				__( 'Gallery not found.', 'easy-lightbox-wp' ),
				array( 'status' => 404 )
			);
		}

		return $post;
	}

	/**
	 * The Manage Galleries row shape for one gallery.
	 *
	 * The shortcode and the edit URL are built by their owners
	 * ({@see Frontend::shortcode_for()}, {@see GalleryEditor::edit_url()}) so this
	 * response cannot drift from what the editor sidebar shows.
	 *
	 * @param \WP_Post $post Gallery post.
	 * @return array<string,mixed>
	 */
	private function gallery_item( \WP_Post $post ): array {
		$layout = (string) get_post_meta( $post->ID, GalleryMeta::LAYOUT_KEY, true );

		return array(
			'id'          => (int) $post->ID,
			'title'       => $post->post_title,
			'layout'      => $layout,
			'layoutLabel' => Functions::layout_label( $layout ),
			'count'       => (int) get_post_meta( $post->ID, GalleryMeta::COUNT_KEY, true ),
			'shortcode'   => Frontend::shortcode_for( (int) $post->ID ),
			'status'      => $post->post_status,
			'statusLabel' => self::status_label( $post->post_status ),
			'date'        => get_the_date( 'Y/m/d g:i a', $post ),
			'editUrl'     => GalleryEditor::edit_url( (int) $post->ID ),
		);
	}

	/**
	 * Human-readable post status.
	 *
	 * @param string $status Post status.
	 * @return string
	 */
	private static function status_label( string $status ): string {
		$object = get_post_status_object( $status );

		return $object && isset( $object->label ) ? (string) $object->label : $status;
	}

	/**
	 * Copy a gallery post.
	 *
	 * @param \WP_Post $post Source gallery.
	 * @return int|\WP_Error New post id.
	 */
	private function duplicate( \WP_Post $post ) {
		$title = '' !== $post->post_title ? $post->post_title : __( 'Untitled Gallery', 'easy-lightbox-wp' );

		return wp_insert_post(
			array(
				'post_type'    => PostType::POST_TYPE,
				// The copy keeps the source's status so its shortcode renders straight
				// away — a duplicate that silently shows nothing reads as a bug.
				'post_status'  => in_array( $post->post_status, array( 'publish', 'draft' ), true ) ? $post->post_status : 'draft',
				'post_title'   => sprintf(
					/* translators: %s: source gallery title. */
					__( '%s (Copy)', 'easy-lightbox-wp' ),
					$title
				),
				'post_content' => $post->post_content,
			),
			true
		);
	}
}

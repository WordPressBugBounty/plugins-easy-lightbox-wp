<?php
/**
 * REST transport for the Ready Patterns library.
 *
 * Thin by design: every decision lives in
 * {@see \ShapedPlugin\ShapedGallery\Patterns\PatternLibrary}, and these handlers
 * only unwrap parameters and wrap answers — a handler that ends in a response
 * object is awkward to drive from a test, so nothing worth testing is allowed
 * to live in one.
 *
 * A separate controller rather than four more routes on
 * {@see GalleryController}: one controller per subsystem, sharing only the
 * namespace.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Rest;

use ShapedPlugin\ShapedGallery\Patterns\PatternLibrary;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'WPINC' ) ) {
	die; }

/**
 * Registers the Ready Patterns routes under `shaped-gallery/v1`.
 */
class PatternController {

	/**
	 * The shared REST namespace.
	 *
	 * @var string
	 */
	public const NAMESPACE = GalleryController::NAMESPACE;

	/**
	 * The library.
	 *
	 * @var PatternLibrary
	 */
	private PatternLibrary $library;

	/**
	 * Constructor.
	 *
	 * @param PatternLibrary|null $library Injected for tests; defaults to a new one.
	 */
	public function __construct( ?PatternLibrary $library = null ) {
		$this->library = $library ?? new PatternLibrary();
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Permission gate for every route here.
	 *
	 * `edit_posts`, NOT the plugin's usual `manage_options` (§2). These routes back
	 * a control inside the post editor, so the capability that has to be true is
	 * "may author content" — gating on `manage_options` would hand an Editor a
	 * button that 403s, which is worse than not drawing it. Nothing here reads or
	 * writes site configuration; the heaviest thing it does is one outbound GET to
	 * a URL an administrator chose.
	 *
	 * The module switch is folded in so "off" is enforced on the server and not
	 * merely hidden in the editor (§6.9).
	 *
	 * @return bool|WP_Error
	 */
	public function can_use() {
		if ( ! PatternLibrary::is_enabled() ) {
			return new WP_Error(
				'shaped_gallery_patterns_disabled',
				__( 'The Ready Patterns module is switched off.', 'easy-lightbox-wp' ),
				array( 'status' => 403 )
			);
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'shaped_gallery_patterns_forbidden',
				__( 'You are not allowed to browse the pattern library.', 'easy-lightbox-wp' ),
				array( 'status' => rest_authorization_required_code() )
			);
		}

		return true;
	}

	/**
	 * Register the routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		$permission = array( $this, 'can_use' );

		register_rest_route(
			self::NAMESPACE,
			'/patterns',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_patterns' ),
				'permission_callback' => $permission,
				'args'                => array(
					'refresh' => array(
						'type'              => 'boolean',
						'default'           => false,
						'sanitize_callback' => 'rest_sanitize_boolean',
					),
				),
			)
		);

		/*
		 * POST, not GET with `refresh=1`: it performs outbound work and rewrites a
		 * stored value, which is the same reasoning `/license/check` and
		 * `/watermark/purge` are POSTs for (§9). The GET route's `refresh` arg stays
		 * for a client that would rather do it in one call.
		 */
		register_rest_route(
			self::NAMESPACE,
			'/patterns/refresh',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'refresh_patterns' ),
				'permission_callback' => $permission,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/patterns/import',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'import_pattern' ),
				'permission_callback' => $permission,
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/patterns/favorites',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_favorites' ),
					'permission_callback' => $permission,
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'toggle_favorite' ),
					'permission_callback' => $permission,
					'args'                => array(
						'id'     => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
						'action' => array(
							'type'              => 'string',
							'default'           => 'add',
							'enum'              => array( 'add', 'remove' ),
							'sanitize_callback' => 'sanitize_key',
						),
					),
				),
			)
		);
	}

	/**
	 * GET /patterns.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_patterns( WP_REST_Request $request ) {
		$manifest = $this->library->manifest( (bool) $request->get_param( 'refresh' ) );

		return is_wp_error( $manifest ) ? $manifest : rest_ensure_response( $manifest );
	}

	/**
	 * POST /patterns/refresh.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function refresh_patterns() {
		$manifest = $this->library->manifest( true );

		return is_wp_error( $manifest ) ? $manifest : rest_ensure_response( $manifest );
	}

	/**
	 * POST /patterns/import.
	 *
	 * The markup is returned to the editor UNESCAPED and is parsed there — it is
	 * block markup, and escaping it would destroy the delimiter comments that make
	 * it a pattern. It never touches this site's database on the way through: the
	 * editor parses it into blocks and the user saves the post as they always do,
	 * so it passes through core's own save-time filtering like any other content.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function import_pattern( WP_REST_Request $request ) {
		$markup = $this->library->import( (int) $request->get_param( 'id' ) );

		if ( is_wp_error( $markup ) ) {
			return $markup;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'rawData' => $markup,
			)
		);
	}

	/**
	 * GET /patterns/favorites.
	 *
	 * @return WP_REST_Response
	 */
	public function get_favorites() {
		return rest_ensure_response( array( 'favorites' => $this->library->favorites() ) );
	}

	/**
	 * POST /patterns/favorites.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function toggle_favorite( WP_REST_Request $request ) {
		$favorites = $this->library->toggle_favorite(
			(int) $request->get_param( 'id' ),
			(string) $request->get_param( 'action' )
		);

		return rest_ensure_response( array( 'favorites' => $favorites ) );
	}
}

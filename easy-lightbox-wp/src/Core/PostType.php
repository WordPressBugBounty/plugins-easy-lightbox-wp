<?php
/**
 * Hidden custom post type for stored galleries.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Core;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Registers the `shaped_gallery` CPT — one post per reusable gallery.
 *
 * The CPT is hidden from the standard sidebar (`show_in_menu => false`) — our own
 * top-level menu provides the management screens — but it DOES use the native
 * block editor (`show_ui` + `supports: editor` + `show_in_rest`). That is the whole
 * reusable-gallery model: a gallery is an ordinary post whose content is the
 * serialized `shaped-gallery/gallery` block, edited with the same Gutenberg UI, saved
 * with the same `serialize_blocks()`, rendered by the same `render_callback`.
 *
 * `template` is what makes a new gallery open with the block already inserted, so
 * the user never has to find it in the inserter (see also
 * {@see \ShapedPlugin\ShapedGallery\Admin\GalleryEditor::allowed_blocks()}, which
 * narrows the inserter to the gallery block on this screen).
 */
class PostType {

	const POST_TYPE = 'shaped_gallery';

	/**
	 * The post type's capability type: singular and plural bases.
	 *
	 * Declared here and read by {@see Capabilities}, so the capability NAMES and the
	 * grant that hands them out are derived from one string rather than spelled twice.
	 *
	 * @var array<int,string>
	 */
	const CAPABILITY_TYPE = array( 'shaped_gallery', 'shaped_galleries' );

	/**
	 * The post type's REST base, declared once.
	 *
	 * Read by {@see self::register()} and by {@see self::blocks_rest_read()}, which
	 * has to match the route core builds from it — a second spelling is a guard that
	 * silently stops covering the route it was written for.
	 *
	 * @var string
	 */
	const REST_BASE = 'shaped-galleries';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( $this, 'register' ) );

		/*
		 * Reads of this post type through core's own route, gated. `show_in_rest` has
		 * to stay true — the native block editor is the gallery editor — but core reads
		 * `publish` as "anyone may see this" regardless of `public` or
		 * `publicly_queryable` ({@see \WP_REST_Posts_Controller::check_read_permission()}),
		 * so a bare `show_in_rest` published every gallery's title and rendered markup
		 * to anonymous callers.
		 *
		 * `rest_pre_dispatch` rather than `rest_shaped_gallery_query`, because the query
		 * filter only reaches the COLLECTION: `/wp/v2/shaped-galleries/<id>` resolves one
		 * post and never runs it. One dispatch guard covers the collection, the single
		 * item, and the revision and autosave sub-routes that come with `supports`.
		 */
		add_filter( 'rest_pre_dispatch', array( $this, 'restrict_rest_reads' ), 10, 3 );
	}

	/**
	 * Short-circuit a REST read of this post type the current user may not browse.
	 *
	 * Thin glue over {@see self::blocks_rest_read()}, which owns the decision.
	 *
	 * @param mixed            $result  Dispatch short-circuit, passed through untouched.
	 * @param \WP_REST_Server  $server  Server instance.
	 * @param \WP_REST_Request $request The request.
	 * @return mixed
	 */
	public function restrict_rest_reads( $result, $server, $request ) {
		if ( null !== $result ) {
			return $result;
		}

		if ( ! self::blocks_rest_read( (string) $request->get_route(), (string) $request->get_method() ) ) {
			return $result;
		}

		return new \WP_Error(
			'shaped_gallery_rest_forbidden',
			__( 'Sorry, you are not allowed to browse galleries.', 'easy-lightbox-wp' ),
			array( 'status' => rest_authorization_required_code() )
		);
	}

	/**
	 * Whether this request is a gallery read the current user may not make.
	 *
	 * Split from the filter so the rule is assertable without a `WP_REST_Server`.
	 *
	 * The capability is `edit_posts`, matching the gate the builder integrations
	 * already apply. Browsing is a deliberately LOWER bar than authoring:
	 *
	 * - **Authoring** a gallery is administration — what every screen and route in
	 *   this plugin requires.
	 * - **Browsing** the list, to place an existing gallery on a page, only needs the
	 *   ability to edit the page you are placing it on. An Editor building a page in
	 *   Elementor must still be able to pick a gallery from the dropdown, and
	 *   {@see \ShapedPlugin\ShapedGallery\Integrations\GalleryEmbed::choices()} has always
	 *   gated exactly that on `edit_posts` for exactly this reason ("gallery titles are
	 *   not public data").
	 *
	 * So this guard makes core's route agree with the gate the builder integrations
	 * already apply, rather than inventing a third answer.
	 *
	 * Writes are deliberately not considered: they are governed by the post type's
	 * capabilities, which core enforces on its own. This closes a READ hole.
	 *
	 * @param string $route  Requested REST route.
	 * @param string $method Request method.
	 * @return bool
	 */
	public static function blocks_rest_read( string $route, string $method ): bool {
		if ( ! in_array( strtoupper( $method ), array( 'GET', 'HEAD' ), true ) ) {
			return false;
		}

		$base = '/wp/v2/' . self::REST_BASE;

		// The collection, one item, and anything below it (revisions, autosaves).
		if ( $route !== $base && 0 !== strpos( $route, $base . '/' ) ) {
			return false;
		}

		return ! current_user_can( 'edit_posts' );
	}

	/**
	 * Register the post type.
	 *
	 * @return void
	 */
	public function register(): void {
		$labels = array(
			'name'               => _x( 'Photo Galleries', 'post type general name', 'easy-lightbox-wp' ),
			'singular_name'      => _x( 'ShapedGallery', 'post type singular name', 'easy-lightbox-wp' ),
			'menu_name'          => __( 'ShapedGallery', 'easy-lightbox-wp' ),
			'all_items'          => __( 'Saved Galleries', 'easy-lightbox-wp' ),
			'add_new'            => __( 'Add New Gallery', 'easy-lightbox-wp' ),
			'add_new_item'       => __( 'Add New Gallery', 'easy-lightbox-wp' ),
			'edit_item'          => __( 'Edit Gallery', 'easy-lightbox-wp' ),
			'new_item'           => __( 'New Gallery', 'easy-lightbox-wp' ),
			'view_item'          => __( 'View Gallery', 'easy-lightbox-wp' ),
			'search_items'       => __( 'Search Galleries', 'easy-lightbox-wp' ),
			'not_found'          => __( 'No galleries found.', 'easy-lightbox-wp' ),
			'not_found_in_trash' => __( 'No galleries found in Trash.', 'easy-lightbox-wp' ),
			'item_updated'       => __( 'Gallery updated.', 'easy-lightbox-wp' ),
		);

		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => $labels,
				'public'              => false,
				'publicly_queryable'  => false,
				/*
				 * Unconditional. This used to be `current_user_can( 'manage_options' )`,
				 * which made the post type a different object depending on who was
				 * asking: registration is process-wide and its `/wp/v2/types` payload is
				 * cached by the block editor, so whichever role warmed that cache defined
				 * the UI for everyone. It also forced a `current_user_can()` call on
				 * `init`, before REST cookie authentication has decided whether the
				 * cookie-identified user is authorized for this request at all.
				 *
				 * Who may use the screens is a CAPABILITY question, answered by the
				 * capability model below — which is the mechanism that actually refuses
				 * them, rather than merely declining to draw them a link.
				 */
				'show_ui'             => true,
				'show_in_menu'        => false, // Hidden from sidebar; our Menu adds pages.
				'show_in_nav_menus'   => false,
				'show_in_admin_bar'   => false,
				// Required by the native block editor. Reads are narrowed on
				// `rest_pre_dispatch` — see self::blocks_rest_read().
				'show_in_rest'        => true,
				'rest_base'           => self::REST_BASE,
				'exclude_from_search' => true,
				'has_archive'         => false,
				'hierarchical'        => false,
				'rewrite'             => false,
				'query_var'           => false,
				/*
				 * A capability set of this post type's OWN, granted to the administrator
				 * by {@see Capabilities}.
				 *
				 * `capability_type => 'post'` was the gap: any role with `edit_posts`
				 * could author a gallery through core's editor and REST route, while every
				 * screen and route in this plugin required `manage_options` — two doors,
				 * two locks, and the weaker one was core's.
				 *
				 * The thing NOT to do here, having tried it, is map the post type onto
				 * `manage_options`. That is a settings capability with no content meaning;
				 * it leaves a site no way to say "this role may manage galleries" short of
				 * granting the whole options screen; and it collapses every primitive
				 * (`edit_posts`, `edit_others_posts`, `edit_published_posts`,
				 * `delete_private_posts`) into one identical check, so `map_meta_cap()`
				 * still runs but can no longer tell an author from a stranger or a draft
				 * from a published gallery. A dedicated capability type is what core is
				 * built for and keeps all of that working.
				 */
				'capability_type'     => self::CAPABILITY_TYPE,
				'map_meta_cap'        => true,
				'supports'            => array( 'title', 'editor', 'custom-fields', 'revisions' ),
				/*
				 * A new gallery opens with the block already in the canvas. No
				 * attributes here: the block's own `align` default is wide
				 * ({@see \ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryAttributesFactory::get_alignment_attribute()}),
				 * so the canvas is wide enough for the layout picker wherever the block
				 * is inserted — this screen and an ordinary post alike — rather than
				 * only where this template happens to run.
				 *
				 * Left unlocked on purpose: locking would also forbid deleting and
				 * re-inserting the block, which is how a user starts over.
				 */
				'template'            => array( array( 'shaped-gallery/gallery' ) ),
				'template_lock'       => false,
			)
		);

		$this->register_meta();
	}

	/**
	 * Register the layout-cache meta (used by the list table) and expose it to REST.
	 *
	 * @return void
	 */
	private function register_meta(): void {
		register_post_meta(
			self::POST_TYPE,
			'_shaped_gallery_layout',
			array(
				'type'          => 'string',
				'single'        => true,
				'default'       => 'justified',
				'show_in_rest'  => true,
				'auth_callback' => static function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		register_post_meta(
			self::POST_TYPE,
			'_shaped_gallery_item_count',
			array(
				'type'          => 'integer',
				'single'        => true,
				'default'       => 0,
				'show_in_rest'  => true,
				'auth_callback' => static function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
}

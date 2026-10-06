<?php
/**
 * Native block-editor integration for the gallery CPT.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Admin;

use ShapedPlugin\ShapedGallery\Core\PostType;
use ShapedPlugin\ShapedGallery\Frontend\Frontend;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Makes editing a `shaped_gallery` post feel like editing the block inside a page.
 *
 * A reusable gallery is deliberately NOT a bespoke editor: it is an ordinary post of
 * the `shaped_gallery` type opened in Gutenberg (`post-new.php` / `post.php`), so the
 * canvas, the inspector, the toolbar, undo/redo, autosave, revisions and
 * `serialize_blocks()` are core's — there is exactly one editor UI and one
 * serialization format in the plugin. This class only supplies the screen's
 * integration glue:
 *
 * - the inserter is narrowed to the gallery block (a gallery post holds a gallery),
 * - the plugin's own top-level menu stays open and lit while the editor is on screen,
 * - the legacy `page=shaped-gallery-new` screen (the old headless React editor) 302s to
 *   the native editor so every stored link, bookmark and dashboard CTA keeps working,
 * - core's own `edit.php?post_type=shaped_gallery` list table 302s to Manage Galleries,
 *   because the editor's built-in "back" button links there and nowhere lets a site
 *   reach it any other way,
 * - "post updated" notices name the gallery's permanent shortcode.
 *
 * Scope is the admin screen only. The shortcode itself lives in {@see Frontend}; the
 * derived list-table meta in {@see \ShapedPlugin\ShapedGallery\Core\GalleryMeta}.
 */
class GalleryEditor {

	/**
	 * Legacy "Add New Gallery" page slug (the removed headless React editor).
	 *
	 * Kept only as a redirect source: it is still referenced by saved bookmarks and
	 * by any third-party link built before the native editor landed.
	 *
	 * @var string
	 */
	const LEGACY_SLUG = 'shaped-gallery-new';

	/**
	 * The block a gallery editor is narrowed to, and the one seeded into a new page.
	 *
	 * A §2 fixed identifier. Held here because this class makes the same statement
	 * twice — {@see self::allowed_blocks()} says "this is the only block a gallery
	 * post may contain" and {@see self::seed_block_content()} says "this is the block
	 * a new page starts with" — and the two must never disagree.
	 *
	 * @var string
	 */
	const BLOCK = 'shaped-gallery/gallery';

	/**
	 * Query arg that opens a NEW post with the gallery block already in it.
	 *
	 * Mirrors `shapedpatterns` (§4b) in shape and spelling deliberately: both are
	 * "open the editor in this state" args read once off a dashboard link.
	 *
	 * @var string
	 */
	const INSERT_ARG = 'shapedblock';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_init', array( $this, 'redirect_legacy_screen' ), 1 );
		add_action( 'admin_init', array( $this, 'redirect_list_table' ), 1 );
		add_filter( 'default_content', array( $this, 'seed_block_content' ), 10, 2 );
		add_filter( 'parent_file', array( $this, 'highlight_parent_menu' ) );
		add_filter( 'submenu_file', array( $this, 'highlight_submenu' ), 10, 2 );
		add_filter( 'allowed_block_types_all', array( $this, 'allowed_blocks' ), 10, 2 );
		add_filter( 'use_block_editor_for_post_type', array( $this, 'force_block_editor' ), 100, 2 );
		add_filter( 'post_updated_messages', array( $this, 'updated_messages' ) );
	}

	/**
	 * URL of the native "Add New Gallery" screen.
	 *
	 * The one place this URL is built — the menu, the dashboard config and the
	 * legacy redirect all read it, so the editor can move without a hunt.
	 *
	 * @return string
	 */
	public static function new_url(): string {
		return admin_url( 'post-new.php?post_type=' . PostType::POST_TYPE );
	}

	/**
	 * URL of the native editor for one gallery.
	 *
	 * @param int $gallery_id Gallery post id.
	 * @return string
	 */
	public static function edit_url( int $gallery_id ): string {
		return admin_url( 'post.php?post=' . $gallery_id . '&action=edit' );
	}

	/**
	 * URL of a NEW ordinary page, opened with the gallery block already inserted.
	 *
	 * This is the block-first route, and it is deliberately NOT {@see self::new_url()}.
	 * The two create different things and the dashboard offers both:
	 *
	 * - `new_url()` makes a `shaped_gallery` post — a REUSABLE gallery, whose product is
	 *   a shortcode to paste elsewhere. That is the Saved Galleries flow.
	 * - this one drops the block straight into a page, where the gallery IS the
	 *   content. Nothing is reusable and no shortcode exists, which is exactly what
	 *   the Dashboard banner promises ("no shortcode needed").
	 *
	 * Sending the Dashboard's primary CTA at `new_url()` was a real bug: a user who
	 * asked to build a gallery landed on the shortcode screen instead of on a page.
	 *
	 * Returns '' — which hides the button rather than printing a link to a screen
	 * WordPress will refuse — when the user cannot create the target type. In
	 * practice the dashboard is `manage_options` (see {@see Menu::CAPABILITY}), so
	 * this is a guard against a filtered-down capability, not the common case.
	 *
	 * @return string Empty when the current user cannot create the target post type.
	 */
	public static function block_page_url(): string {
		$post_type = self::starter_post_type();
		$type      = get_post_type_object( $post_type );

		if ( ! $type instanceof \WP_Post_Type || ! current_user_can( $type->cap->create_posts ) ) {
			return '';
		}

		return add_query_arg(
			array(
				'post_type'        => $post_type,
				self::INSERT_ARG   => 'true',
			),
			admin_url( 'post-new.php' )
		);
	}

	/**
	 * The post type a block-first gallery starts in.
	 *
	 * A page, because that is what the banner's own copy says ("add the block to any
	 * page"). Filterable for a site whose galleries live in a custom type, and
	 * validated afterwards so a filter returning a type that was never registered
	 * falls back rather than building a URL to a 404.
	 *
	 * @return string
	 */
	private static function starter_post_type(): string {
		/**
		 * Filters the post type the Dashboard's "Create New Gallery" button opens.
		 *
		 * Must be a REGISTERED, editor-backed public type; `shaped_gallery` itself is
		 * rejected, since that type seeds its own block through `template` and would
		 * end up with two.
		 *
		 * @since 1.0.0
		 *
		 * @param string $post_type Target post type.
		 */
		$post_type = (string) apply_filters( 'shaped_gallery_block_starter_post_type', 'page' );

		if ( ! post_type_exists( $post_type ) || PostType::POST_TYPE === $post_type ) {
			return 'page';
		}

		return $post_type;
	}

	/**
	 * Seed a new post's content with one empty gallery block.
	 *
	 * `default_content` is the seam, not JavaScript: core applies it inside
	 * `get_default_post_to_edit()`, so the block is already in `post_content` before
	 * the editor boots and Gutenberg parses it like any other saved block. Inserting
	 * it from the browser instead would mean racing the editor's own mount, and §12
	 * keeps DOM work out of the editor.
	 *
	 * The block is emitted with NO attributes, which is what makes the layout picker
	 * appear: `edit.jsx` opens on the picker whenever `items` is empty. It is the
	 * same one-line markup `PostType::register()`'s `template` produces for a gallery
	 * post, so the two entry points paint the identical first screen (§18).
	 *
	 * @param string        $content Default content so far.
	 * @param \WP_Post|null $post    The post being created.
	 * @return string
	 */
	public function seed_block_content( $content, $post = null ) {
		if ( 'post-new.php' !== ( $GLOBALS['pagenow'] ?? '' ) ) {
			return $content;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only editor seeding; nothing is written until the user saves.
		$asked = isset( $_GET[ self::INSERT_ARG ] ) ? sanitize_key( wp_unslash( $_GET[ self::INSERT_ARG ] ) ) : '';
		if ( 'true' !== $asked ) {
			return $content;
		}

		/*
		 * `shaped_gallery` is excluded, not merely unhandled: that type already inserts
		 * this block through its own `template`, so honouring the arg there would
		 * open a gallery post containing two of them.
		 */
		if ( ! $post instanceof \WP_Post || PostType::POST_TYPE === $post->post_type ) {
			return $content;
		}

		$type = get_post_type_object( $post->post_type );
		if ( ! $type instanceof \WP_Post_Type || ! current_user_can( $type->cap->create_posts ) ) {
			return $content;
		}

		$block = '<!-- wp:' . self::BLOCK . ' /-->';

		// Prepended, not substituted: another plugin may have a `default_content` of
		// its own, and dropping it would be this filter overreaching.
		return '' === $content ? $block : $block . "\n\n" . $content;
	}

	/**
	 * Whether the current admin screen is the gallery editor.
	 *
	 * @return bool
	 */
	public static function is_editor_screen(): bool {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return false;
		}
		$screen = get_current_screen();

		return $screen instanceof \WP_Screen
			&& PostType::POST_TYPE === $screen->post_type
			&& in_array( $screen->base, array( 'post', 'edit' ), true );
	}

	/**
	 * 302 the legacy Add New Gallery page to the native editor.
	 *
	 * Runs on `admin_init` for the same reason {@see Dashboard::maybe_redirect_route()}
	 * does: authentication and `admin_menu` have run, nothing has been output yet, so
	 * the `Location` header cannot fail. `gallery_id` — the query var the old screen
	 * used to load a gallery for editing — is honoured, so an "Edit" bookmark still
	 * lands on the right gallery.
	 *
	 * @return void
	 */
	public function redirect_legacy_screen(): void {
		if ( 'admin.php' !== ( $GLOBALS['pagenow'] ?? '' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Menu routing, no state change.
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		if ( self::LEGACY_SLUG !== $page ) {
			return;
		}

		// Let WordPress render its own permission error on the URL the user asked for.
		if ( ! current_user_can( Menu::CAPABILITY ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only routing.
		$gallery_id = isset( $_GET['gallery_id'] ) ? absint( wp_unslash( $_GET['gallery_id'] ) ) : 0;
		$target     = self::new_url();

		if ( $gallery_id > 0 && PostType::POST_TYPE === get_post_type( $gallery_id ) ) {
			$target = self::edit_url( $gallery_id );
		}

		wp_safe_redirect( $target );
		exit;
	}

	/**
	 * 302 core's own `edit.php?post_type=shaped_gallery` list table to Manage Galleries.
	 *
	 * That URL renders — `show_ui` is true, which the native editor needs — even
	 * though `show_in_menu` is false and nothing in this plugin links to it, because
	 * core's block editor computes it itself for the built-in "back" button
	 * (`edit.php?post_type=<slug>`, from the post type's own REST-exposed `slug`) with
	 * no filter to point it elsewhere. That button renders through a Slot/Fill that is
	 * a WordPress PRIVATE API (`@wordpress/edit-post`'s `unlock()`), off-limits to a
	 * plugin, so the URL itself is the only seam available — the same fix
	 * {@see self::redirect_legacy_screen()} already applies to the old Add New Gallery
	 * screen. Without it, the editor's own back arrow was the one path back to "my
	 * galleries" that did NOT reach this plugin's Manage Galleries screen — the
	 * browser's Back button (real history) and every link this plugin prints already
	 * did — landing instead on core's bare, unstyled list table for a post type this
	 * plugin otherwise never surfaces one for.
	 *
	 * @return void
	 */
	public function redirect_list_table(): void {
		if ( 'edit.php' !== ( $GLOBALS['pagenow'] ?? '' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only routing.
		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : '';
		if ( PostType::POST_TYPE !== $post_type ) {
			return;
		}

		// Let WordPress render its own permission error on the URL the user asked for.
		if ( ! current_user_can( Menu::CAPABILITY ) ) {
			return;
		}

		wp_safe_redirect( Dashboard::page_url( Dashboard::MANAGE_ROUTE ) );
		exit;
	}

	/**
	 * Keep the ShapedGallery top-level menu open while the editor is on screen.
	 *
	 * The CPT is `show_in_menu => false`, so core has no menu to light up and would
	 * fall back to highlighting nothing (or, worse, Posts).
	 *
	 * @param string $parent_file Current parent menu file.
	 * @return string
	 */
	public function highlight_parent_menu( $parent_file ) {
		return self::is_editor_screen() ? Menu::SLUG : $parent_file;
	}

	/**
	 * Light the matching sub-item: "Add New Gallery" when creating, "Manage
	 * Galleries" when editing an existing gallery.
	 *
	 * @param string|null $submenu_file Current submenu file.
	 * @param string      $parent_file  Current parent menu file.
	 * @return string|null
	 */
	public function highlight_submenu( $submenu_file, $parent_file ) {
		if ( Menu::SLUG !== $parent_file || ! self::is_editor_screen() ) {
			return $submenu_file;
		}

		$screen = get_current_screen();

		return ( $screen && 'add' === $screen->action ) ? self::new_url_slug() : Menu::SLUG;
	}

	/**
	 * Narrow the inserter to the gallery block on the gallery editor screen.
	 *
	 * A `shaped_gallery` post exists to hold ONE gallery, and the screenshot spec shows
	 * an inserter containing just that block. Everything else core would offer
	 * (paragraphs, headings, patterns) would be saved into `post_content` and then
	 * rendered by the shortcode — content the gallery entity does not model.
	 *
	 * @param bool|string[]            $allowed Allowed block types, or true for all.
	 * @param \WP_Block_Editor_Context $context Editor context.
	 * @return bool|string[]
	 */
	public function allowed_blocks( $allowed, $context ) {
		$post = $context->post ?? null;
		if ( ! $post || PostType::POST_TYPE !== $post->post_type ) {
			return $allowed;
		}

		/**
		 * Filters the blocks allowed inside a reusable gallery.
		 *
		 * An add-on that stores extra content alongside the gallery (a caption block,
		 * a heading) adds its block name here instead of unfiltering the whole screen.
		 *
		 * @since 1.0.0
		 *
		 * @param string[] $blocks   Allowed block names.
		 * @param \WP_Post $gallery  The gallery being edited.
		 */
		$blocks = (array) apply_filters(
			'shaped_gallery_editor_allowed_blocks',
			array( self::BLOCK ),
			$post
		);

		$blocks = array_values( array_filter( array_map( 'strval', $blocks ) ) );

		return $blocks ? $blocks : $allowed;
	}

	/**
	 * Force the block editor for galleries.
	 *
	 * The gallery IS serialized block markup — a classic-editor textarea would let a
	 * user save content the renderer cannot parse. Scoped to this one post type, so a
	 * site's global classic-editor preference is untouched everywhere else.
	 *
	 * @param bool   $use_block_editor Whether to use the block editor.
	 * @param string $post_type        Post type being edited.
	 * @return bool
	 */
	public function force_block_editor( $use_block_editor, $post_type ) {
		return PostType::POST_TYPE === $post_type ? true : $use_block_editor;
	}

	/**
	 * Gallery-specific "post updated" notices that name the shortcode.
	 *
	 * Core's defaults talk about viewing and previewing a post; a gallery is not
	 * viewable on its own, so the useful thing to say is where to paste it.
	 *
	 * @param array<string,array<int,string>> $messages Post updated messages.
	 * @return array<string,array<int,string>>
	 */
	public function updated_messages( $messages ) {
		$post_id   = absint( get_the_ID() );
		$shortcode = $post_id ? Frontend::shortcode_for( $post_id ) : '';

		$saved = $shortcode
			? sprintf(
				/* translators: %s: gallery shortcode, e.g. [shaped_gallery id="12"]. */
				__( 'Gallery saved. Use %s to place it anywhere.', 'easy-lightbox-wp' ),
				$shortcode
			)
			: __( 'Gallery saved.', 'easy-lightbox-wp' );

		$messages[ PostType::POST_TYPE ] = array(
			0  => '',
			1  => $saved,
			2  => __( 'Custom field updated.', 'easy-lightbox-wp' ),
			3  => __( 'Custom field deleted.', 'easy-lightbox-wp' ),
			4  => __( 'Gallery updated.', 'easy-lightbox-wp' ),
			5  => __( 'Gallery restored to revision.', 'easy-lightbox-wp' ),
			6  => $saved,
			7  => __( 'Gallery saved.', 'easy-lightbox-wp' ),
			8  => __( 'Gallery submitted.', 'easy-lightbox-wp' ),
			9  => __( 'Gallery scheduled.', 'easy-lightbox-wp' ),
			10 => __( 'Gallery draft updated.', 'easy-lightbox-wp' ),
		);

		return $messages;
	}

	/**
	 * The submenu file WordPress uses for the native "Add New Gallery" entry.
	 *
	 * `add_submenu_page()` was given a file-style slug, so the highlight has to be
	 * matched against that same relative string — not the absolute URL.
	 *
	 * @return string
	 */
	public static function new_url_slug(): string {
		return 'post-new.php?post_type=' . PostType::POST_TYPE;
	}
}

<?php
/**
 * Easy Lightbox compatibility: the decision to run it, and the assets it needs.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Deprecated;

use ShapedPlugin\ShapedGallery\Core\Install;
use ShapedPlugin\ShapedGallery\Modules\Lightbox;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Keeps the lightbox working on sites that were running Easy Lightbox when 1.2.0
 * replaced it with ShapedGallery.
 *
 * DEPRECATED BY DESIGN (CLAUDE.md §25). `src/Deprecated/` and `app/deprecated/`
 * are one layer with one expiry: a future major deletes both folders, the single
 * `( new EasyLightboxCompat() )->hooks()` line in {@see Plugin}, and the one
 * `initLegacy()` call in `app/frontend/lightbox.js`. Nothing else in the plugin
 * may depend on anything in here, which is what makes that deletion a deletion
 * rather than an unpick.
 *
 * ## Why this exists at all
 *
 * This plugin ships from Easy Lightbox's WordPress.org slug (§24): ~1,000 sites
 * take 1.2.0 as an UPDATE, not as a new install. Easy Lightbox's whole front end
 * was a lightbox bound to `.litebox` links and to the classic `[gallery]`
 * shortcode, loaded on every page. Shipping 1.2.0 without this layer would stop
 * every one of those lightboxes — silently, with no error and no setting to find
 * — and turn each one into a full-page jump to a bare image file. The readme's
 * 1.2.0 entry promises the opposite, and this is where that promise is kept.
 *
 * ## Why it is not a module
 *
 * Every entry in {@see \ShapedPlugin\ShapedGallery\Modules\ModuleRegistry} ships
 * ENABLED (§3), and the JS and PHP default maps have to agree. This layer's
 * correct default is the exact opposite on the two halves of the installed base:
 * on for a migrated site, off for a new one. That is not a product switch, it is
 * a migration answer, so it reads {@see Install::is_migrated()} rather than
 * inventing a fourth module card nobody on a new install should ever see.
 *
 * ## The one departure from §10
 *
 * §10 is "nothing global": frontend assets load from inside `Gallery::render()`,
 * so a gallery-free page downloads nothing. This layer enqueues the viewer bundle
 * on every front-end view of a migrated site, and that is deliberate.
 *
 * Legacy markup has no container to detect. `.litebox` links arrive from post
 * content, widgets, theme templates and other plugins' shortcodes; sniffing the
 * main query's `post_content` would answer for one post on a singular view and
 * for nothing at all on an archive, a 404 or a page built by a theme template.
 * Guessing wrong reintroduces exactly the silent breakage this class exists to
 * prevent, so it does not guess.
 *
 * What it costs those sites is also not new: Easy Lightbox enqueued jQuery,
 * `images-loaded.min.js`, `litebox.min.js` and `litebox.min.css` on every page of
 * the same sites. This is one script and one stylesheet, with no jQuery. Sites
 * that know they have no legacy markup left can switch the layer off with the
 * {@see self::FILTER} filter, and a site that finishes migrating its content can
 * leave it off for good.
 */
final class EasyLightboxCompat {

	/**
	 * Filter overriding whether the compatibility layer runs.
	 *
	 * The documented escape hatch for a migrated site that has finished moving its
	 * content onto the block — and the one way a site can opt back IN after
	 * deliberately re-creating legacy markup on a new install.
	 *
	 * @var string
	 */
	const FILTER = 'shaped_gallery_easy_lightbox_compat';

	/**
	 * The viewer bundle's script handle, registered by
	 * {@see \ShapedPlugin\ShapedGallery\Blocks\BlocksInit::register_assets()}.
	 *
	 * This layer registers NO assets of its own. It enqueues the viewer the
	 * gallery block already ships, which is what keeps one viewer on the page
	 * however the overlay was opened — and what makes deleting this folder cost
	 * nothing in bundle surface.
	 *
	 * @var string
	 */
	const SCRIPT_HANDLE = 'shaped-gallery-lightbox';

	/**
	 * The viewer bundle's style handle.
	 *
	 * @var string
	 */
	const STYLE_HANDLE = 'shaped-gallery-lightbox-style';

	/**
	 * Hook registration.
	 *
	 * `wp_enqueue_scripts` only — the hook does not fire in the admin, in a feed or
	 * on a REST request, so there is no `is_admin()` branch to write.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Whether the compatibility layer runs on this request.
	 *
	 * Two conditions, both necessary. The site must have come from Easy Lightbox,
	 * and the Lightbox module must be on: a site that switched the viewer off in
	 * Settings → Modules switched off the viewer, and a compatibility layer that
	 * ignored that would be the plugin arguing with its own setting.
	 *
	 * @return bool
	 */
	public static function is_active(): bool {
		$active = Install::is_migrated() && Lightbox::is_enabled();

		/**
		 * Filters whether the Easy Lightbox compatibility layer runs.
		 *
		 * @since 1.2.0
		 *
		 * @param bool $active Whether the layer is active for this site.
		 */
		return (bool) apply_filters( self::FILTER, $active );
	}

	/**
	 * Enqueue the viewer bundle and tell its runtime to bind legacy markup.
	 *
	 * The flag rides an inline script rather than the `shaped_gallery_frontend`
	 * localize payload, and that is not cosmetic: the payload is built at `init:5`
	 * when the handles are registered, long before a filter hooked at
	 * `wp_enqueue_scripts` could be read. Emitting the flag from the same method
	 * that does the enqueue is what makes it impossible for the two to disagree —
	 * the runtime can never be told to bind on a page that did not load it, nor
	 * stay idle on one that did.
	 *
	 * @return void
	 */
	public function enqueue(): void {
		if ( ! self::is_active() ) {
			return;
		}

		wp_enqueue_script( self::SCRIPT_HANDLE );
		wp_enqueue_style( self::STYLE_HANDLE );

		/*
		 * `before`, so the flag is in place when the bundle's own `init()` runs.
		 * The guarded assignment is for the case where the localize payload has not
		 * printed — a filtered or dequeued dependency — which would otherwise be a
		 * TypeError on an object the viewer still reads its defaults from.
		 */
		wp_add_inline_script( self::SCRIPT_HANDLE, self::inline_flag(), 'before' );
	}

	/**
	 * The inline script that switches the runtime's legacy binding on.
	 *
	 * A method rather than a literal inside {@see self::enqueue()} so the verifier
	 * can assert the shape of what ships, instead of asserting that a string
	 * appears somewhere in a file.
	 *
	 * @return string
	 */
	public static function inline_flag(): string {
		return 'window.shaped_gallery_frontend = window.shaped_gallery_frontend || {};'
			. ' window.shaped_gallery_frontend.deprecated = { easyLightbox: true };';
	}
}

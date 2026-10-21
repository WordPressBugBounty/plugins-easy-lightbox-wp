<?php
/**
 * Dashboard data + copy shipped to the React SPA.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Admin;

use ShapedPlugin\ShapedGallery\Modules\ReadyPatterns;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Builds the `shaped_gallery_admin.dashboard` payload.
 *
 * Every user-facing string on the dashboard lives here rather than in JSX so that one
 * filter — `shaped_gallery_dashboard_config` — re-skins the whole screen for
 * white-label builds without touching the bundle, and so the copy is reviewable in
 * one file instead of scattered across a dozen components. (`npm run makepot` scans
 * `app/` too, so translation coverage is not the reason — the JSX fallbacks are
 * extracted as well.)
 *
 * Pure static, registers no hooks: it is a data source, read by
 * {@see \ShapedPlugin\ShapedGallery\Core\Assets::enqueue_admin_bundle()}.
 */
class DashboardConfig {

	/**
	 * Documentation root. Sub-paths are appended by self::docs().
	 *
	 * The site's own root, not its `/guide/` tree: `/guide/` alone is not a page
	 * there, so a bare self::docs() has to land on the host. Every article path
	 * below therefore carries `guide/` itself.
	 *
	 * @var string
	 */
	const DOCS_BASE = 'https://docs.shapedgallery.com/';

	/**
	 * Review form linked from the dashboard footer.
	 *
	 * The slug in this URL is `easy-lightbox-wp`, not `shaped-gallery`, and that is
	 * not a mistake to tidy up: this build ships from the Easy Lightbox listing
	 * (§24), which is where its reviews actually live. A `shaped-gallery` URL is a
	 * 404 — and a dead review link is a review nobody leaves.
	 *
	 * @var string
	 */
	const REVIEW_URL = 'https://wordpress.org/support/plugin/easy-lightbox-wp/reviews/';

	/**
	 * Crisp website id used when `SHAPED_GALLERY_CRISP_WEBSITE_ID` is not defined.
	 *
	 * The ShapedPlugin support workspace — the same id WP Carousel ships in
	 * `WPCAROUSEL_CRISP_WEBSITE_ID` — so the dashboard opens a real chat out of the
	 * box instead of linking to the support page. A site that does not want a
	 * third-party script on this admin screen defines `SHAPED_GALLERY_CRISP_WEBSITE_ID`
	 * as an empty string in `wp-config.php`: nothing is requested and the support
	 * bubble goes back to a plain link. See self::live_chat(); self::sanitize_chat_id()
	 * re-validates the id either way.
	 *
	 * @var string
	 */
	const CRISP_WEBSITE_ID = '3770a55e-947f-424d-87b8-d93a86f2cd7b';

	/**
	 * Build the dashboard payload.
	 *
	 * @return array<string,mixed>
	 */
	public static function localize(): array {
		$user = wp_get_current_user();

		$config = array(
			'brand'        => self::brand(),
			'version'      => SHAPED_GALLERY_VERSION,
			// Not esc_html()'d: React escapes on render, and pre-escaping would print
			// entities literally (the classic PHP → React double-escape bug).
			'displayName'  => $user->exists() ? sanitize_text_field( (string) $user->display_name ) : '',
			'defaultRoute' => Dashboard::DEFAULT_ROUTE,
			'tabs'         => self::tabs(),
			'urls'         => self::urls(),
			'sidebarMenu'  => self::sidebar_menu(),
			'manage'       => self::manage(),
			'settingsPage' => self::settings_page(),
			'hero'         => self::hero(),
			'helpCenter'   => self::help_center(),
			'about'        => self::about(),
			'liveChat'     => self::live_chat(),
			'footer'       => self::footer(),
		);

		/**
		 * Filters the whole dashboard config before it reaches the browser.
		 *
		 * Every URL is re-escaped afterwards, so a filter cannot inject a
		 * `javascript:` href.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string,mixed> $config Dashboard payload.
		 */
		$config = (array) apply_filters( 'shaped_gallery_dashboard_config', $config );

		return self::harden( $config );
	}

	/**
	 * The product name shown on the dashboard.
	 *
	 * Every string that names the plugin interpolates this rather than spelling it
	 * out, so the screen can be re-branded from one place — and so translators get
	 * one sentence with a `%s` instead of six sentences with a hardcoded name.
	 *
	 * @return string
	 */
	private static function brand(): string {
		return __( 'ShapedGallery', 'easy-lightbox-wp' );
	}

	/**
	 * SPA nav. `leavesSpa` entries are plain links out of the dashboard.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private static function tabs(): array {
		return array(
			array(
				'key'   => Dashboard::DEFAULT_ROUTE,
				'label' => __( 'Dashboard', 'easy-lightbox-wp' ),
				'type'  => 'route',
			),
			array(
				// The route KEY stays `manage` — it is in every stored bookmark and in
				// the submenu redirect map. Only the label follows the design.
				'key'   => Dashboard::MANAGE_ROUTE,
				'label' => __( 'Saved Galleries', 'easy-lightbox-wp' ),
				'type'  => 'route',
			),
			array(
				'key'   => 'settings',
				'label' => __( 'Settings', 'easy-lightbox-wp' ),
				'type'  => 'route',
			),
			array(
				'key'   => 'about-us',
				'label' => __( 'About Us', 'easy-lightbox-wp' ),
				'type'  => 'route',
			),
		);
	}

	/**
	 * Every URL the dashboard links to.
	 *
	 * @return array<string,string>
	 */
	private static function urls(): array {
		return array(
			// The native block editor for the gallery CPT — there is no plugin-owned
			// "add new" screen to link to any more.
			'createGallery'  => GalleryEditor::new_url(),
			'manage'         => Dashboard::page_url( Dashboard::MANAGE_ROUTE ),
			'dashboard'      => Dashboard::page_url(),
			'settings'       => Dashboard::page_url( 'settings' ),
			'aboutUs'        => Dashboard::page_url( 'about-us' ),
			'docs'           => self::docs(),
			'support'        => 'https://shapedplugin.com/create-new-ticket/',
			'community'      => 'https://www.facebook.com/groups/shapedplugin',
			'youtube'        => 'https://www.youtube.com/@ShapedPlugin',
			'featureRequest' => 'https://shapedgallery.com/contact-us/',
			'review'         => self::REVIEW_URL,
		);
	}

	/**
	 * Selectors the SPA needs to keep the WP submenu highlight in sync with the hash.
	 *
	 * Kept in PHP so no DOM id or page slug is hardcoded in JSX.
	 *
	 * @return array<string,mixed>
	 */
	private static function sidebar_menu(): array {
		return array(
			'menuId'    => 'toplevel_page_' . Menu::SLUG,
			'pageSlugs' => array(
				Dashboard::DEFAULT_ROUTE => Dashboard::PAGE_SLUG,
				Dashboard::MANAGE_ROUTE  => Menu::SLUG,
				'settings'               => Dashboard::SETTINGS_SLUG,
				'about-us'               => Dashboard::ABOUT_SLUG,
			),
		);
	}

	/**
	 * Saved Galleries route: the first-run banner, table chrome and row actions.
	 *
	 * Only copy and URLs — the galleries themselves come from
	 * `GET shaped-gallery/v1/galleries`, so a white-label filter can rewrite every label
	 * on the screen without touching the data path.
	 *
	 * `banner` is the screen the site sees until it saves its first gallery, and it
	 * is the only place on the dashboard that explains what a shortcode is FOR. Its
	 * CTA reuses `urls.createGallery` rather than carrying a URL of its own, so there
	 * is one statement of where a gallery is created (§18).
	 *
	 * `emptyTitle` / `emptyText` did NOT become dead when the banner arrived: the
	 * banner answers "this site has no galleries", while those two answer the table's
	 * own narrower empty case — a page number left pointing past the end of an
	 * unfiltered list. A search that matches nothing gets `noResultsLabel`.
	 *
	 * @return array<string,mixed>
	 */
	private static function manage(): array {
		return array(
			'title'              => __( 'Saved Galleries', 'easy-lightbox-wp' ),
			'banner'             => array(
				'heading'     => __( 'Create Reusable Saved Galleries', 'easy-lightbox-wp' ),
				'description' => __( 'Build a gallery once and reuse it anywhere with a shortcode — pages, posts, widgets, or page builders like Elementor and Divi.', 'easy-lightbox-wp' ),
				'ctaLabel'    => __( 'Create a Saved Gallery', 'easy-lightbox-wp' ),
				'artUrl'      => SHAPED_GALLERY_URL . 'assets/img/gallery-shortcode.webp',
				'artAlt'      => __( 'A grid of sample gallery photos with a shortcode tag', 'easy-lightbox-wp' ),
			),
			'searchPlaceholder'  => __( 'Search..', 'easy-lightbox-wp' ),
			'searchLabel'        => __( 'Search galleries', 'easy-lightbox-wp' ),
			'bulkLabel'          => __( 'Bulk Action', 'easy-lightbox-wp' ),
			'applyLabel'         => __( 'Apply', 'easy-lightbox-wp' ),
			'bulkActions'        => array(
				array(
					'value' => 'delete',
					'label' => __( 'Delete', 'easy-lightbox-wp' ),
				),
				array(
					'value' => 'duplicate',
					'label' => __( 'Duplicate', 'easy-lightbox-wp' ),
				),
			),
			'addNewLabel'        => __( 'Add New Gallery', 'easy-lightbox-wp' ),
			'columns'            => array(
				'title'     => __( 'Title', 'easy-lightbox-wp' ),
				'shortcode' => __( 'Shortcode', 'easy-lightbox-wp' ),
				'date'      => __( 'Date', 'easy-lightbox-wp' ),
				'actions'   => __( 'Actions', 'easy-lightbox-wp' ),
			),
			'actions'            => array(
				'edit'      => __( 'Edit', 'easy-lightbox-wp' ),
				'duplicate' => __( 'Duplicate', 'easy-lightbox-wp' ),
				'delete'    => __( 'Delete', 'easy-lightbox-wp' ),
			),
			'selectAllLabel'     => __( 'Select all galleries', 'easy-lightbox-wp' ),
			'untitledLabel'      => __( '(no title)', 'easy-lightbox-wp' ),
			'copyLabel'          => __( 'Copy shortcode', 'easy-lightbox-wp' ),
			'copiedLabel'        => __( 'Copied', 'easy-lightbox-wp' ),
			'emptyTitle'         => __( 'No galleries yet.', 'easy-lightbox-wp' ),
			'emptyText'          => __( 'Create your first gallery, then paste its shortcode anywhere on your site.', 'easy-lightbox-wp' ),
			'noResultsLabel'     => __( 'No galleries match your search.', 'easy-lightbox-wp' ),
			'loadingLabel'       => __( 'Loading galleries…', 'easy-lightbox-wp' ),
			'errorLabel'         => __( 'Could not load galleries. Please reload the page.', 'easy-lightbox-wp' ),
			/*
			 * Deletion is permanent — there is no Trash for this CPT (§ REST
			 * `delete_gallery()`), so every string here says so plainly rather than
			 * offering an "undo" the product does not have.
			 */
			'confirmDeleteTitle' => __( 'Delete Gallery', 'easy-lightbox-wp' ),
			'confirmDelete'      => __( 'Permanently delete this gallery? It will stop working everywhere its shortcode is used, and this cannot be undone.', 'easy-lightbox-wp' ),
			/* translators: %d: number of selected galleries. */
			'confirmBulkDelete'  => __( 'Permanently delete %d selected galleries? They will stop working everywhere their shortcodes are used, and this cannot be undone.', 'easy-lightbox-wp' ),
			'noSelection'        => __( 'Select at least one gallery first.', 'easy-lightbox-wp' ),
			'deletedLabel'       => __( 'Gallery deleted.', 'easy-lightbox-wp' ),
			'duplicatedLabel'    => __( 'Gallery duplicated.', 'easy-lightbox-wp' ),
		);
	}

	/**
	 * Settings route: the sub-nav vocabulary and every string on its panels.
	 *
	 * The `sections` list is copy + ordering ONLY. Which sections can actually render
	 * is decided by the panel registry in `app/admin/pages/Settings/sections.js`, the
	 * same way `Dashboard::route_keys()` and `ROUTES` gate the top-level tabs: a
	 * filter that adds a section here can rename or reorder the rail, but can never
	 * point it at a panel that does not exist.
	 *
	 * @return array<string,mixed>
	 */
	private static function settings_page(): array {
		$brand = self::brand();

		return array(
			'title'        => __( 'Settings', 'easy-lightbox-wp' ),
			'navLabel'     => __( 'Settings sections', 'easy-lightbox-wp' ),
			'sections'     => array(
				array(
					'key'   => 'advanced-controls',
					'label' => __( 'Advanced Controls', 'easy-lightbox-wp' ),
				),
				array(
					'key'   => 'integrations',
					'label' => __( 'Integrations', 'easy-lightbox-wp' ),
				),
				array(
					'key'   => 'modules',
					'label' => __( 'Modules', 'easy-lightbox-wp' ),
				),
			),
			'advanced'     => array(
				'rows'       => array(
					array(
						'key'         => 'cleanupOnDeletion',
						'title'       => __( 'Clean-up Data on Deletion', 'easy-lightbox-wp' ),
						'description' => __( 'Completely remove all plugin data when the plugin is uninstalled.', 'easy-lightbox-wp' ),
					),
					array(
						'key'         => 'cacheTimeout',
						'title'       => __( 'Clear Cache Timeout', 'easy-lightbox-wp' ),
						'description' => __( 'Sets the cache timeout in hours, defining how often cached resources are cleared.', 'easy-lightbox-wp' ),
						'unit'        => __( 'hours', 'easy-lightbox-wp' ),
					),
					array(
						'key'         => 'browserCaching',
						'title'       => __( 'Enable Browser Caching', 'easy-lightbox-wp' ),
						'description' => __( 'Allow browsers to cache gallery assets for faster repeat visits. (Only affects plugin assets.)', 'easy-lightbox-wp' ),
					),
					array(
						'key'         => 'clearCache',
						'title'       => __( 'Clear Gallery Cache', 'easy-lightbox-wp' ),
						'description' => __( 'Instantly clear all cached gallery data.', 'easy-lightbox-wp' ),
						'action'      => __( 'Clear Cache', 'easy-lightbox-wp' ),
						// The server clears in bounded batches, so one click can take
						// several requests on a large cache — the button says so
						// rather than looking stuck.
						'busyLabel'   => __( 'Clearing…', 'easy-lightbox-wp' ),
					),
					array(
						'key'         => 'debugPerformance',
						'title'       => __( 'Debug Performance', 'easy-lightbox-wp' ),
						'description' => __( 'Display performance logs and loading information for troubleshooting.', 'easy-lightbox-wp' ),
					),
					array(
						'key'         => 'retinaImages',
						'title'       => __( 'Retina Images', 'easy-lightbox-wp' ),
						'description' => __( 'Deliver high-resolution images on Retina and HiDPI displays.', 'easy-lightbox-wp' ),
					),
				),
				'resetLabel' => __( 'Reset to Default', 'easy-lightbox-wp' ),
				/*
				 * The one row on this screen that arms a destructive action, so it is the
				 * one row that asks before it is switched ON. Copy lives here with the
				 * rest of the screen's strings rather than in the panel.
				 *
				 * "all ShapedGallery data, including …" rather than a list of the things
				 * removed: a list reads as exhaustive and this one would not be, quietly
				 * omitting the capabilities, the password verifiers and the pattern
				 * favourites. "Caches", not "cached files" — nothing is written to disk;
				 * every cache here is a transient or an object-cache group (§17).
				 *
				 * "Nothing is removed now" earns its place. The action being confirmed is
				 * ticking a checkbox, which is undone by unticking it, by Cancel, or by
				 * Reset to Default — and the setting stays reversible right up until the
				 * plugin is actually deleted. Saying "this action cannot be undone" on its
				 * own would be false about what the button does, and false in the
				 * direction that makes a user hunt for galleries they have not lost. So
				 * the irreversibility is attached to the deletion, not to the click.
				 *
				 * Turning the row back off needs no dialog — that direction is the safe
				 * one.
				 */
				'confirm'    => array(
					'title'   => __( 'Clean-up Data on Deletion', 'easy-lightbox-wp' ),
					'message' => __( 'Deleting the plugin will permanently remove all ShapedGallery data, including galleries, settings and caches. Nothing is removed now, and this cannot be undone.', 'easy-lightbox-wp' ),
					'confirm' => __( 'Enable Clean-up', 'easy-lightbox-wp' ),
					'cancel'  => __( 'Cancel', 'easy-lightbox-wp' ),
				),
			),
			'integrations' => array(
				'title'       => __( 'Control Page Builder Addons', 'easy-lightbox-wp' ),
				'description' => __( 'Enable only the modules you need to keep your site fast and optimized.', 'easy-lightbox-wp' ),
				'docsLabel'   => __( 'Docs', 'easy-lightbox-wp' ),
				'items'       => self::integration_items( $brand ),
			),
			'modules'      => array(
				'title'       => __( 'Manage Modules', 'easy-lightbox-wp' ),
				'description' => __( 'Enable only the modules you need to keep your site fast and optimized.', 'easy-lightbox-wp' ),
				'docsLabel'   => __( 'Docs', 'easy-lightbox-wp' ),
				'items'       => self::module_items(),
				'panels'      => self::module_panels(),
				'pro'         => self::pro_modules(),
			),
		);
	}

	/**
	 * The feature modules the Modules section lists.
	 *
	 * Whether a module is on by default, and whether it has an options screen behind
	 * the gear, are the panel's business — this is copy and links only.
	 *
	 * @return array<int,array<string,string>>
	 */
	private static function module_items(): array {
		$modules = array(
			'lightbox'         => array(
				__( 'Lightbox', 'easy-lightbox-wp' ),
				__( 'Display images in a beautiful lightbox with smooth navigation, zoom, and mobile-friendly touch gestures for everyone.', 'easy-lightbox-wp' ),
			),
			'image-custom-url' => array(
				__( 'Image Custom URL', 'easy-lightbox-wp' ),
				__( 'Assign custom links to gallery images, directing visitors to products, pages, or external websites seamlessly.', 'easy-lightbox-wp' ),
			),
			'ready-patterns'   => array(
				__( 'Ready Patterns', 'easy-lightbox-wp' ),
				__( 'Browse and insert ready-made gallery patterns straight from the block editor. Off means no pattern button and no outbound request.', 'easy-lightbox-wp' ),
			),
		);

		$items = array();
		foreach ( $modules as $key => list( $name, $description ) ) {
			$items[] = array(
				'key'          => $key,
				'name'         => $name,
				'description'  => $description,
				// Both controls read the same on every card, so each needs a name of
				// its own; built here for the same reason the integrations' are.
				'docsAria'     => sprintf(
					/* translators: %s: module name, e.g. "Lightbox". */
					__( '%s documentation', 'easy-lightbox-wp' ),
					$name
				),
				'settingsAria' => sprintf(
					/* translators: %s: module name, e.g. "Lightbox". */
					__( '%s settings', 'easy-lightbox-wp' ),
					$name
				),
				// The docs slugs ARE the module keys, so the card needs no lookup.
				'url'          => self::docs( 'guide/features/' . $key ),
			);
		}

		return $items;
	}

	/**
	 * ShapedGallery Pro's modules, listed under the Free ones as locked cards.
	 *
	 * WP Carousel Free's Modules treatment: a short banner, then each Pro module as an
	 * ordinary card with a "PRO" badge where its switch would be. The card has no
	 * switch at all, so there is nothing to save — and `ModuleRegistry::sanitize()`
	 * keeps only this build's own keys, so a crafted request cannot store one either.
	 *
	 * Pro's three modules this build has no switch for, in Pro's own Modules order.
	 * Lazy Load is among them although this build already defers every gallery image
	 * (`GalleryOptions::lazy_load_active()`): what the card advertises is the SWITCH —
	 * Pro lets a site turn deferral off — not the deferral itself.
	 *
	 * Copy is Pro's own (`shaped-gallery-pro/src/Admin/DashboardConfig.php`), so a
	 * card reads exactly as the module the user gets after upgrading. The cards carry
	 * no gear: there are no options here to open, and a preview of options the user
	 * cannot set is the same noise the inspector and the Lightbox drawer dropped.
	 *
	 * @return array<string,mixed>
	 */
	private static function pro_modules(): array {
		$modules = array(
			'watermark'        => array(
				__( 'Watermark', 'easy-lightbox-wp' ),
				__( 'Add customizable watermarks to gallery images to boost brand identity and prevent unauthorized use.', 'easy-lightbox-wp' ),
			),
			'image-protection' => array(
				__( 'Image Protection', 'easy-lightbox-wp' ),
				__( 'Secure images with right-click blocks, drag prevention.', 'easy-lightbox-wp' ),
			),
			'lazy-load'        => array(
				__( 'Lazy Load', 'easy-lightbox-wp' ),
				__( 'Load images only when needed to boost page speed and create smoother browsing experiences.', 'easy-lightbox-wp' ),
			),
		);

		$items = array();
		foreach ( $modules as $key => list( $name, $description ) ) {
			$items[] = array(
				'key'         => $key,
				'name'        => $name,
				'description' => $description,
				'docsAria'    => sprintf(
					/* translators: %s: module name, e.g. "Watermark". */
					__( '%s documentation', 'easy-lightbox-wp' ),
					$name
				),
				'url'         => self::docs( 'guide/features/' . $key ),
			);
		}

		return array(
			'title'        => __( 'Unlock Powerful Features with Pro!', 'easy-lightbox-wp' ),
			'description'  => __( 'Protect your work and brand every image with the Pro modules.', 'easy-lightbox-wp' ),
			'badge'        => __( 'PRO', 'easy-lightbox-wp' ),
			'upgradeLabel' => __( 'Upgrade to Pro', 'easy-lightbox-wp' ),
			'upgradeUrl'   => self::pro_url( self::PRO_FROM_MODULES ),
			'items'        => $items,
		);
	}

	/**
	 * The settings panel behind a module's gear, keyed by module.
	 *
	 * Copy, row ORDER and every dropdown's options only — which control a row carries
	 * is the panel's business (`app/admin/pages/Settings/modulePanels/`), exactly as
	 * `advanced.rows` above is copy for controls chosen in `AdvancedControls.jsx`. A
	 * row key the panel does not know is dropped rather than drawn blank, so a filter
	 * can reword and reorder but never invent a control.
	 *
	 * Lightbox has a panel; the other modules' gears stay inert until they do.
	 *
	 * Lightbox lists only the rows this build can store. What Pro's viewer adds is
	 * `proNotice` — a title, a lead-in and a feature list drawn under the groups as
	 * one note — rather than locked rows among the working ones: a drawer of
	 * switches the user cannot flip is noise around the two they can. Each feature
	 * is one of Pro's real `Modules\Lightbox` options, so the note promises nothing
	 * the upgrade does not deliver.
	 *
	 * Help strings are this file's, not the design's: the design marks WHICH rows
	 * carry an info affordance without spelling out its text, and an affordance with
	 * nothing behind it is worse than none.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	private static function module_panels(): array {
		return array(
			'lightbox' => array(
				'saveLabel'  => __( 'Save Changes', 'easy-lightbox-wp' ),
				'resetLabel' => __( 'Reset Changes', 'easy-lightbox-wp' ),
				'groups'     => array(
					array(
						'title' => __( 'General Setting', 'easy-lightbox-wp' ),
						'rows'  => array(
							array(
								'key'   => 'closeOnOutsideClick',
								'label' => __( 'Close When Click Outside', 'easy-lightbox-wp' ),
							),
							array(
								'key'   => 'itemCounter',
								'label' => __( 'Item Counter', 'easy-lightbox-wp' ),
								'help'  => __( 'Show the position of the current image, for example 3 / 12.', 'easy-lightbox-wp' ),
							),
						),
					),
				),
				'proNotice'  => array(
					'title'    => __( 'Unlock Pro Features!', 'easy-lightbox-wp' ),
					'subtitle' => __( 'Get 20+ lightbox options with ShapedGallery Pro, including:', 'easy-lightbox-wp' ),
					'features' => array(
						__( 'Light & Dark Themes', 'easy-lightbox-wp' ),
						__( 'Slider AutoPlay & Loop', 'easy-lightbox-wp' ),
						__( 'Transition Effects', 'easy-lightbox-wp' ),
						__( 'Image Title & Caption', 'easy-lightbox-wp' ),
						__( 'Lightbox Toolbar (zoom, share, download)', 'easy-lightbox-wp' ),
						__( 'Thumbnail Navigation', 'easy-lightbox-wp' ),
						__( 'Right Click Protection', 'easy-lightbox-wp' ),
					),
				),
			),
		);
	}

	/**
	 * The page builders the Integrations section lists.
	 *
	 * Builder names are proper nouns, so they are sprintf arguments rather than part
	 * of the translatable sentence — one string for translators instead of six.
	 *
	 * @param string $brand Product name.
	 * @return array<int,array<string,string>>
	 */
	private static function integration_items( string $brand ): array {
		$builders = array(
			'elementor' => 'Elementor',
			'divi'      => 'Divi',
			'wpbakery'  => 'WPBakery',
			'oxygen'    => 'Oxygen',
			'beaver'    => 'Beaver',
			'bricks'    => 'Bricks',
		);

		/*
		 * Docs slugs, where they differ from the key. The key is this plugin's own
		 * identifier (it names the integration and its settings), so the docs site
		 * is followed here rather than by renaming it.
		 */
		$doc_slugs = array(
			'beaver' => 'beaver-builder',
		);

		$items = array();
		foreach ( $builders as $key => $name ) {
			$items[] = array(
				'key'         => $key,
				'name'        => $name,
				'description' => sprintf(
					/* translators: 1: plugin name. 2: page builder name, e.g. "Elementor". */
					__( 'It allows using %1$s galleries in %2$s via the gallery shortcode.', 'easy-lightbox-wp' ),
					$brand,
					$name
				),
				// Built here, not in JSX: every "Docs" link on the grid reads the same,
				// so each needs a name of its own, and the sentence stays in PHP with
				// the rest of the screen's copy.
				'docsAria'    => sprintf(
					/* translators: %s: page builder name, e.g. "Elementor". */
					__( '%s integration documentation', 'easy-lightbox-wp' ),
					$name
				),
				'url'         => self::docs( 'guide/page-builders/' . ( $doc_slugs[ $key ] ?? $key ) ),
			);
		}

		return $items;
	}

	/**
	 * Documentation page for the gallery block, linked from the block's own sidebar.
	 *
	 * Public because the block editor payload ({@see \ShapedPlugin\ShapedGallery\Core\Assets::localize_data()})
	 * needs it outside the dashboard config.
	 *
	 * @return string
	 */
	public static function block_docs_url(): string {
		return self::docs( 'guide/gallery-block' );
	}

	/**
	 * `utm_content` of an upgrade link from the block editor's canvas and modals:
	 * locked layout cards (the layout picker's hover "Upgrade to Pro" and the
	 * toolbar's Change Layout grid) and locked Ready Pattern cards.
	 */
	public const PRO_FROM_BLOCK = 'pro_block';

	/**
	 * `utm_content` of a locked Pro source tab (Vimeo, TikTok, Wistia) in the media
	 * gallery modal's sidebar.
	 */
	public const PRO_FROM_MEDIA = 'media_gallery';

	/**
	 * `utm_content` of the "Upgrade to Pro" link inside the block inspector's panels:
	 * the closing Pro note of a working panel and the card filling a locked one
	 * (`ProNotice`, which `ProPanel` draws too).
	 */
	public const PRO_FROM_INSPECTOR = 'block_inspect';

	/**
	 * `utm_content` of the "Upgrade to Pro" row in the plugin's admin menu.
	 */
	public const PRO_FROM_MENU = 'plugin_menu';

	/**
	 * `utm_content` of the plugins screen's "Go Pro" action link — its own slug, so
	 * a click from the plugin list is told apart from one in the admin menu.
	 */
	public const PRO_FROM_ACTION_LINK = 'action_link';

	/**
	 * `utm_content` of an upgrade link on Settings → Modules: the Pro modules banner,
	 * and the Pro note in a module's gear panel (the Lightbox panel's today).
	 */
	public const PRO_FROM_MODULES = 'modules';

	/**
	 * `utm_content` of the dashboard's offer bar, the strip over every dashboard
	 * screen — its own slug, so a click on the campaign is told apart from a click
	 * on a teaser.
	 */
	public const PRO_FROM_OFFER_BAR = 'offer_banner';

	/**
	 * Where an upgrade prompt sends the user, tagged with where it was clicked.
	 *
	 * The pricing page, the destination WP Carousel Free's "Upgrade to Pro"
	 * prompts use too: every surface that links here (locked layout cards and
	 * controls, Pro panels, Pro module cards, locked pattern cards, the admin
	 * menu row and the plugins-screen link) is already labelled as an upgrade,
	 * so the user arriving has decided to look at plans. Each locked control
	 * already shows what Pro adds in place, which is what a comparison page
	 * would have repeated.
	 *
	 * The ONE place the URL is spelled, campaign parameters included: the block
	 * and dashboard bundles read it from their payloads (`upgradeUrl`,
	 * `patternsUpgradeUrl`, `mediaUpgradeUrl`, `noticeUrl`, `offerUrl`) and PHP
	 * calls this method. Only `utm_content` varies, and only through a
	 * `PRO_FROM_*` constant, so a surface cannot invent a slug the campaign
	 * reports do not know. The placement is required rather than defaulted: an
	 * untagged link is a click the reports silently lose, so forgetting it fails
	 * loudly instead.
	 *
	 * `http_build_query()` rather than `add_query_arg()` keeps this pure, so the
	 * verifier pins the exact URLs without a WordPress stub. The `&` separator is
	 * explicit because the default follows `arg_separator.output`, which a host
	 * can set to `&amp;`.
	 *
	 * Public for the same reason {@see self::block_docs_url()} is — the block
	 * editor payload needs it outside the dashboard config.
	 *
	 * @param string $placement One of the `PRO_FROM_*` constants.
	 * @return string
	 */
	public static function pro_url( string $placement ): string {
		$campaign = array(
			'utm_source'   => 'dashboard',
			'utm_medium'   => 'shaped_gallery',
			'utm_campaign' => 'promo',
			'utm_content'  => $placement,
		);

		return 'https://shapedgallery.com/pricing/?' . http_build_query( $campaign, '', '&' );
	}

	/**
	 * The scheduled Pro offer: what the block inspector's upgrade link, the plugins
	 * screen's "Go Pro" link and the dashboard's offer bar name, and the exact
	 * moment all three stop.
	 *
	 * `ends` is that moment as ISO 8601 WITH its offset — the offer is over at, not
	 * after, it. A bare date would leave open whose midnight ends it, and a badge
	 * that outlives the offer by even a few hours is a price claim the pricing page
	 * no longer honours. Midnight in Dhaka (UTC+6) ends the last day earlier than any
	 * zone west of it, so if the store's own cutoff is anywhere from UTC+6 westward
	 * the badge never outlasts the discount.
	 *
	 * `lead` names the campaign: a key of {@see self::offer_leads()}, whose sentence
	 * the dashboard's offer bar opens with. A slug rather than the sentence, because
	 * a constant cannot hold a translated string — so a new campaign's wording is
	 * one entry there and one slug here, and the bar never outlives its campaign
	 * with the last one's words.
	 *
	 * Public so the verifier can run the shipped schedule against fixed moments
	 * instead of today's clock. Read it through {@see self::pro_offer()}.
	 *
	 * @var array{percent:int,ends:string,lead:string}
	 */
	public const PRO_OFFER = array(
		'percent' => 75,
		// End of 31 January 2027, Dhaka time. '' for an offer with no end.
		'ends'    => '2027-02-01T00:00:00+06:00',
		// '' for a bar that names the discount alone.
		'lead'    => 'early_bird',
	);

	/**
	 * The sentences an offer can open with, keyed by the slug `PRO_OFFER['lead']`
	 * names.
	 *
	 * Translated here, in the one place the offer is decided, and published as
	 * `proOffer.lead`; the bar only interpolates the tags. Keep every sentence a
	 * claim about access or timing — the discount has its own line, filled from
	 * `percent`, so no lead may spell a number.
	 *
	 * @return array<string,string>
	 */
	public static function offer_leads(): array {
		return array(
			/* translators: Keep the <strong> tags around the lead-in. */
			'early_bird' => __( '<strong>Exclusive early-bird</strong> Pro access is open', 'easy-lightbox-wp' ),
		);
	}

	/**
	 * The Pro offer as it stands right now, or an empty array once it has ended.
	 *
	 * The ONE place the discount is spelled, for the reason {@see self::pro_url()}
	 * is the one place the URL is: `Core\Assets::localize_data()` publishes it as
	 * `proOffer`, and `app/` only fills an "Up to %d%% off" template from it. It is
	 * decided here rather than in the bundle so the claim retires itself — a site
	 * that never updates stops naming a discount the moment it ends.
	 *
	 * The end goes to the editor too (`endsAt`), because this only runs when the
	 * page loads: an editor left open across the cutoff hides the badge on its own
	 * clock (`app/components/pro/upgrade.js`) rather than at the next reload.
	 *
	 * Nothing is fetched to decide it. Asking a remote server for the offer on
	 * every editor load is the call home WordPress.org guideline 7 forbids without
	 * consent, and would put a price claim in the hands of untrusted data (§4b).
	 *
	 * "Up to" stays in the copy whatever the number becomes: the top rate is one
	 * plan's, for eligible new customers, and the pricing page carries the rest.
	 *
	 * @return array<string,int|string> `percent`, plus `endsAt` (Unix seconds) when the offer ends and `lead` when it names one; empty once it has ended.
	 */
	public static function pro_offer(): array {
		return self::active_offer( self::PRO_OFFER, time() );
	}

	/**
	 * An offer reduced to what the editor reads, if it still holds at `$now`.
	 *
	 * Pure, so the verifier can walk it across its end. Fails CLOSED: a percent
	 * outside 1–99, or an `ends` that is not a real ISO 8601 moment with an offset,
	 * hides the badge — a missing badge costs a click, a wrong one costs the user's
	 * trust. A `lead` that is not a key of {@see self::offer_leads()} drops only
	 * the sentence: the discount is still true, so a typo costs a line of copy
	 * rather than the offer.
	 *
	 * @param array<string,mixed> $offer `percent` (int), `ends` (ISO 8601 with offset, or '' for none) and optional `lead` (slug).
	 * @param int                 $now   Unix seconds.
	 * @return array<string,int|string>
	 */
	public static function active_offer( array $offer, int $now ): array {
		$percent = $offer['percent'] ?? null;
		$ends    = $offer['ends'] ?? '';
		$slug    = $offer['lead'] ?? '';
		$leads   = self::offer_leads();

		if ( ! is_int( $percent ) || $percent < 1 || $percent > 99 ) {
			return array();
		}

		// Strict: `isset( $leads[ $slug ] )` would cast `true` to 1 and a float to an int.
		$lead = is_string( $slug ) && in_array( $slug, array_keys( $leads ), true ) ? $leads[ $slug ] : '';

		if ( '' === $ends ) {
			return array( 'percent' => $percent ) + ( '' === $lead ? array() : array( 'lead' => $lead ) );
		}

		$end = is_string( $ends ) ? \DateTimeImmutable::createFromFormat( \DateTimeInterface::ATOM, $ends ) : false;

		// The round trip rejects what createFromFormat() silently rolls over
		// (2027-02-30 → March 2), a missing or `Z` offset, and trailing text.
		if ( ! $end || $end->format( \DateTimeInterface::ATOM ) !== $ends || $now >= $end->getTimestamp() ) {
			return array();
		}

		return array(
			'percent' => $percent,
			'endsAt'  => $end->getTimestamp(),
		) + ( '' === $lead ? array() : array( 'lead' => $lead ) );
	}

	/**
	 * The Pro green, for the two upgrade links PHP prints outside any bundle — the
	 * admin menu's "Upgrade to Pro" row and the plugins screen's "Go Pro" link,
	 * neither of which loads a stylesheet of ours.
	 *
	 * The PHP twin of `$sp-shaped-gallery-pro` in `app/styles/_brand.scss`, where
	 * the value and its contrast (4.70:1 under white text) are decided; change both
	 * together.
	 *
	 * @var string
	 */
	public const PRO_ACCENT = '#128627';

	/**
	 * The rest of the Pro ramp, for the plugins screen's offer pill
	 * ({@see Admin::offer_badge()}): text, chip surface and hairline. PHP twins of
	 * `$sp-shaped-gallery-pro-deep`, `-pro-surface` and `-pro-border`, where the
	 * values and the pill's contrast (6.25:1) are decided; `verify-dashboard.php`
	 * fails if any of these drifts from `_brand.scss`.
	 *
	 * @var string
	 */
	public const PRO_ACCENT_DEEP = '#0a6e08';

	/**
	 * See {@see self::PRO_ACCENT_DEEP}.
	 *
	 * @var string
	 */
	public const PRO_SURFACE = '#effff5';

	/**
	 * See {@see self::PRO_ACCENT_DEEP}.
	 *
	 * @var string
	 */
	public const PRO_BORDER = '#93dcac';

	/**
	 * Dashboard banner: the block-first pitch and its two ways in.
	 *
	 * **Both CTAs open a PAGE, never the gallery post type.** This banner's own
	 * sentence promises "no shortcode needed", and the `shaped_gallery` editor's whole
	 * product is a shortcode — so pointing either button there would contradict the
	 * copy directly above it. The shortcode flow has its own screen and its own
	 * banner: Saved Galleries (see self::manage()). Keeping the two apart is the
	 * point of the split, and `GalleryEditor::block_page_url()` carries the longer
	 * argument.
	 *
	 * The two buttons then differ only in what greets you on that page:
	 *
	 * - "Create New Gallery" carries `shapedblock=true`, which seeds one empty gallery
	 *   block into the new page's content. Empty is what makes the LAYOUT PICKER the
	 *   first thing on screen (`edit.jsx` opens on it while `items` is empty).
	 * - "Use Ready Patterns" carries `shapedpatterns=true` and seeds NOTHING, because
	 *   the library inserts a gallery block of its own on import — seeding one too
	 *   would leave the page holding an empty picker beside the imported pattern.
	 *   The arg is read once by `app/ready-patterns/index.js`, which then strips it
	 *   so a reload or a bookmark does not reopen the modal.
	 *
	 * Either URL is EMPTY when its precondition fails — the module being off for
	 * patterns (§4b), or the user being unable to create the target post type — which
	 * hides that button rather than offering a screen that will not appear. For
	 * patterns it is not merely hidden: the routes behind it 403 as well.
	 *
	 * The heading deliberately does not name the plugin. It is the one sentence on
	 * the screen that has to say what the product DOES, and "ShapedGallery" is already
	 * in the header two lines above it.
	 *
	 * @return array<string,mixed>
	 */
	private static function hero(): array {
		$page = GalleryEditor::block_page_url();

		return array(
			'heading'       => __( 'Build Beautiful Galleries in Minutes', 'easy-lightbox-wp' ),
			'description'   => sprintf(
				/* translators: %s: plugin name. */
				__( 'Add the %s block to any page, drop in your images, and pick a layout — no shortcode needed.', 'easy-lightbox-wp' ),
				self::brand()
			),
			'ctaLabel'      => __( 'Create New Gallery', 'easy-lightbox-wp' ),
			'ctaUrl'        => $page,
			'patternsLabel' => __( 'Use Ready Patterns', 'easy-lightbox-wp' ),
			'patternsUrl'   => ( $page && ReadyPatterns::is_enabled() )
				? add_query_arg(
					'shapedpatterns',
					'true',
					remove_query_arg( GalleryEditor::INSERT_ARG, $page )
				)
				: '',
			'artUrl'        => SHAPED_GALLERY_URL . 'assets/img/gallery-grid.webp',
			'artAlt'        => __( 'A grid of sample gallery photos', 'easy-lightbox-wp' ),
		);
	}

	/**
	 * The dashboard footer: credit, social links.
	 *
	 * Replaces WordPress's own two-slot admin footer on this screen (the stylesheet
	 * hides `#wpfooter` there), because the design is a three-column bar with SVG
	 * social glyphs — more than `admin_footer_text` / `update_footer` can express.
	 *
	 * @return array<string,mixed>
	 */
	private static function footer(): array {
		return array(
			'creditPrefix'    => __( 'Made with', 'easy-lightbox-wp' ),
			'creditMiddle'    => __( 'by the', 'easy-lightbox-wp' ),
			'creditLinkLabel' => __( 'ShapedPlugin LLC Team', 'easy-lightbox-wp' ),
			'creditLinkUrl'   => 'https://shapedplugin.com/about-us/',
			'socialLabel'     => __( 'Get Connected with', 'easy-lightbox-wp' ),
			'socials'         => self::socials(),
		);
	}

	/**
	 * Footer social links. `id` is the key the SPA maps to an SVG glyph.
	 *
	 * Labels are proper nouns, so they are deliberately not translated.
	 *
	 * @return array<int,array<string,string>>
	 */
	private static function socials(): array {
		return array(
			array(
				'id'    => 'linkedin',
				'label' => 'LinkedIn',
				'url'   => 'https://www.linkedin.com/company/shapedplugin',
			),
			array(
				'id'    => 'x',
				'label' => 'X',
				'url'   => 'https://x.com/shapedplugin',
			),
			array(
				'id'    => 'wordpress',
				'label' => 'WordPress',
				// The WordPress.org listing this build ships from — see §24 and the
				// note on self::REVIEW_URL.
				'url'   => 'https://wordpress.org/plugins/easy-lightbox-wp/',
			),
			array(
				'id'    => 'facebook',
				'label' => 'Facebook',
				'url'   => 'https://www.facebook.com/shapedplugin',
			),
			array(
				'id'    => 'youtube',
				'label' => 'YouTube',
				'url'   => 'https://www.youtube.com/@ShapedPlugin',
			),
		);
	}

	/**
	 * Header "Help Center" dropdown items. `id` is a key the SPA maps to an SVG.
	 *
	 * Every URL here also lives in {@see self::urls()} (§18 — one statement of each
	 * destination); `whatsnew` and `blog` are the exception, since nothing
	 * else on the dashboard links out to them. Every item is an outbound link on
	 * purpose (see HelpCenter.jsx's docblock) — no "Setup Wizard" entry, since this
	 * build has no onboarding flow to send it to.
	 *
	 * @return array<string,mixed>
	 */
	private static function help_center(): array {
		$urls = self::urls();

		return array(
			'label' => __( 'Help Center', 'easy-lightbox-wp' ),
			'items' => array(
				array(
					'id'    => 'whatsnew',
					'label' => __( "What's New", 'easy-lightbox-wp' ),
					'url'   => 'https://shapedgallery.com/changelog/',
				),
				array(
					'id'    => 'docs',
					'label' => __( 'Documentation', 'easy-lightbox-wp' ),
					'url'   => $urls['docs'],
				),
				array(
					'id'    => 'support',
					'label' => __( 'Technical Support', 'easy-lightbox-wp' ),
					'url'   => $urls['support'],
				),
				array(
					'id'    => 'video',
					'label' => __( 'Video Tutorials', 'easy-lightbox-wp' ),
					'url'   => $urls['youtube'],
				),
				array(
					'id'    => 'request',
					'label' => __( 'Request a Feature', 'easy-lightbox-wp' ),
					'url'   => $urls['featureRequest'],
				),
				array(
					'id'    => 'blog',
					'label' => __( 'Blog: Latest News', 'easy-lightbox-wp' ),
					'url'   => 'https://shapedgallery.com/blog/',
				),
				array(
					'id'    => 'community',
					'label' => __( 'Join Community', 'easy-lightbox-wp' ),
					'url'   => $urls['community'],
				),
			),
		);
	}

	/**
	 * About Us route: the intro card and the cross-sell grid.
	 *
	 * The intro paragraphs are stored as `{ prefix, strong, rest }` rather than as
	 * one string with markup in it. The design bolds a term mid-sentence, and the two
	 * alternatives are both worse: HTML in a translatable string has to be trusted at
	 * render time, and splitting on a `%s` placeholder makes the sentence unreadable
	 * for translators. Three plain strings keep React escaping everything.
	 *
	 * @return array<string,mixed>
	 */
	private static function about(): array {
		$brand = self::brand();

		return array(
			'heading'          => __( 'Beautiful Gallery Showcase Solution for WordPress by', 'easy-lightbox-wp' ),
			'headingHighlight' => sprintf(
				/* translators: %s: plugin name. */
				__( '%s Team', 'easy-lightbox-wp' ),
				$brand
			),
			'paragraphs'       => array(
				array(
					'prefix' => __( 'At ', 'easy-lightbox-wp' ),
					'strong' => __( 'ShapedPlugin LLC', 'easy-lightbox-wp' ),
					'rest'   => __( ', back in 2016, while building WordPress websites for clients and partners, we struggled to find a simple, flexible, and reliable way to showcase clients, partners, sponsors, and affiliates’ logos elegantly. Existing solutions lacked the design quality, usability, and customization options we needed—so we decided to build our own.', 'easy-lightbox-wp' ),
				),
				array(
					'strong' => $brand,
					'rest'   => __( ' offers a simple yet powerful way to showcase images through carousels, grids, lists, category filters, and sleek layouts. It helps you build trust, enhance credibility, and display social proof with ease—we’re sure you’ll enjoy using it.', 'easy-lightbox-wp' ),
				),
			),
			'primaryCta'       => array(
				'label' => sprintf(
					/* translators: %s: plugin name. */
					__( 'Explore %s', 'easy-lightbox-wp' ),
					$brand
				),
				'url'   => 'https://shapedgallery.com/',
			),
			'secondaryCta'     => array(
				'label' => __( 'More About Us', 'easy-lightbox-wp' ),
				'url'   => 'https://shapedplugin.com/about-us/',
			),

			/*
			 * The team photograph. Optional on purpose: with no URL the intro card
			 * drops to a single full-width column rather than reserving space for an
			 * image that never arrives.
			 */
			'image'            => array(
				'url'     => SHAPED_GALLERY_URL . 'assets/img/team.jpg',
				'alt'     => __( 'The ShapedPlugin LLC team', 'easy-lightbox-wp' ),
				'caption' => sprintf(
					/* translators: %s: plugin name. */
					__( 'The Creative Minds Behind the %s Plugin', 'easy-lightbox-wp' ),
					$brand
				),
			),
			'pluginsTitle'     => __( 'Your Website Deserves More Than Typical - Go Premium Today!', 'easy-lightbox-wp' ),
			'pluginsSubtitle'  => __( 'Unlock powerful plugins built to boost performance, elevate design, and grow your business.', 'easy-lightbox-wp' ),
			'plugins'          => self::other_plugins(),
		);
	}

	/**
	 * The sibling products the About Us grid cross-sells.
	 *
	 * `logo` is the 48px brand mark, a URL on the company's own sites rather than a
	 * shipped file — the same source the sibling plugins use — so it follows the site
	 * when a mark is redrawn. Reno Product Category has none: its mark is bundled in
	 * the About Us screen, because the site publishes it only inside a lockup.
	 *
	 * @return array<int,array<string,string>>
	 */
	private static function other_plugins(): array {
		$logo_base = 'https://shapedplugin.com/wp-content/uploads/';

		return array(
			array(
				'id'          => 'wp-carousel',
				'name'        => __( 'WP Carousel', 'easy-lightbox-wp' ),
				'description' => __( 'The most powerful and user-friendly multi-purpose carousel, slider, & gallery plugin for WordPress.', 'easy-lightbox-wp' ),
				'url'         => 'https://wpcarousel.io/',
				'logo'        => $logo_base . '2026/08/wp-carousel.svg',
			),
			array(
				'id'          => 'easy-accordion',
				'name'        => __( 'Easy Accordion', 'easy-lightbox-wp' ),
				'description' => __( 'Minimize customer support by offering comprehensive FAQs and increasing conversions.', 'easy-lightbox-wp' ),
				'url'         => 'https://easyaccordion.io/',
				'logo'        => $logo_base . 'edd/2026/07/easy-accordion.png',
			),
			array(
				'id'          => 'real-testimonials',
				'name'        => __( 'Real Testimonials', 'easy-lightbox-wp' ),
				'description' => __( 'Simply collect, manage, and display testimonials on your website and boost conversions.', 'easy-lightbox-wp' ),
				'url'         => 'https://realtestimonials.io/',
				'logo'        => $logo_base . 'edd/2026/07/real-testimonials.png',
			),
			array(
				'id'          => 'smart-post',
				'name'        => __( 'Smart Post', 'easy-lightbox-wp' ),
				'description' => __( 'Filter and display posts (any post types), pages, taxonomy, custom taxonomy, and custom field, in beautiful layouts.', 'easy-lightbox-wp' ),
				'url'         => 'https://wpsmartpost.com/',
				'logo'        => $logo_base . 'edd/2026/07/smart-post.png',
			),
			array(
				'id'          => 'smart-team',
				'name'        => __( 'Smart Team', 'easy-lightbox-wp' ),
				'description' => __( 'Simply collect, manage, and display your team members on your website.', 'easy-lightbox-wp' ),
				'url'         => 'https://getwpteam.com/',
				'logo'        => $logo_base . 'edd/2026/07/wp-team.png',
			),
			array(
				'id'          => 'location-weather',
				'name'        => __( 'Location Weather', 'easy-lightbox-wp' ),
				'description' => __( 'Add customizable, real-time weather forecasts with multi-day views and current conditions to your WordPress site.', 'easy-lightbox-wp' ),
				'url'         => 'https://locationweather.io/',
				'logo'        => $logo_base . 'edd/2026/07/Location-Weather.png',
			),
			array(
				'id'          => 'smart-tabs',
				'name'        => __( 'Smart Tabs', 'easy-lightbox-wp' ),
				'description' => __( 'Best WooCommerce custom product tabs & WordPress tabs builder plugin to create responsive tabs.', 'easy-lightbox-wp' ),
				'url'         => 'https://wptabs.com/',
				'logo'        => $logo_base . 'edd/2022/08/wp-tabs.png',
			),
			array(
				'id'          => 'woogallery',
				'name'        => __( 'Reno Product Gallery', 'easy-lightbox-wp' ),
				'description' => __( 'Product gallery slider and additional variation images gallery for WooCommerce and boost your sales.', 'easy-lightbox-wp' ),
				'url'         => 'https://renoproductgallery.com/',
				'logo'        => $logo_base . 'edd/2026/07/gallery-slider-for-woocommerce.png',
			),
			array(
				'id'          => 'woo-product-slider',
				'name'        => __( 'Reno Product Slider', 'easy-lightbox-wp' ),
				'description' => __( 'Boost sales by interactive product Slider, Grid, and Table in your WooCommerce website or store.', 'easy-lightbox-wp' ),
				'url'         => 'https://renoproductslider.com/',
				'logo'        => $logo_base . 'edd/2022/08/woo-product-slider.png',
			),
			array(
				'id'          => 'woocategory',
				'name'        => __( 'Reno Product Category', 'easy-lightbox-wp' ),
				'description' => __( 'Display by filtering the list of categories aesthetically and boosting sales.', 'easy-lightbox-wp' ),
				'url'         => 'https://shapedplugin.com/reno-product-category/',
			),
			array(
				'id'          => 'smart-swatches',
				'name'        => __( 'Smart Swatch', 'easy-lightbox-wp' ),
				'description' => __( 'Smart Swatches is a best product variation swatches for WooCommerce to boost your store sales.', 'easy-lightbox-wp' ),
				'url'         => 'https://shapedplugin.com/smart-swatches-for-woocommerce/',
				'logo'        => $logo_base . 'edd/2024/07/Smart-Swatch-Icon.png',
			),
			array(
				'id'          => 'styble',
				'name'        => __( 'Styble', 'easy-lightbox-wp' ),
				'description' => __( 'Enhance web design with fast, modern Gutenberg blocks like accordions, buttons, info boxes, and tabs—no coding needed.', 'easy-lightbox-wp' ),
				'url'         => 'https://styble.com/',
				'logo'        => 'https://styble.com/wp-content/uploads/2024/03/styble-favicon.png',
			),
		);
	}

	/**
	 * Live-chat support.
	 *
	 * On by default (self::CRISP_WEBSITE_ID). `SHAPED_GALLERY_CRISP_WEBSITE_ID` in
	 * `wp-config.php` overrides it, and defining it as an empty string turns chat off:
	 * no third-party script is requested and the dashboard shows a support bubble that
	 * links to the support page instead of opening a chat.
	 *
	 * Whichever value wins, the id is validated as a UUID before it reaches the
	 * browser, because Crisp reads it from a `window` global and builds a script URL
	 * from it.
	 *
	 * @return array<string,mixed>
	 */
	private static function live_chat(): array {
		$website_id = defined( 'SHAPED_GALLERY_CRISP_WEBSITE_ID' )
			? (string) SHAPED_GALLERY_CRISP_WEBSITE_ID
			: self::CRISP_WEBSITE_ID;

		return array(
			'provider'    => 'crisp',
			'websiteId'   => self::sanitize_chat_id( $website_id ),
			'label'       => __( 'Support', 'easy-lightbox-wp' ),
			'openLabel'   => __( 'Chat with support', 'easy-lightbox-wp' ),
			'fallbackUrl' => 'https://shapedplugin.com/support/',
		);
	}

	/**
	 * Documentation URL for an optional sub-path.
	 *
	 * @param string $path Path below the docs root, e.g. 'layouts/grid/'.
	 * @return string
	 */
	private static function docs( string $path = '' ): string {
		return self::DOCS_BASE . ltrim( $path, '/' );
	}

	/**
	 * Re-validate everything a filter could have tampered with.
	 *
	 * Every URL goes through esc_url_raw(), which strips `javascript:` and friends —
	 * all of them end up in an `href` or an `<img src>` in the browser, and the
	 * filter above is a public API.
	 *
	 * @param array<string,mixed> $config Filtered config.
	 * @return array<string,mixed>
	 */
	private static function harden( array $config ): array {
		if ( isset( $config['urls'] ) && is_array( $config['urls'] ) ) {
			foreach ( $config['urls'] as $key => $url ) {
				$config['urls'][ $key ] = esc_url_raw( (string) $url );
			}
		}

		$config['tabs'] = self::harden_url_items( $config['tabs'] ?? array() );

		// The banner's two buttons, plus its artwork image. Empty is a valid value for
		// the buttons — it is what an unavailable destination looks like — and
		// esc_url_raw() preserves it.
		foreach ( array( 'ctaUrl', 'patternsUrl', 'artUrl' ) as $key ) {
			if ( isset( $config['hero'][ $key ] ) ) {
				$config['hero'][ $key ] = esc_url_raw( (string) $config['hero'][ $key ] );
			}
		}

		if ( isset( $config['manage']['banner']['artUrl'] ) ) {
			$config['manage']['banner']['artUrl'] = esc_url_raw( (string) $config['manage']['banner']['artUrl'] );
		}

		// The Settings rail is copy only, but every integration and module card
		// carries a docs href of its own.
		foreach ( array( 'integrations', 'modules' ) as $section ) {
			if ( isset( $config['settingsPage'][ $section ] ) ) {
				$config['settingsPage'][ $section ]['items'] = self::harden_url_items(
					$config['settingsPage'][ $section ]['items'] ?? array()
				);
			}
		}

		// The Pro module cards carry docs links like the Free ones, and the banner an
		// upgrade href of its own.
		if ( isset( $config['settingsPage']['modules']['pro'] ) && is_array( $config['settingsPage']['modules']['pro'] ) ) {
			$pro               = $config['settingsPage']['modules']['pro'];
			$pro['items']      = self::harden_url_items( $pro['items'] ?? array() );
			$pro['upgradeUrl'] = esc_url_raw( (string) ( $pro['upgradeUrl'] ?? '' ) );

			$config['settingsPage']['modules']['pro'] = $pro;
		}

		$config['helpCenter']['items'] = self::harden_url_items( $config['helpCenter']['items'] ?? array() );
		$config['about']['plugins']    = self::harden_url_items( $config['about']['plugins'] ?? array() );
		$config['footer']['socials']   = self::harden_url_items( $config['footer']['socials'] ?? array() );

		foreach ( array( 'creditLinkUrl' ) as $key ) {
			if ( isset( $config['footer'][ $key ] ) ) {
				$config['footer'][ $key ] = esc_url_raw( (string) $config['footer'][ $key ] );
			}
		}

		/*
		 * The About intro carries two CTA hrefs and an image src, and every plugin
		 * card a logo src beside the `url` harden_url_items() has already escaped —
		 * all of them end up in an href or an <img> in the browser.
		 */
		foreach ( array( 'primaryCta', 'secondaryCta' ) as $cta ) {
			if ( isset( $config['about'][ $cta ]['url'] ) ) {
				$config['about'][ $cta ]['url'] = esc_url_raw( (string) $config['about'][ $cta ]['url'] );
			}
		}

		if ( isset( $config['about']['image']['url'] ) ) {
			$config['about']['image']['url'] = esc_url_raw( (string) $config['about']['image']['url'] );
		}

		$config['about']['plugins'] = array_map(
			static function ( $plugin ) {
				if ( is_array( $plugin ) && isset( $plugin['logo'] ) ) {
					$plugin['logo'] = esc_url_raw( (string) $plugin['logo'] );
				}
				return $plugin;
			},
			(array) ( $config['about']['plugins'] ?? array() )
		);

		// The chat id is handed to a third-party loader as a global, so it is
		// re-validated even though it normally comes from a PHP constant.
		if ( isset( $config['liveChat'] ) && is_array( $config['liveChat'] ) ) {
			$config['liveChat']['websiteId']   = self::sanitize_chat_id( (string) ( $config['liveChat']['websiteId'] ?? '' ) );
			$config['liveChat']['fallbackUrl'] = esc_url_raw( (string) ( $config['liveChat']['fallbackUrl'] ?? '' ) );
			$config['liveChat']['provider']    = sanitize_key( (string) ( $config['liveChat']['provider'] ?? '' ) );
		}

		return $config;
	}

	/**
	 * Escape the `url` key of every item in a list.
	 *
	 * @param mixed $items Candidate list.
	 * @return array<int,array<string,mixed>>
	 */
	private static function harden_url_items( $items ): array {
		if ( ! is_array( $items ) ) {
			return array();
		}

		$clean = array();
		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			if ( isset( $item['url'] ) ) {
				$item['url'] = esc_url_raw( (string) $item['url'] );
			}
			$clean[] = $item;
		}

		return $clean;
	}

	/**
	 * A Crisp website id (a UUID), or '' when the value is not one.
	 *
	 * Crisp reads this from a `window` global and uses it to build the script's
	 * session URL, so anything but a UUID is rejected outright.
	 *
	 * @param string $id Candidate id.
	 * @return string
	 */
	public static function sanitize_chat_id( string $id ): string {
		$id = trim( $id );
		return preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id ) ? $id : '';
	}
}

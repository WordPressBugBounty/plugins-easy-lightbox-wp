<?php
/**
 * Dashboard screen integration: hash-route redirects + screen chrome.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Admin;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * WordPress-side integration for the single-page dashboard.
 *
 * The dashboard is ONE admin page (`shaped-gallery-getting-started`) hosting a React
 * SPA whose sub-pages are hash routes (`#manage`, `#settings`, `#about-us`). WordPress cannot
 * carry a `#fragment` inside an `add_submenu_page()` slug — it would be URL-encoded
 * and the link would break — so each SPA route also gets a plain, hash-free submenu
 * slug that this class 302s to the host page plus the fragment on `admin_init`.
 * The same `admin_init` also carries a second, unrelated redirect: EVERY activation
 * of either build — not only the site's first — lands here too, see
 * {@see self::maybe_redirect_after_activation()}.
 *
 * Scope is deliberately narrow: routing and screen chrome only. The dashboard's data
 * and copy live in {@see DashboardConfig}; menu registration and page markup stay in
 * {@see Menu}.
 */
class Dashboard {

	/**
	 * The one admin page that hosts the SPA.
	 *
	 * @var string
	 */
	const PAGE_SLUG = 'shaped-gallery-getting-started';

	/**
	 * Route rendered when no hash / no mapped slug is present.
	 *
	 * @var string
	 */
	const DEFAULT_ROUTE = 'getting-started';

	/**
	 * Route rendering the Manage Galleries screen.
	 *
	 * Its hash-free submenu slug is the plugin's top-level menu slug ({@see Menu::SLUG}),
	 * because Manage Galleries is what the top-level menu item has always pointed at.
	 *
	 * @var string
	 */
	const MANAGE_ROUTE = 'manage';

	/**
	 * Hash-free submenu slug that maps to the Settings route.
	 *
	 * @var string
	 */
	const SETTINGS_SLUG = 'shaped-gallery-settings';

	/**
	 * Hash-free submenu slug that maps to the About Us route.
	 *
	 * @var string
	 */
	const ABOUT_SLUG = 'shaped-gallery-about-us';

	/**
	 * Transient flagging "an activation just ran" so the admin's very next page load
	 * can redirect to the Dashboard.
	 *
	 * Set from BOTH bootstrap files' `register_activation_hook()` closures — every
	 * activation, not only a site's first — and cleared the moment
	 * {@see self::maybe_redirect_after_activation()} acts on it. A transient, not a
	 * permanent option, because redirecting has to happen exactly once per activation
	 * and then stop; the short TTL is a safety net against an abandoned flag, not the
	 * intended read path.
	 *
	 * It has to survive across a request boundary rather than redirecting from
	 * inside the activation hook directly, because that hook runs WHILE core's own
	 * `activate_plugin()` is still executing — before ITS `Location` header is sent —
	 * so a redirect issued from there would race, not replace, that header. This
	 * method only ever gets a real chance to redirect on the page load that follows:
	 * `plugins.php`, whichever build set the flag.
	 *
	 * Reaching this flag is NOT always through the direct call, either — see
	 * {@see self::maybe_flag_sibling_activation()} for the case that call cannot
	 * cover at all.
	 *
	 * @var string
	 */
	const ACTIVATION_REDIRECT_TRANSIENT = 'shaped_gallery_activation_redirect';

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_init', array( $this, 'maybe_redirect_route' ), 1 );
		add_action( 'admin_init', array( $this, 'maybe_redirect_after_activation' ), 1 );
		// Catches the sibling build's own activation on the request where THIS build
		// is the one actually running — see the doc-block below.
		add_action( 'activated_plugin', array( __CLASS__, 'maybe_flag_sibling_activation' ) );
		add_action( 'in_admin_header', array( $this, 'suppress_admin_notices' ), 1 );
	}

	/**
	 * Raise {@see self::ACTIVATION_REDIRECT_TRANSIENT}. Called from each build's own
	 * `register_activation_hook()` closure — never from here — so it has to be a
	 * plain static call with no dependency on this class having booted yet.
	 *
	 * @return void
	 */
	public static function flag_activation_redirect(): void {
		set_transient( self::ACTIVATION_REDIRECT_TRANSIENT, 1, MINUTE_IN_SECONDS );
	}

	/**
	 * Also flag the redirect when the OTHER build in this pair is the one just
	 * activated — the case the direct `register_activation_hook()` call cannot
	 * reach at all, not merely unreliably.
	 *
	 * Activating Pro while Free is active never runs Pro's own activation hook: the
	 * validation "sandbox" scrape `include_once`s Pro's file first, in a request
	 * where Free already defined `SHAPED_GALLERY_VERSION`, so Pro's own §6.21 guard
	 * returns before it ever reaches `register_activation_hook()` — and PHP's
	 * `include_once` then treats the real, later inclusion as a no-op for that same
	 * path, so that line is never reached at all this request, by either inclusion.
	 * Deactivating Pro back down to Free hits the exact mirror image on Free's own
	 * §1b guard. Either way, the build that DOES fully boot this request is the one
	 * still standing after the switch, so hooking WordPress's own build-agnostic
	 * `activated_plugin` action from here — registered by whichever build is
	 * running — is what actually observes the sibling's activation.
	 *
	 * @param string $plugin Basename of the plugin core just activated.
	 * @return void
	 */
	public static function maybe_flag_sibling_activation( string $plugin ): void {
		// The exact two basenames this pair can ever be, self included (redundant
		// with the direct call for one's own activation, but harmless — flagging
		// twice sets the same transient twice).
		//
		// This build ships from the `easy-lightbox-wp` WordPress.org slug, so its
		// directory is the slug and its main file is `plugin-main.php` — see §24.
		// The literal is unavoidable here: the hook fires for the SIBLING's
		// activation too, in a request where only one of the two builds is loaded,
		// so there is no constant to derive the other one from.
		$pair = array( 'easy-lightbox-wp/plugin-main.php', 'shaped-gallery-pro/shaped-gallery-pro.php' );

		if ( ! in_array( $plugin, $pair, true ) ) {
			return;
		}

		self::flag_activation_redirect();
	}

	/**
	 * Every route the SPA can render, in nav order.
	 *
	 * @return array<int,string>
	 */
	public static function route_keys(): array {
		return array( self::DEFAULT_ROUTE, self::MANAGE_ROUTE, 'settings', 'about-us' );
	}

	/**
	 * Hash-free submenu slug ⇒ SPA route.
	 *
	 * The host slug is deliberately absent: a mapping for it would redirect the page
	 * to itself forever.
	 *
	 * @return array<string,string>
	 */
	public static function routes(): array {
		$routes = array(
			Menu::SLUG          => self::MANAGE_ROUTE,
			self::SETTINGS_SLUG => 'settings',
			self::ABOUT_SLUG    => 'about-us',
		);

		/**
		 * Filters the submenu-slug ⇒ SPA-route map used for dashboard redirects.
		 *
		 * Values are re-validated against Dashboard::route_keys() afterwards, and the
		 * host slug is always dropped, so a filter cannot create a redirect loop or
		 * inject an arbitrary fragment.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string,string> $routes Submenu slug ⇒ route key.
		 */
		$routes = (array) apply_filters( 'shaped_gallery_dashboard_routes', $routes );

		$valid = self::route_keys();
		$clean = array();
		foreach ( $routes as $slug => $route ) {
			$slug  = sanitize_key( (string) $slug );
			$route = sanitize_key( (string) $route );
			if ( '' === $slug || self::PAGE_SLUG === $slug || ! in_array( $route, $valid, true ) ) {
				continue;
			}
			$clean[ $slug ] = $route;
		}

		return $clean;
	}

	/**
	 * Route for a submenu slug, or null when the slug is the host / unknown.
	 *
	 * @param string $page Admin page slug.
	 * @return string|null
	 */
	public static function route_for_page( string $page ): ?string {
		$routes = self::routes();
		return $routes[ $page ] ?? null;
	}

	/**
	 * Whether a page slug belongs to the dashboard (host or a mapped route).
	 *
	 * @param string $page Admin page slug.
	 * @return bool
	 */
	public static function is_dashboard_page( string $page ): bool {
		return self::PAGE_SLUG === $page || null !== self::route_for_page( $page );
	}

	/**
	 * Canonical dashboard URL, optionally deep-linked to a route.
	 *
	 * @param string $route Route key. Empty for the default route.
	 * @return string
	 */
	public static function page_url( string $route = '' ): string {
		$url = admin_url( 'admin.php?page=' . self::PAGE_SLUG );
		if ( '' !== $route && in_array( $route, self::route_keys(), true ) ) {
			$url .= '#' . $route;
		}
		return $url;
	}

	/**
	 * Route the current request should render (drives the mount node's data-route).
	 *
	 * The hash never reaches PHP, so this only reflects which submenu slug was
	 * requested; the SPA prefers a valid `location.hash` over this value.
	 *
	 * @return string
	 */
	public static function current_route(): string {
		return self::route_for_page( self::requested_page() ) ?? self::DEFAULT_ROUTE;
	}

	/**
	 * Redirect a hash-free route slug to the host page plus its fragment.
	 *
	 * Safe on `admin_init`: authentication (`auth_redirect()`) and `admin_menu` have
	 * already run, while `set_current_screen()` and `admin-header.php` have not — so
	 * nothing has been output yet and the `Location` header cannot fail.
	 *
	 * No nonce, by design: this is an idempotent GET navigation that changes no state
	 * and is reached from links WordPress itself prints un-nonced (the admin sidebar).
	 * A nonce would break bookmarks and sidebar links for zero security gain.
	 *
	 * @return void
	 */
	public function maybe_redirect_route(): void {
		// `admin_init` also fires on admin-ajax.php / admin-post.php / load-scripts.php.
		if ( 'admin.php' !== ( $GLOBALS['pagenow'] ?? '' ) ) {
			return;
		}

		$route = self::route_for_page( self::requested_page() );
		if ( null === $route ) {
			return;
		}

		// Let WordPress render its own permission error on the URL the user asked for.
		if ( ! current_user_can( Menu::CAPABILITY ) ) {
			return;
		}

		wp_safe_redirect( self::page_url( $route ) );
		exit;
	}

	/**
	 * Send the admin to the Dashboard after EVERY activation of either build — not
	 * only the site's first — instead of wherever core's own post-activation
	 * redirect would otherwise leave them.
	 *
	 * Reads, and immediately clears, {@see self::ACTIVATION_REDIRECT_TRANSIENT}.
	 * Deliberately narrower than {@see self::maybe_redirect_route()}'s bar:
	 *
	 * - `plugins.php` only, and only on the plain single-activation path — a bulk
	 *   activation (`activate-multi`) leaves every other just-activated plugin's own
	 *   notice unread if this one hijacks the response, so it is skipped entirely.
	 * - Network admin is skipped: network-activating has no single site to land a
	 *   Dashboard on.
	 * - `wp_doing_ajax()` / `wp_doing_cron()` are excluded because `admin_init` also
	 *   fires there, and neither context can carry a redirect anywhere a person
	 *   would see it.
	 *
	 * @return void
	 */
	public function maybe_redirect_after_activation(): void {
		if ( 'plugins.php' !== ( $GLOBALS['pagenow'] ?? '' )
			|| is_network_admin()
			|| isset( $_GET['activate-multi'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- idempotent GET, presence-only check.
			|| wp_doing_ajax()
			|| wp_doing_cron()
		) {
			return;
		}

		if ( ! get_transient( self::ACTIVATION_REDIRECT_TRANSIENT ) ) {
			return;
		}

		delete_transient( self::ACTIVATION_REDIRECT_TRANSIENT );

		// Let WordPress render its own permission error rather than redirect a user
		// who cannot reach the Dashboard anyway.
		if ( ! current_user_can( Menu::CAPABILITY ) ) {
			return;
		}

		wp_safe_redirect( self::page_url() );
		exit;
	}

	/**
	 * Hide THIRD-PARTY admin notices on the dashboard screen only.
	 *
	 * `in_admin_header` runs before `admin_notices` / `all_admin_notices`, so the
	 * notices are removed before anything can print them.
	 *
	 * ## Why this is not `remove_all_actions()` any more
	 *
	 * It was, and that removed WordPress's own notices along with everyone else's —
	 * the core-update and PHP-version nags, `maintenance_nag`, and whatever a future
	 * release adds. The design goal is a full-bleed screen that another plugin's
	 * marketing banner cannot push around; it was never to keep an administrator
	 * from being told their site needs a security update. A plugin screen is not
	 * entitled to suppress that, and "we hid the update notice" is a bad answer
	 * whether or not a guideline names it.
	 *
	 * So the sweep is ATTRIBUTED: each registered callback is resolved to the file
	 * that declared it, and only callbacks declared inside a plugin, a must-use
	 * plugin or a theme are removed. Core's own live in `wp-admin/` and
	 * `wp-includes/`, so they survive by construction rather than by an allow-list
	 * of function names that a WordPress release could invalidate.
	 *
	 * Two deliberate biases, both towards NOT removing:
	 *
	 * - A callback whose declaring file cannot be determined is kept. Reflection
	 *   fails on a callable that is not what it claims to be, and a notice this
	 *   method cannot attribute is one it has no business hiding.
	 * - This plugin's own notices are kept, so the guard can never silence a message
	 *   ShapedGallery itself needs to show on its own screen.
	 *
	 * @return void
	 */
	public function suppress_admin_notices(): void {
		if ( ! self::is_dashboard_page( self::requested_page() ) ) {
			return;
		}

		/**
		 * Filters whether the dashboard hides third-party admin notices.
		 *
		 * @since 1.0.0
		 *
		 * @param bool $hide Whether to remove third-party notices on the dashboard screen.
		 */
		if ( ! apply_filters( 'shaped_gallery_dashboard_hide_notices', true ) ) {
			return;
		}

		self::remove_third_party_notices( 'admin_notices' );
		self::remove_third_party_notices( 'all_admin_notices' );
	}

	/**
	 * Drop every third-party callback from one notice hook.
	 *
	 * The callback list is SNAPSHOT before anything is removed: `remove_action()`
	 * mutates the same `WP_Hook::$callbacks` array, and removing while iterating it
	 * skips entries.
	 *
	 * @param string $hook Notice hook name.
	 * @return void
	 */
	private static function remove_third_party_notices( string $hook ): void {
		global $wp_filter;

		// Direct `$wp_filter` access because there is no API that enumerates a hook's
		// callbacks — core reads it the same way in `has_filter()`.
		if ( ! isset( $wp_filter[ $hook ] ) || ! $wp_filter[ $hook ] instanceof \WP_Hook ) {
			return;
		}

		$snapshot = $wp_filter[ $hook ]->callbacks;

		foreach ( $snapshot as $priority => $callbacks ) {
			foreach ( $callbacks as $registered ) {
				if ( ! isset( $registered['function'] ) ) {
					continue;
				}

				if ( ! self::notice_is_removable( self::callback_file( $registered['function'] ) ) ) {
					continue;
				}

				remove_action( $hook, $registered['function'], (int) $priority );
			}
		}
	}

	/**
	 * Whether a notice declared in `$file` may be removed.
	 *
	 * The whole decision, kept pure and path-only so `verify-dashboard.php` can
	 * assert it without a `WP_Hook`, a reflection target or an admin request — the
	 * same split {@see \ShapedPlugin\ShapedGallery\Frontend\GalleryPassword::unlock()}
	 * uses for the same reason.
	 *
	 * @param string $file Absolute path of the file that declared the callback, or
	 *                     '' when it could not be determined.
	 * @return bool
	 */
	public static function notice_is_removable( string $file ): bool {
		if ( '' === $file ) {
			return false;
		}

		$file = wp_normalize_path( $file );

		// Our own notices are never swept — see the doc-block on suppress_admin_notices().
		if ( defined( 'SHAPED_GALLERY_PATH' ) && str_starts_with( $file, wp_normalize_path( SHAPED_GALLERY_PATH ) ) ) {
			return false;
		}

		foreach ( self::third_party_roots() as $root ) {
			if ( '' !== $root && str_starts_with( $file, $root ) ) {
				return true;
			}
		}

		// Anything outside those roots is core, a drop-in, or unattributable. Kept.
		return false;
	}

	/**
	 * The directories whose notices count as third-party.
	 *
	 * Plugins, must-use plugins and themes. Everything else — `wp-admin/`,
	 * `wp-includes/`, a drop-in — is either WordPress itself or something the site
	 * installed at a level this screen should not be second-guessing.
	 *
	 * @return array<int,string> Normalized, trailing-slashed paths.
	 */
	private static function third_party_roots(): array {
		$roots = array();

		foreach ( array( 'WP_PLUGIN_DIR', 'WPMU_PLUGIN_DIR' ) as $constant ) {
			if ( defined( $constant ) ) {
				$roots[] = trailingslashit( wp_normalize_path( (string) constant( $constant ) ) );
			}
		}

		if ( function_exists( 'get_theme_roots' ) && function_exists( 'get_theme_root' ) ) {
			foreach ( (array) get_theme_roots() as $theme_root ) {
				$roots[] = trailingslashit( wp_normalize_path( get_theme_root( (string) $theme_root ) ) );
			}
		}

		return array_values( array_unique( array_filter( $roots ) ) );
	}

	/**
	 * The file that declared a callback, or '' when it cannot be resolved.
	 *
	 * Every callable shape `add_action()` accepts: a function name, a
	 * `Class::method` string, a `[ $object_or_class, 'method' ]` pair, a closure, and
	 * an invokable object. A `ReflectionException` — or an internal function, whose
	 * `getFileName()` is `false` — answers '', which
	 * {@see self::notice_is_removable()} treats as "keep".
	 *
	 * @param mixed $callback Registered callback.
	 * @return string
	 */
	private static function callback_file( $callback ): string {
		try {
			if ( $callback instanceof \Closure ) {
				$reflection = new \ReflectionFunction( $callback );
			} elseif ( is_string( $callback ) && str_contains( $callback, '::' ) ) {
				// Split rather than passing "Class::method" as one argument: the
				// single-argument ReflectionMethod constructor is deprecated as of PHP
				// 8.3, and this plugin runs on 8.1 through current, so the two-argument
				// form is the only spelling that is silent on all of them.
				list( $reflected_class, $reflected_method ) = explode( '::', $callback, 2 );
				$reflection = new \ReflectionMethod( $reflected_class, $reflected_method );
			} elseif ( is_string( $callback ) ) {
				if ( ! function_exists( $callback ) ) {
					return '';
				}
				$reflection = new \ReflectionFunction( $callback );
			} elseif ( is_array( $callback ) && 2 === count( $callback ) ) {
				$target     = is_object( $callback[0] ) ? $callback[0] : (string) $callback[0];
				$reflection = new \ReflectionMethod( $target, (string) $callback[1] );
			} elseif ( is_object( $callback ) && method_exists( $callback, '__invoke' ) ) {
				$reflection = new \ReflectionMethod( $callback, '__invoke' );
			} else {
				return '';
			}
		} catch ( \ReflectionException $e ) {
			return '';
		}

		return (string) $reflection->getFileName();
	}

	/**
	 * The single sanitized read of the requested admin page slug.
	 *
	 * @return string
	 */
	private static function requested_page(): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Menu routing, no state change.
		return isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
	}
}

<?php
/**
 * Uninstall ShapedGallery.
 *
 * Runs only on an explicit delete, and even then removes NOTHING unless the site has
 * opted in: Settings -> Advanced Controls -> "Clean-up Data on Deletion" writes
 * `cleanupOnDeletion` into `shaped_gallery_settings`, and this file is the only reader
 * of it. Deleting a plugin is routinely how a site swaps hosts, debugs a conflict or
 * moves from Free to Pro, so "the files are gone" is not consent to destroy the
 * content those files were displaying.
 *
 * With the flag on it removes everything this plugin ever wrote to the CURRENT blog:
 * gallery posts and their meta, the settings row, the media-cache version, the
 * pattern-library favourites, the install record, every `shaped_gallery_` transient, the
 * password verifiers, and the gallery capabilities on every role.
 *
 * Idempotent throughout — every delete is a no-op against data that is already gone,
 * so a re-run, a half-finished run, or an install that never stored a thing all end
 * the same way.
 *
 * @package ShapedPlugin\ShapedGallery
 */

// Exit if accessed directly or not a genuine uninstall request.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/*
 * ShapedGallery Pro present: delete NOTHING.
 *
 * Pro is not a separate product with its own data — it carries the same engine over
 * the same `shaped_gallery` posts, the same `shaped_gallery_settings` row and the same
 * `shaped-gallery/gallery` block. So a site that deletes this plugin while Pro is
 * installed has removed the free build's FILES, not its galleries, and running the
 * cleanup below would wipe every gallery on a site that is still displaying them.
 *
 * Presence on disk rather than activation: Pro cannot be active at this moment
 * anyway. WordPress deactivates a plugin before uninstalling it, and Pro treats this
 * plugin as a hard dependency, so the realistic sequence — deactivate free, delete
 * free — leaves Pro switched off and an `is_plugin_active()` check would answer
 * "gone" for a plugin the user still has. Pro's own `uninstall.php` makes the
 * mirror-image check, which is what stops either deletion order from being lossy.
 */
if ( file_exists( WP_PLUGIN_DIR . '/shaped-gallery-pro/shaped-gallery-pro.php' ) ) {
	return;
}

/*
 * Has the CURRENT blog opted into losing its data?
 *
 * Read raw rather than through `Admin\Settings::get()`. The plugin is deactivated by
 * the time this file runs, so nothing of it is loaded and the sanitizer would have to
 * be autoloaded just to answer a yes/no about one boolean — and a sanitizer that ever
 * failed to load would then have to decide whether "unreadable" means "delete".
 * Reading the row directly makes the failure mode unambiguous: anything that is not a
 * settings array with a truthy `cleanupOnDeletion` in it is a NO.
 *
 * Fails CLOSED, in other words, and in the direction that keeps data. A missing row (a
 * site that never opened the Settings screen), a corrupted row, a serialized string, a
 * row belonging to a blog that never activated the plugin — every one of them declines
 * to delete, because the only reading that destroys anything is an explicit,
 * affirmative one.
 *
 * A closure per §1b: a named function here would collide with Pro's own during a bulk
 * delete that includes both files in one process.
 */
$shaped_gallery_cleanup_enabled = static function (): bool {
	$settings = get_option( 'shaped_gallery_settings', array() );

	// `Admin\Settings::defaults()` declares the key; this is its only reader.
	return is_array( $settings ) && ! empty( $settings['cleanupOnDeletion'] );
};

/*
 * Remove every trace of ShapedGallery from the CURRENT blog's tables.
 *
 * A closure, not a named function: this file is `include`d by core's
 * `uninstall_plugin()`, and a bulk delete that removes Free and Pro in the same
 * request includes BOTH plugins' `uninstall.php` in one process. A named top-level
 * function here would collide with Pro's identically-named one exactly the way
 * `plugin-main.php` already guards against for the boot callback — same compile-time
 * binding, same fatal, so the fix is the same closure pattern.
 *
 * Split out from the top-level flow so a network-wide delete can run it once per
 * site — `get_posts()`, `delete_option()`, `$wpdb` and the capability roles it
 * touches are all scoped to whichever blog `switch_to_blog()` last pointed at.
 */
$shaped_gallery_uninstall_site = static function () {
	/*
	 * Delete every shaped_gallery post (and its meta).
	 *
	 * No explicit `suppress_filters`: `get_posts()` already defaults it to true, so
	 * third-party query filters cannot hide a gallery from this sweep, and restating
	 * it trips WordPressVIPMinimum's SuppressFilters sniff in the plugin check.
	 */
	$shaped_gallery_galleries = get_posts(
		array(
			'post_type'   => 'shaped_gallery',
			// NOT 'any': that keyword skips statuses flagged `exclude_from_search`, which
			// includes `trash` — and deleting a gallery now trashes it by default, so the
			// bin is exactly where galleries are most likely to be sitting at uninstall.
			'post_status' => array( 'publish', 'draft', 'pending', 'future', 'private', 'trash', 'auto-draft', 'inherit' ),
			'numberposts' => -1,
			'fields'      => 'ids',
		)
	);

	foreach ( $shaped_gallery_galleries as $shaped_gallery_gallery_id ) {
		wp_delete_post( $shaped_gallery_gallery_id, true );
	}

	// Delete plugin options.
	delete_option( 'shaped_gallery_settings' );
	delete_option( 'shaped_gallery_media_version' );
	// Ready Patterns favourites (Patterns\PatternLibrary::FAVOURITES_OPTION) — a plain
	// option, not a transient and not `pwdv_`-prefixed, so it needs its own delete.
	delete_option( 'shaped_gallery_pattern_favorites' );

	/*
	 * The install record (Core\Install). Deleted rather than kept, because
	 * `cleanupOnDeletion` promises to remove everything this plugin ever wrote — the
	 * cost being that a delete-and-reinstall starts a fresh first-activation record.
	 * A site that wants its galleries AND its history kept simply leaves the flag off,
	 * which is the default.
	 */
	delete_option( 'shaped_gallery_first_activated_version' );
	delete_option( 'shaped_gallery_first_activated_date' );
	delete_option( 'shaped_gallery_current_version' );

	/*
	 * Give back the gallery capabilities. Uninstall and not deactivation: a site that
	 * deactivates to debug, or updates through a deactivate/activate cycle, must not come
	 * back with an administrator who cannot open their own galleries.
	 *
	 * The class has to be loaded by hand. Core deactivates a plugin before uninstalling
	 * it, so `plugin-main.php` never ran this request, no autoloader is registered, and
	 * a bare `class_exists()` check answers "no" every single time — which quietly left
	 * `*_shaped_galleries` on every role and `shaped_gallery_caps_version` in the options
	 * table on a run that had promised to remove everything.
	 *
	 * Two files, because `Capabilities::primitives()` composes its names from
	 * `PostType::CAPABILITY_TYPE`; requiring the class without it would fatal inside a
	 * delete that has already destroyed the galleries. Both are plain declarations
	 * behind the usual `WPINC` guard, with no side effects at file scope.
	 *
	 * `class_exists( …, false )` — autoload OFF — before each require, and that is not
	 * belt-and-braces: Pro compiles from the SAME namespace (§2), so a bulk delete of
	 * both plugins in one process could otherwise redeclare an already-loaded class and
	 * fatal. Autoload off also stops the check itself from firing some other plugin's
	 * autoloader at a name it does not own.
	 */
	foreach ( array(
		'\ShapedPlugin\ShapedGallery\Core\PostType'     => 'src/Core/PostType.php',
		'\ShapedPlugin\ShapedGallery\Core\Capabilities' => 'src/Core/Capabilities.php',
	) as $shaped_gallery_class => $shaped_gallery_file ) {
		$shaped_gallery_path = plugin_dir_path( __FILE__ ) . $shaped_gallery_file;

		if ( ! class_exists( $shaped_gallery_class, false ) && is_readable( $shaped_gallery_path ) ) {
			require_once $shaped_gallery_path;
		}
	}

	if ( class_exists( '\ShapedPlugin\ShapedGallery\Core\Capabilities', false ) ) {
		\ShapedPlugin\ShapedGallery\Core\Capabilities::revoke();
	} else {
		// The class could not be loaded — a partially deleted directory, say. The
		// version row is what makes the grant idempotent, so removing it at least
		// leaves a reinstall able to re-grant rather than believing it already had.
		delete_option( 'shaped_gallery_caps_version' );
	}

	/**
	 * Clear the transients used for dynamic CSS, media and pattern-library caching.
	 *
	 * One prepared statement rather than a `LIKE` glued together by hand: the prefix is
	 * a constant here, but a query in an uninstall handler is exactly the place a future
	 * edit turns a literal into a variable without anyone re-reading the escaping.
	 * `esc_like()` first, so an underscore in the prefix stays a literal underscore
	 * instead of a single-character wildcard.
	 */
	global $wpdb;

	$shaped_gallery_like = $wpdb->esc_like( '_transient_shaped_gallery_' ) . '%';
	$shaped_gallery_to   = $wpdb->esc_like( '_transient_timeout_shaped_gallery_' ) . '%';

	/*
	 * Password verifiers (see Frontend\GalleryPassword::migrate_on_save()) — one row
	 * per password-protected gallery, never a transient, so it needs its own prefix
	 * here rather than riding the two above.
	 */
	$shaped_gallery_pwdv = $wpdb->esc_like( 'shaped_gallery_pwdv_' ) . '%';

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- one-off cleanup on uninstall; there is no core API that deletes transients or options by prefix.
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s",
			$shaped_gallery_like,
			$shaped_gallery_to,
			$shaped_gallery_pwdv
		)
	);
};

/*
 * Network-activated installs keep one copy of this plugin but one `wp_posts` /
 * `wp_options` table PER SITE, so a network-wide delete has to visit each of them —
 * `switch_to_blog()` is what makes `get_posts()`, `delete_option()` and `$wpdb` above
 * point at the right tables on each pass. A single-site install has exactly one blog
 * to clean, which is why the `else` branch is not merely a shorter path but the same
 * one an `is_multisite() === false` install has always run.
 *
 * The opt-in is checked INSIDE the loop, after the switch, and that placement is the
 * whole of its multisite correctness: `shaped_gallery_settings` is a per-blog row, so
 * each site on the network answers for itself. One subsite ticking the box does not
 * empty its neighbours, and — the case that actually matters — a subsite that never
 * ticked it keeps its galleries even when the network admin deletes the plugin.
 */
if ( is_multisite() ) {
	$shaped_gallery_site_ids = get_sites( array( 'fields' => 'ids' ) );

	foreach ( $shaped_gallery_site_ids as $shaped_gallery_site_id ) {
		switch_to_blog( (int) $shaped_gallery_site_id );

		if ( $shaped_gallery_cleanup_enabled() ) {
			$shaped_gallery_uninstall_site();
		}

		restore_current_blog();
	}
} elseif ( $shaped_gallery_cleanup_enabled() ) {
	$shaped_gallery_uninstall_site();
}

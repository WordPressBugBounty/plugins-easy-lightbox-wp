<?php
/**
 * Plugin Name: Easy Lightbox
 * Plugin URI: https://wordpress.org/plugins/easy-lightbox-wp
 * Description: This plugin will enable an awesome Lightbox in your WordPress site.
 * Author: ShapedPlugin
 * Author URI: https://shapedplugin.com
 * Version: 1.1.4
 * License: GPLv2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package Easy_Lightbox
 *
 * @category Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/*Some Set-up*/
define( 'LAZY_P_WP_LIGBTBOX_FREE', plugin_dir_url( __FILE__ ) );
define( 'EASY_LIGHTBOX_VERSION', '1.1.4' );

/*
 * Install record option names.
 *
 * The version this site first activated, the date it did, and the version running
 * now. None of them are autoloaded: nothing on the front end reads them.
 */
define( 'EASY_LIGHTBOX_FIRST_VERSION_OPTION', 'easy_lightbox_first_activated_version' );
define( 'EASY_LIGHTBOX_FIRST_DATE_OPTION', 'easy_lightbox_first_activated_date' );
define( 'EASY_LIGHTBOX_CURRENT_VERSION_OPTION', 'easy_lightbox_current_version' );

/**
 * Record the install: what this site started on, when, and what it runs now.
 *
 * Registered on activation and on every admin load. An update applied by WordPress's
 * own updater fires no activation hook, and neither does a network activation, so the
 * admin_init pass is what keeps the record honest in both cases. Cheap and idempotent
 * on the common path: two reads that short-circuit and one string comparison.
 *
 * @return void
 */
function lazy_p_wp_lightbox_free_record_install() {
	lazy_p_wp_lightbox_free_maybe_record_first_activation();
	lazy_p_wp_lightbox_free_sync_current_version();
}
register_activation_hook( __FILE__, 'lazy_p_wp_lightbox_free_record_install' );
add_action( 'admin_init', 'lazy_p_wp_lightbox_free_record_install' );

/**
 * Record the first activation version and date, the very first time only.
 *
 * Written with add_option(), which refuses to overwrite an existing row, so
 * reactivating the plugin never makes a long-standing install look brand new. A site
 * that already had the plugin before this record existed stores the version it is
 * running now, which is an upper bound rather than the version it truly started on.
 *
 * @return void
 */
function lazy_p_wp_lightbox_free_maybe_record_first_activation() {
	if ( false === get_option( EASY_LIGHTBOX_FIRST_VERSION_OPTION, false ) ) {
		add_option( EASY_LIGHTBOX_FIRST_VERSION_OPTION, EASY_LIGHTBOX_VERSION, '', false );
	}

	if ( false === get_option( EASY_LIGHTBOX_FIRST_DATE_OPTION, false ) ) {
		add_option( EASY_LIGHTBOX_FIRST_DATE_OPTION, current_time( 'mysql' ), '', false );
	}
}

/**
 * Keep the current version option in step with the code that is running.
 *
 * The write only happens on the request that follows an actual version change, in
 * either direction: a downgrade moves the row backwards, which is the truth.
 *
 * @return void
 */
function lazy_p_wp_lightbox_free_sync_current_version() {
	if ( EASY_LIGHTBOX_VERSION !== get_option( EASY_LIGHTBOX_CURRENT_VERSION_OPTION ) ) {
		update_option( EASY_LIGHTBOX_CURRENT_VERSION_OPTION, EASY_LIGHTBOX_VERSION, false );
	}
}

/**
 * The plugin version this site first activated.
 *
 * @return string Empty string on a site whose record predates this tracking.
 */
function lazy_p_wp_lightbox_free_get_first_version() {
	return (string) get_option( EASY_LIGHTBOX_FIRST_VERSION_OPTION, '' );
}

/**
 * The date and time of that first activation, in site-local mysql format.
 *
 * @return string Empty string when no first activation has been recorded.
 */
function lazy_p_wp_lightbox_free_get_first_activation_date() {
	return (string) get_option( EASY_LIGHTBOX_FIRST_DATE_OPTION, '' );
}

/**
 * The plugin version last recorded as running on this site.
 *
 * @return string Empty string before the first record is written.
 */
function lazy_p_wp_lightbox_free_get_current_version() {
	return (string) get_option( EASY_LIGHTBOX_CURRENT_VERSION_OPTION, '' );
}

/**
 * Whether this site started on a version older than the one given.
 *
 * This is what lets a later release apply a changed default, or a changed policy,
 * only to installs that started after it: true means an existing user who keeps the
 * old behaviour, false means an install that started on $version or later.
 *
 * An unrecorded install answers true. Activation writes the record before a new
 * install can serve a page, so a missing row means the plugin was already active
 * here before it tracked anything, which is an existing user by definition.
 *
 * @param string $version Version the new behaviour was introduced in.
 * @return bool
 */
function lazy_p_wp_lightbox_free_started_before( $version ) {
	$first_version = lazy_p_wp_lightbox_free_get_first_version();

	if ( '' === $first_version ) {
		return true;
	}

	return version_compare( $first_version, $version, '<' );
}

/**
 * Include JavaScript and CSS files.
 *
 * @return void
 */
function lazy_p_wp_lightbox_free_files() {
	wp_enqueue_script( 'lazy-p-lightbox-image-l-js', LAZY_P_WP_LIGBTBOX_FREE . 'js/images-loaded.min.js', array( 'jquery' ), EASY_LIGHTBOX_VERSION, true );
	wp_enqueue_script( 'lazy-p-lightbox-main-js', LAZY_P_WP_LIGBTBOX_FREE . 'js/litebox.min.js', array( 'jquery' ), EASY_LIGHTBOX_VERSION, true );
	wp_enqueue_style( 'lazy-p-lightbox-main-css', LAZY_P_WP_LIGBTBOX_FREE . 'css/litebox.min.css', array(), EASY_LIGHTBOX_VERSION, false );
}
add_action( 'wp_enqueue_scripts', 'lazy_p_wp_lightbox_free_files' );

/**
 * Initialize Lightbox
 *
 * @return void
 */
function lazy_p_wp_lightbox_free_head() {
	?>
	<script type="text/javascript">
		jQuery(document).ready(function() {
			jQuery(".litebox").liteBox();
			jQuery("div[id^=gallery] a").liteBox();

			jQuery('div.gallery a').attr('data-litebox-group', 'galone');
		});
	</script>
	<?php
}
add_action( 'wp_head', 'lazy_p_wp_lightbox_free_head' );

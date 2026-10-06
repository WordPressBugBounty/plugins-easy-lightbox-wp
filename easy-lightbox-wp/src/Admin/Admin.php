<?php
/**
 * Admin orchestrator.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Admin;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Wires up the admin menu and admin-only behaviours.
 */
class Admin {

	/**
	 * The single settings option.
	 *
	 * Kept as an alias of {@see Settings::OPTION} so existing callers keep working;
	 * the shape and the sanitizer live on Settings.
	 *
	 * @var string
	 */
	const SETTINGS_OPTION = Settings::OPTION;

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		/*
		 * `init`, and OUTSIDE the is_admin() guard below, because the Settings screen
		 * saves through core's /wp/v2/settings: a REST request is not is_admin() and
		 * never fires admin_init, so registering there left the option unexposed —
		 * the endpoint silently dropped the unknown key and answered 200 with nothing
		 * saved.
		 */
		add_action( 'init', array( $this, 'register_settings' ) );

		/*
		 * The other half of Settings::sanitize()'s lock, and outside the guard below
		 * for the same reason: the write it protects arrives over REST.
		 * `update_option_{$option}` is the write's own completion; `shutdown` covers
		 * the two paths that never fire it — update_option() returning early on an
		 * unchanged value, and the first-ever save taking the add_option() branch.
		 */
		add_filter( 'rest_pre_dispatch', array( SettingsLock::class, 'lock_rest_write' ), 10, 3 );

		// Priority 1: the row is already committed, so the lock is given back before
		// whatever else listens to the save, and is not held for the length of that
		// listener's work.
		add_action( 'update_option_' . self::SETTINGS_OPTION, array( SettingsLock::class, 'release' ), 1, 0 );
		add_action( 'shutdown', array( SettingsLock::class, 'release' ), 10, 0 );

		if ( ! is_admin() ) {
			return;
		}

		( new Menu() )->hooks();
		( new Dashboard() )->hooks();
		( new GalleryEditor() )->hooks();

		add_filter( 'plugin_action_links_' . SHAPED_GALLERY_BASENAME, array( $this, 'action_links' ) );
	}

	/**
	 * Register the settings option.
	 *
	 * Exposed through core's own `/wp/v2/settings` endpoint rather than a route of our
	 * own: it already enforces `manage_options` for both reads and writes, so the
	 * Settings screen needs no new write surface (§9).
	 *
	 * `additionalProperties` is false — the schema states exactly the keys the screen
	 * writes, and Settings::sanitize() allow-lists the same set, so an unknown
	 * property is rejected at the edge instead of being stored.
	 *
	 * @return void
	 */
	public function register_settings(): void {
		register_setting(
			'shaped_gallery_settings_group',
			self::SETTINGS_OPTION,
			array(
				'type'              => 'object',
				'sanitize_callback' => array( Settings::class, 'sanitize' ),
				'default'           => Settings::defaults(),
				'show_in_rest'      => array(
					'schema' => array(
						'type'                 => 'object',
						'additionalProperties' => false,
						'properties'           => array(

							/*
							 * Type only, no minimum/maximum: the schema is validated
							 * BEFORE the sanitize callback runs, so bounds here would
							 * reject an out-of-range value with a 400 instead of letting
							 * Settings::clamp_timeout() fold it into range — which is the
							 * friendlier behaviour and the one the sanitizer is built for.
							 */
							'cleanupOnDeletion' => array( 'type' => 'boolean' ),
							'cacheTimeout'      => array( 'type' => 'integer' ),
							'browserCaching'    => array( 'type' => 'boolean' ),
							'debugPerformance'  => array( 'type' => 'boolean' ),
							'retinaImages'      => array( 'type' => 'boolean' ),

							/*
							 * The module branches are open objects on purpose. Their
							 * shapes belong to the modules themselves (ModuleRegistry,
							 * IntegrationRegistry, Modules\Lightbox) and every one of
							 * those sanitizers is a strict allow-list, so
							 * restating each nested key here would be a second schema
							 * to keep in step — and a stale one would reject a valid
							 * write with a 400 the user cannot act on.
							 *
							 * `additionalProperties` MUST be stated. register_setting()
							 * runs rest_default_additional_properties_to_false() over
							 * the whole schema, which recurses into every object that
							 * does not declare it — so a bare `type => object` here
							 * inherits `false` with no `properties` to allow, and the
							 * endpoint rejects every key the panel sends.
							 */
							'modules'           => array(
								'type'                 => 'object',
								'additionalProperties' => true,
							),
							'integrations'      => array(
								'type'                 => 'object',
								'additionalProperties' => true,
							),
							'lightbox'          => array(
								'type'                 => 'object',
								'additionalProperties' => true,
							),
						),
					),
				),
			)
		);
	}

	/**
	 * Add "Galleries" and "Getting Started" quick links on the plugins screen.
	 *
	 * The second link is deliberately in place of an activation redirect: it is
	 * discoverable at the same moment, with none of the bulk-activation, WP-CLI and
	 * network-activation guard code a redirect would need.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public function action_links( array $links ): array {
		$custom = array(
			sprintf(
				'<a href="%s">%s</a>',
				esc_url( admin_url( 'admin.php?page=' . Menu::SLUG ) ),
				esc_html__( 'Galleries', 'easy-lightbox-wp' )
			),
			sprintf(
				'<a href="%s">%s</a>',
				esc_url( Dashboard::page_url() ),
				esc_html__( 'Getting Started', 'easy-lightbox-wp' )
			),
		);

		return array_merge( $custom, $links );
	}
}

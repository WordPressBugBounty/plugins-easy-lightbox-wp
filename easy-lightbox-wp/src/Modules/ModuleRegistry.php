<?php
/**
 * The feature-module on/off map: which modules exist, and which ship enabled.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Modules;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns the `modules` branch of `shaped_gallery_settings`.
 *
 * The Settings screen's Modules grid is one switch per key here, and every
 * runtime gate (`Lightbox::is_enabled()`, `ImageCustomUrl::is_enabled()`) reads
 * through {@see is_enabled()} rather than touching the option — so "is this
 * module on?" has exactly one answer whoever asks.
 *
 * The set is FIXED here, not by the localized copy: `sanitize()` is an
 * allow-list, so a filter that adds a card to the grid cannot store a switch the
 * plugin has no code for. Same contract as the JS `MODULE_PANELS` registry.
 */
final class ModuleRegistry {

	/**
	 * Module key => whether the plugin ships it enabled.
	 *
	 * Mirrors `MODULES` in `app/admin/pages/Settings/Modules.jsx` — the two lists
	 * are the same product decision stated for two runtimes, and a mismatch is a
	 * defect (the grid would draw a switch in the wrong position on a fresh
	 * install).
	 *
	 * @var array<string,bool>
	 */
	private const MODULES = array(
		'lightbox'         => true,
		'image-custom-url' => true,
		'ready-patterns'   => true,
	);

	/**
	 * The complete switch map, with the values the plugin ships with.
	 *
	 * @return array<string,bool>
	 */
	public static function defaults(): array {
		return self::MODULES;
	}

	/**
	 * Validate a submitted switch map.
	 *
	 * Allow-list: an unknown key is dropped, and a known key the caller omitted
	 * keeps `$base`'s value, so a partial write cannot silently disable a module
	 * the sender never mentioned.
	 *
	 * @param mixed                   $raw  Candidate value.
	 * @param array<string,bool>|null $base Currently stored map, if any.
	 * @return array<string,bool>
	 */
	public static function sanitize( $raw, ?array $base = null ): array {
		$base  = array_merge( self::MODULES, is_array( $base ) ? $base : array() );
		$raw   = is_array( $raw ) ? $raw : array();
		$clean = array();

		foreach ( self::MODULES as $key => $shipped ) {
			$clean[ $key ] = array_key_exists( $key, $raw )
				? (bool) rest_sanitize_boolean( $raw[ $key ] )
				: (bool) ( $base[ $key ] ?? $shipped );
		}

		return $clean;
	}

	/**
	 * Whether a module is switched on.
	 *
	 * Unknown keys answer `false`: a gate for a module that does not exist should
	 * fail closed, not run.
	 *
	 * @param string $key Module key.
	 * @return bool
	 */
	public static function is_enabled( string $key ): bool {
		if ( ! isset( self::MODULES[ $key ] ) ) {
			return false;
		}

		$stored = get_option( \ShapedPlugin\ShapedGallery\Admin\Settings::OPTION, array() );
		$map    = is_array( $stored ) && isset( $stored['modules'] ) && is_array( $stored['modules'] )
			? $stored['modules']
			: array();

		if ( ! array_key_exists( $key, $map ) ) {
			return self::MODULES[ $key ];
		}

		return (bool) rest_sanitize_boolean( $map[ $key ] );
	}
}

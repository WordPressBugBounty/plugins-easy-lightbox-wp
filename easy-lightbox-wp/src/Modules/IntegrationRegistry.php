<?php
/**
 * The page-builder integrations on/off map: which integrations exist, and which
 * ship enabled.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Modules;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns the `integrations` branch of `shaped_gallery_settings`.
 *
 * Mirrors {@see ModuleRegistry}'s shape and contract: a flat key => bool map,
 * validated as an allow-list, so a filter that lists a builder the bundle has
 * no logo for (see `BUILDERS` in `Integrations.jsx`) still cannot store a
 * switch the plugin has no code for.
 *
 * {@see \ShapedPlugin\ShapedGallery\Integrations\Integrations} is the one caller of
 * {@see is_enabled()}: it decides which builder integration boots at all, so a
 * switched-off builder costs the site nothing but the `add_action()` calls it
 * never makes.
 */
final class IntegrationRegistry {

	/**
	 * Integration key => whether the plugin ships it enabled.
	 *
	 * Mirrors `BUILDERS` in `app/admin/pages/Settings/Integrations.jsx` — the two
	 * lists are the same product decision stated for two runtimes, and a mismatch
	 * is a defect (the grid would draw a switch in the wrong position on a fresh
	 * install).
	 *
	 * @var array<string,bool>
	 */
	private const INTEGRATIONS = array(
		'elementor' => true,
		'divi'      => false,
		'wpbakery'  => false,
		'oxygen'    => false,
		'beaver'    => false,
		'bricks'    => false,
	);

	/**
	 * The complete switch map, with the values the plugin ships with.
	 *
	 * @return array<string,bool>
	 */
	public static function defaults(): array {
		return self::INTEGRATIONS;
	}

	/**
	 * Validate a submitted switch map.
	 *
	 * Allow-list: an unknown key is dropped, and a known key the caller omitted
	 * keeps `$base`'s value, so a partial write cannot silently disable an
	 * integration the sender never mentioned.
	 *
	 * @param mixed                   $raw  Candidate value.
	 * @param array<string,bool>|null $base Currently stored map, if any.
	 * @return array<string,bool>
	 */
	public static function sanitize( $raw, ?array $base = null ): array {
		$base  = array_merge( self::INTEGRATIONS, is_array( $base ) ? $base : array() );
		$raw   = is_array( $raw ) ? $raw : array();
		$clean = array();

		foreach ( self::INTEGRATIONS as $key => $shipped ) {
			$clean[ $key ] = array_key_exists( $key, $raw )
				? (bool) rest_sanitize_boolean( $raw[ $key ] )
				: (bool) ( $base[ $key ] ?? $shipped );
		}

		return $clean;
	}

	/**
	 * Whether a page-builder integration is switched on.
	 *
	 * Unknown keys answer `false`, exactly as {@see ModuleRegistry::is_enabled()} does:
	 * a gate for an integration the plugin has no code for should fail closed.
	 *
	 * Reads the raw option rather than {@see \ShapedPlugin\ShapedGallery\Admin\Settings::get()}
	 * for the reason `ModuleRegistry` does — resolving one boolean should not run every
	 * module's sanitizer — and re-coerces through `rest_sanitize_boolean()` so a row
	 * written by WP-CLI holding the STRING `'false'` reads as off rather than as a
	 * non-empty (therefore truthy) value.
	 *
	 * @param string $key Integration key.
	 * @return bool
	 */
	public static function is_enabled( string $key ): bool {
		if ( ! isset( self::INTEGRATIONS[ $key ] ) ) {
			return false;
		}

		$stored = get_option( \ShapedPlugin\ShapedGallery\Admin\Settings::OPTION, array() );
		$map    = is_array( $stored ) && isset( $stored['integrations'] ) && is_array( $stored['integrations'] )
			? $stored['integrations']
			: array();

		if ( ! array_key_exists( $key, $map ) ) {
			return self::INTEGRATIONS[ $key ];
		}

		return (bool) rest_sanitize_boolean( $map[ $key ] );
	}

	/**
	 * Every integration key the plugin ships code for.
	 *
	 * @return array<int,string>
	 */
	public static function keys(): array {
		return array_keys( self::INTEGRATIONS );
	}
}

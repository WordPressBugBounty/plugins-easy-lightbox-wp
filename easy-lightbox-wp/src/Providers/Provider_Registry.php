<?php
/**
 * Media provider registry.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Providers;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Static registry of media providers.
 *
 * Mirrors the prototype's `this.brands` object. The picker's Connect & Import
 * rail is rendered from all() (REST), so future providers appear automatically
 * — registering a new provider is one register() call and a new class.
 */
class Provider_Registry {

	/**
	 * Registered providers keyed by id.
	 *
	 * @var array<string,Abstract_Media_Provider>
	 */
	private static $providers = array();

	/**
	 * Register (or replace) a provider.
	 *
	 * @param Abstract_Media_Provider $provider Provider instance.
	 * @return void
	 */
	public static function register( Abstract_Media_Provider $provider ): void {
		self::$providers[ $provider->get_id() ] = $provider;
	}

	/**
	 * Get a provider by id.
	 *
	 * @param string $id Provider id.
	 * @return Abstract_Media_Provider|null
	 */
	public static function get( string $id ): ?Abstract_Media_Provider {
		return self::$providers[ $id ] ?? null;
	}

	/**
	 * All registered providers.
	 *
	 * @return array<string,Abstract_Media_Provider>
	 */
	public static function all(): array {
		return self::$providers;
	}

	/**
	 * Only providers that are currently usable.
	 *
	 * @return array<string,Abstract_Media_Provider>
	 */
	public static function available(): array {
		return array_filter(
			self::$providers,
			static function ( Abstract_Media_Provider $p ) {
				return $p->is_available();
			}
		);
	}

	/**
	 * Serialize every provider's public metadata for the REST catalog.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function catalog(): array {
		return array_values(
			array_map(
				static function ( Abstract_Media_Provider $p ) {
					return $p->to_array();
				},
				self::$providers
			)
		);
	}
}

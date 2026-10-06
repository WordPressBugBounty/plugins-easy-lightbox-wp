<?php
/**
 * The Lightbox module: its global option shape, its sanitizer, and the projection
 * of it the frontend runtime consumes.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Modules;

use ShapedPlugin\ShapedGallery\Admin\Settings;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns the `lightbox` branch of `shaped_gallery_settings`.
 *
 * ## Where a lightbox option lives, and why
 *
 * The feature has two UIs — the block's Image Click Action panel (per gallery) and
 * this module's panel (site-wide) — and the split between them is NOT arbitrary:
 *
 * - **The block owns the TRIGGER.** Whether a tile click opens the viewer at all is
 *   a property of that gallery — the `clickAction` attribute.
 * - **This module owns the VIEWER.** The overlay is a single, page-level object
 *   shared by every gallery on the page, so storing its settings per gallery would
 *   let two galleries on one page disagree about an element only one of which can
 *   exist.
 *
 * The module's two options are viewer state and reach the browser once, through
 * {@see frontend_config()} on the `shaped_gallery_frontend` payload. The block stores
 * nothing about the lightbox beyond `clickAction`.
 *
 * Pure static — a data model, like {@see Settings} itself. No hooks.
 */
final class Lightbox {

	/**
	 * The module's key in {@see ModuleRegistry} and in the settings option.
	 *
	 * @var string
	 */
	public const KEY = 'lightbox';

	/**
	 * The complete option shape, with the values the module ships with.
	 *
	 * Mirrors `LIGHTBOX_DEFAULTS` in
	 * `app/admin/pages/Settings/modulePanels/LightboxOptions.jsx` — the panel opens
	 * on these, and the server must agree or the first Save would appear to change
	 * settings the user never touched.
	 *
	 * @return array<string,mixed>
	 */
	public static function defaults(): array {
		return array(
			'closeOnOutsideClick' => true,
			'itemCounter'         => true,
		);
	}

	/**
	 * The stored module settings, merged over the defaults so every key is present.
	 *
	 * @return array<string,mixed>
	 */
	public static function get(): array {
		$stored = get_option( Settings::OPTION, array() );
		$raw    = is_array( $stored ) && isset( $stored[ self::KEY ] ) ? $stored[ self::KEY ] : array();

		return self::sanitize( $raw );
	}

	/**
	 * Whether the module is switched on in Settings → Modules.
	 *
	 * @return bool
	 */
	public static function is_enabled(): bool {
		return ModuleRegistry::is_enabled( self::KEY );
	}

	/**
	 * Validate and coerce a submitted (or stored) module settings array.
	 *
	 * Allow-list, like {@see Settings::sanitize()}: every key the module owns is
	 * rebuilt from `$base` (or the shipped default), so an unknown property is
	 * dropped and a partial write cannot reset a sibling row.
	 *
	 * @param mixed                    $raw  Candidate value.
	 * @param array<string,mixed>|null $base Currently stored settings, if any.
	 * @return array<string,mixed>
	 */
	public static function sanitize( $raw, ?array $base = null ): array {
		$defaults = self::defaults();
		$base     = array_merge( $defaults, is_array( $base ) ? $base : array() );
		$raw      = is_array( $raw ) ? $raw : array();

		/**
		 * Pick the submitted value, falling back to what is already stored.
		 *
		 * @param string $key Option key.
		 * @return mixed
		 */
		$pick = static function ( string $key ) use ( $raw, $base ) {
			return array_key_exists( $key, $raw ) ? $raw[ $key ] : $base[ $key ];
		};

		return array(
			'closeOnOutsideClick' => (bool) rest_sanitize_boolean( $pick( 'closeOnOutsideClick' ) ),
			'itemCounter'         => (bool) rest_sanitize_boolean( $pick( 'itemCounter' ) ),
		);
	}

	/**
	 * The viewer configuration the frontend runtime needs, and nothing else.
	 *
	 * Emitted ONCE per page on `shaped_gallery_frontend` rather than per gallery: the
	 * overlay is a page-level singleton built once by `app/frontend/lightbox.js`,
	 * so per-container data-* would be N copies of one answer.
	 *
	 * `enabled` is the module switch. When it is false the runtime never binds, and
	 * the renderer never marks a gallery as lightbox-clickable — the anchor stays a
	 * plain link to the full-size file, which is the graceful no-JS behaviour the
	 * markup already has.
	 *
	 * @return array<string,mixed>
	 */
	public static function frontend_config(): array {
		$settings = self::get();

		return array(
			'enabled'      => self::is_enabled(),
			'closeOutside' => $settings['closeOnOutsideClick'],
			'counter'      => $settings['itemCounter'],
		);
	}
}

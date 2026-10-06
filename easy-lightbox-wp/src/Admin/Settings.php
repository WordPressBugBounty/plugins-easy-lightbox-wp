<?php
/**
 * The plugin's settings option: its shape, its defaults and its sanitizer.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Admin;

use ShapedPlugin\ShapedGallery\Modules\IntegrationRegistry;
use ShapedPlugin\ShapedGallery\Modules\Lightbox;
use ShapedPlugin\ShapedGallery\Modules\ModuleRegistry;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns `shaped_gallery_settings`.
 *
 * Separate from {@see Admin}, which registers it: Admin wires hooks, this decides
 * what a valid settings array is. Pure static — a data model, no hooks of its own.
 *
 * Every key the Settings screen can write is declared here, and `sanitize()` is an
 * ALLOW-LIST: a key it does not know is dropped rather than stored, so a stray
 * property in a POST body cannot accumulate in the option.
 */
class Settings {

	/**
	 * Option name.
	 *
	 * @var string
	 */
	const OPTION = 'shaped_gallery_settings';

	/**
	 * Bounds for the cache timeout, in hours.
	 *
	 * @var int
	 */
	const TIMEOUT_MIN = 1;

	/**
	 * Upper bound: 30 days.
	 *
	 * @var int
	 */
	const TIMEOUT_MAX = 720;

	/**
	 * Shipped default: one day, which is also the lifetime the plugin's cache
	 * entries had before the setting was wired to them.
	 *
	 * @var int
	 */
	const TIMEOUT_DEFAULT = 24;

	/**
	 * The complete settings shape, with the values the plugin ships with.
	 *
	 * @return array<string,mixed>
	 */
	public static function defaults(): array {
		return array(
			// Advanced Controls.
			//
			// `cleanupOnDeletion` is read by `uninstall.php` and by nothing else — it
			// changes no runtime behaviour, it only tells the uninstaller whether it
			// is allowed to act. It ships FALSE so a site that deletes the plugin
			// without ever visiting this screen keeps its galleries: the destructive
			// reading of "the user removed the plugin" has to be opted into, never
			// inferred.
			'cleanupOnDeletion' => false,
			'cacheTimeout'      => self::TIMEOUT_DEFAULT,
			'browserCaching'    => true,
			'debugPerformance'  => false,
			'retinaImages'      => true,
			// Modules — the grid's on/off switches, and each module panel's own
			// options. All are nested branches rather than flattened keys so a
			// module owns one key here and one sanitizer of its own (§3).
			'modules'           => ModuleRegistry::defaults(),
			// Integrations — the page-builder grid's on/off switches. Same
			// flat-map shape and contract as `modules`, own registry.
			'integrations'      => IntegrationRegistry::defaults(),
			'lightbox'          => Lightbox::defaults(),
		);
	}

	/**
	 * The shipped defaults for the keys the Settings SCREEN owns.
	 *
	 * What "Reset to Default" restores, and why it is derived rather than listed: every
	 * scalar key in {@see self::defaults()} belongs to the Advanced Controls panel on
	 * that screen, while every nested key is a module's own branch edited in its own
	 * drawer. Filtering on `is_scalar` therefore describes the boundary
	 * exactly, and — unlike a hand-written list — a key added to either side lands on the
	 * right side of it automatically.
	 *
	 * The screen needs this from the server rather than the mirror in
	 * `app/admin/pages/Settings/useSettings.js`: that mirror exists to keep controls
	 * mounted before the first save, and treating it as authoritative would mean a
	 * default changed here silently kept restoring the old value.
	 *
	 * @return array<string,scalar>
	 */
	public static function screen_defaults(): array {
		return array_filter( self::defaults(), 'is_scalar' );
	}

	/**
	 * The stored settings, merged over the defaults so every key is always present.
	 *
	 * @return array<string,mixed>
	 */
	public static function get(): array {
		$stored = get_option( self::OPTION, array() );

		return self::sanitize( is_array( $stored ) ? $stored : array(), false );
	}

	/**
	 * Validate and coerce a settings array.
	 *
	 * Merged over the CURRENT stored values rather than the defaults, so a partial
	 * write (a panel sending only its own keys) cannot silently reset the rest.
	 *
	 * That merge is a read-modify-write, so a user-initiated call takes
	 * {@see SettingsLock} first and holds it until the row has been written: without
	 * it, two concurrent saves both read the pre-write option and the later one
	 * reverts the earlier, with both answering 200. The lock fails open — see that
	 * class — so this method behaves exactly as before wherever it cannot be taken.
	 *
	 * @param mixed $value      Raw value, typically a REST request body.
	 * @param bool  $is_request Whether this is a user-initiated write. Reads skip the
	 *                          capability gate so a stored value is never dropped when
	 *                          it is merely being displayed.
	 * @return array<string,mixed>
	 */
	public static function sanitize( $value, bool $is_request = true ): array {
		$defaults = self::defaults();

		if ( $is_request ) {
			// Held from here until the row is written; released on
			// `update_option_shaped_gallery_settings` and, for the paths that never
			// reach it, on `shutdown` ({@see Admin::hooks()}).
			SettingsLock::acquire();

			$stored = get_option( self::OPTION, array() );
			$base   = array_merge( $defaults, is_array( $stored ) ? $stored : array() );
		} else {
			$base = $defaults;
		}

		if ( ! is_array( $value ) ) {
			return array_intersect_key( $base, $defaults );
		}

		$clean = array();
		foreach ( $defaults as $key => $default ) {
			$raw = array_key_exists( $key, $value ) ? $value[ $key ] : ( $base[ $key ] ?? $default );

			switch ( $key ) {
				case 'cacheTimeout':
					$clean[ $key ] = self::clamp_timeout( $raw );
					break;

				case 'cleanupOnDeletion':
					$clean[ $key ] = self::is_affirmative( $raw );
					break;

				/*
				 * Delegated: each module decides what a valid value of its own branch
				 * is. Every one of these sanitizers takes the stored branch as its
				 * base for the same reason this method does — the Modules grid, each
				 * module drawer and the Advanced panel each POST only their own keys,
				 * so a partial write must never reset a sibling.
				 */
				case 'modules':
					$clean[ $key ] = ModuleRegistry::sanitize( $raw, is_array( $base[ $key ] ?? null ) ? $base[ $key ] : null );
					break;

				case 'integrations':
					$clean[ $key ] = IntegrationRegistry::sanitize( $raw, is_array( $base[ $key ] ?? null ) ? $base[ $key ] : null );
					break;

				case 'lightbox':
					$clean[ $key ] = Lightbox::sanitize( $raw, is_array( $base[ $key ] ?? null ) ? $base[ $key ] : null );
					break;

				default:
					$clean[ $key ] = (bool) rest_sanitize_boolean( $raw );
					break;
			}
		}

		return $clean;
	}

	/**
	 * Whether a raw value is an explicit YES.
	 *
	 * `rest_sanitize_boolean()` — what every other switch on this screen uses — treats
	 * any string it does not recognise as true, so `'yes please'`, `'off?'` and a
	 * stray `'null'` all come back armed. For a display toggle that is a shrug; for
	 * `cleanupOnDeletion` it is the difference between keeping a site's galleries and
	 * destroying them, and the value is read at a moment when nobody is watching and
	 * nothing can be undone.
	 *
	 * So this key alone is an allow-list, and it fails CLOSED in the direction that
	 * keeps data: only a value that unmistakably says yes says yes. The checkbox sends
	 * a JSON `true`, so nothing legitimate is turned away — what this refuses is a row
	 * written by WP-CLI, a migration, or another plugin that never meant to arm it.
	 *
	 * @param mixed $raw Candidate value.
	 * @return bool
	 */
	private static function is_affirmative( $raw ): bool {
		if ( is_bool( $raw ) ) {
			return $raw;
		}

		if ( is_int( $raw ) || is_float( $raw ) ) {
			return 1 === (int) $raw;
		}

		if ( ! is_string( $raw ) ) {
			// An array, an object, null: not an answer to a yes/no question.
			return false;
		}

		return in_array( strtolower( trim( $raw ) ), array( '1', 'true', 'on', 'yes' ), true );
	}

	/**
	 * The cache timeout as a whole number of hours inside its bounds.
	 *
	 * Cast, not absint(): absint( -3 ) is 3, which would silently turn a nonsense
	 * value into a plausible one three hours long. A negative is not a small
	 * timeout, it is invalid, so it falls to the minimum like any other junk.
	 *
	 * Public because the cache that consumes the setting must coerce a stored value
	 * through the SAME bounds the screen enforces — a row written by WP-CLI or by
	 * another plugin never passed through `sanitize()`, and re-spelling the bounds at
	 * the read site is how the two eventually disagree.
	 *
	 * @param mixed $raw Candidate value.
	 * @return int
	 */
	public static function clamp_timeout( $raw ): int {
		$hours = (int) $raw;

		if ( $hours < self::TIMEOUT_MIN ) {
			return self::TIMEOUT_MIN;
		}

		return min( $hours, self::TIMEOUT_MAX );
	}
}

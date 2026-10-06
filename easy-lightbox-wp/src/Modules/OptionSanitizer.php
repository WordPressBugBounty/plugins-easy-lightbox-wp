<?php
/**
 * The value coercions every module sanitizer repeats.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Modules;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Shared value-level sanitizers for a module's settings branch.
 *
 * Every module owns its own branch of `shaped_gallery_settings` and its own allow-list
 * ({@see Lightbox}), but the coercions underneath are
 * the same four or five each time: pick an enum or fall back, clamp a number, keep an
 * "auto" field genuinely empty, reduce a picked attachment to id + URL. Those live
 * here so a third module adds a CALL, not another copy — the same reason
 * `Render\Css\CssHelpers` owns the var-set builders (§6.3).
 *
 * Two decisions are baked in deliberately:
 *
 * - **A number is cast, never `absint()`ed.** `absint( -10 )` is 10, which turns a
 *   nonsense value into a plausible one; a negative is out of range, so it clamps to
 *   the minimum like any other out-of-range number.
 * - **Non-numeric junk falls back to the shipped default rather than to the minimum**,
 *   because there is nothing in it to clamp.
 *
 * Pure static — a value layer, no hooks and no state.
 */
final class OptionSanitizer {

	/**
	 * Return `$value` when it is in the allow-list, else `$fallback`.
	 *
	 * @param mixed            $value    Candidate value.
	 * @param array<int,mixed> $allowed  Allow-list.
	 * @param mixed            $fallback Value to fall back to.
	 * @return mixed
	 */
	public static function enum( $value, array $allowed, $fallback ) {
		return in_array( $value, $allowed, true ) ? $value : $fallback;
	}

	/**
	 * A required whole number inside its bounds.
	 *
	 * @param mixed $value    Candidate value.
	 * @param int   $min      Lower bound.
	 * @param int   $max      Upper bound.
	 * @param int   $fallback Shipped value, used when there is no number at all.
	 * @return int
	 */
	public static function integer( $value, int $min, int $max, int $fallback ): int {
		if ( ! is_numeric( $value ) ) {
			return $fallback;
		}

		return max( $min, min( (int) $value, $max ) );
	}

	/**
	 * A number that is allowed to be unset.
	 *
	 * An empty field is the design's "Auto" placeholder — an absent value, not a
	 * zero — so it is stored as `''` and left for the consumer to interpret. Anything
	 * numeric clamps; anything else falls back.
	 *
	 * @param mixed      $value    Candidate value.
	 * @param int        $min      Lower bound.
	 * @param int        $max      Upper bound.
	 * @param int|string $fallback Shipped value, used for non-numeric junk.
	 * @return int|string
	 */
	public static function optional_integer( $value, int $min, int $max, $fallback ) {
		if ( '' === $value || null === $value ) {
			return '';
		}

		if ( ! is_numeric( $value ) ) {
			return $fallback;
		}

		return max( $min, min( (int) $value, $max ) );
	}

	/**
	 * A boolean, with core's REST semantics ("0" and "false" are false).
	 *
	 * @param mixed $value Candidate value.
	 * @return bool
	 */
	public static function boolean( $value ): bool {
		return (bool) rest_sanitize_boolean( $value );
	}

	/**
	 * A single-line string.
	 *
	 * @param mixed $value Candidate value.
	 * @return string
	 */
	public static function text( $value ): string {
		return trim( sanitize_text_field( (string) $value ) );
	}

	/**
	 * A hex colour, `#rgb` or `#rrggbb` — never empty.
	 *
	 * Delegates to core's own `sanitize_hex_color()` rather than a hand-rolled regex —
	 * one canonical definition of "valid hex colour" for the whole install. Unlike
	 * {@see optional_integer()} there is no "Auto" reading of a blank field here (the
	 * design always draws a filled swatch), so a cleared or otherwise unparsable value
	 * falls back to the shipped default rather than being stored as a hole a future
	 * consumer would have to guess a colour for.
	 *
	 * @param mixed  $value    Candidate value.
	 * @param string $fallback Shipped value, used for anything core's sanitizer rejects.
	 * @return string
	 */
	public static function color( $value, string $fallback ): string {
		// Core's own sanitizer answers '' for an empty INPUT (a legitimate "inherit"
		// for the attributes it was written for) — not a match this class wants, since
		// nothing here treats a blank swatch as its own state.
		$clean = '' === $value ? null : sanitize_hex_color( (string) $value );

		return null === $clean ? $fallback : $clean;
	}

	/**
	 * A media item picked in the dashboard, reduced to what the plugin stores.
	 *
	 * The media frame hands back a whole attachment object; only the id, the URL and
	 * (where a panel shows a chip) the file name are ever read, so the rest is
	 * dropped instead of accumulating in the option. The URL goes through
	 * `esc_url_raw()` here rather than at render time because it is stored: a
	 * `javascript:` value must never reach the option in the first place.
	 *
	 * @param mixed $value         Candidate value.
	 * @param bool  $with_filename Whether the panel stores a display file name too.
	 * @return array<string,mixed>
	 */
	public static function media( $value, bool $with_filename = false ): array {
		$value = is_array( $value ) ? $value : array();

		$clean = array(
			'id'  => isset( $value['id'] ) ? absint( $value['id'] ) : 0,
			'url' => isset( $value['url'] ) ? esc_url_raw( (string) $value['url'] ) : '',
		);

		if ( $with_filename ) {
			$clean['filename'] = isset( $value['filename'] ) ? self::text( $value['filename'] ) : '';
		}

		return $clean;
	}

	/**
	 * A submitted list of keys, reduced to the allow-listed ones.
	 *
	 * The SUBMITTED order is kept — a token field is a list the user arranged, and
	 * re-sorting it into declaration order would silently undo that — and duplicates
	 * are collapsed. An empty result is legitimate: removing every token is a choice.
	 *
	 * @param mixed             $value   Candidate value.
	 * @param array<int,string> $allowed Allow-list.
	 * @return array<int,string>
	 */
	public static function keys( $value, array $allowed ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$clean = array();
		foreach ( $value as $candidate ) {
			if ( ! is_string( $candidate ) ) {
				continue;
			}

			$key = sanitize_key( $candidate );
			// sanitize_key() lowercases, so a camelCase id ("shutterSpeed") would not
			// survive it; the allow-list is the real gate and the raw string is only
			// accepted when it matches one exactly.
			if ( in_array( $candidate, $allowed, true ) ) {
				$key = $candidate;
			} elseif ( ! in_array( $key, $allowed, true ) ) {
				continue;
			}

			if ( ! in_array( $key, $clean, true ) ) {
				$clean[] = $key;
			}
		}

		return $clean;
	}
}

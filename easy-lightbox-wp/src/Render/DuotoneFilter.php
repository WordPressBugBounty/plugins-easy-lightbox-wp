<?php
/**
 * Duotone SVG filter builder.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Turns a per-item duotone value (a custom hex-color list or a theme preset
 * reference, exactly as the native core/image duotone control stores it under
 * `style.color.duotone`) into the hidden `<svg><filter>` markup + a stable id,
 * mirroring WordPress core's own duotone pipeline so an SSR gallery matches the
 * editor. The renderer applies `filter: url(#id)` to the item's <img>.
 */
class DuotoneFilter {

	/**
	 * Resolve a stored duotone value into a flat list of hex colors.
	 *
	 * Accepts a custom color array (`['#1a1a1a', '#ffffff', …]`) or a preset
	 * reference (`var:preset|duotone|<slug>`) resolved against global settings.
	 * `unset`, empty, or unresolvable values yield an empty list (no filter).
	 *
	 * @param mixed $value Stored duotone value.
	 * @return array<int,string> Sanitized hex colors.
	 */
	public static function resolve_colors( $value ): array {
		if ( is_array( $value ) ) {
			return array_values( array_filter( array_map( array( __CLASS__, 'sanitize_color' ), $value ) ) );
		}

		if ( is_string( $value ) && '' !== $value && 'unset' !== $value ) {
			if ( preg_match( '/^var:preset\|duotone\|(.+)$/', $value, $m ) ) {
				return self::preset_colors( $m[1] );
			}
		}

		return array();
	}

	/**
	 * Stable, collision-resistant filter id for a color set.
	 *
	 * @param array<int,string> $colors Hex colors.
	 * @return string
	 */
	public static function id( array $colors ): string {
		return 'sp-shaped-gallery-duotone-' . substr( md5( implode( '-', $colors ) ), 0, 10 );
	}

	/**
	 * Build the hidden inline SVG filter for a color set (>= 2 colors).
	 *
	 * Grayscale via a luminance matrix, then map shadows→highlights through the
	 * palette with a component transfer — the same construction core uses.
	 *
	 * @param array<int,string> $colors Hex colors (>= 2).
	 * @param string            $id     Filter id (see id()).
	 * @return string SVG markup, or '' when fewer than two colors.
	 */
	public static function svg( array $colors, string $id ): string {
		if ( count( $colors ) < 2 ) {
			return '';
		}

		$r = array();
		$g = array();
		$b = array();
		$a = array();
		foreach ( $colors as $hex ) {
			list( $cr, $cg, $cb, $ca ) = self::hex_to_rgba( $hex );
			$r[] = $cr;
			$g[] = $cg;
			$b[] = $cb;
			$a[] = $ca;
		}

		return sprintf(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 0" width="0" height="0" focusable="false" role="none" aria-hidden="true" style="visibility:hidden;position:absolute;left:-9999px;overflow:hidden">'
				. '<defs><filter id="%1$s"><feColorMatrix color-interpolation-filters="sRGB" type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0"/>'
				. '<feComponentTransfer color-interpolation-filters="sRGB">'
				. '<feFuncR type="table" tableValues="%2$s"/>'
				. '<feFuncG type="table" tableValues="%3$s"/>'
				. '<feFuncB type="table" tableValues="%4$s"/>'
				. '<feFuncA type="table" tableValues="%5$s"/>'
				. '</feComponentTransfer></filter></defs></svg>',
			esc_attr( $id ),
			esc_attr( self::table_values( $r ) ),
			esc_attr( self::table_values( $g ) ),
			esc_attr( self::table_values( $b ) ),
			esc_attr( self::table_values( $a ) )
		);
	}

	/**
	 * Resolve a duotone preset slug to its colors via global (theme.json) settings.
	 *
	 * @param string $slug Preset slug.
	 * @return array<int,string> Hex colors.
	 */
	private static function preset_colors( string $slug ): array {
		if ( ! function_exists( 'wp_get_global_settings' ) ) {
			return array();
		}

		$settings = wp_get_global_settings( array( 'color', 'duotone' ) );
		if ( ! is_array( $settings ) ) {
			return array();
		}

		// Settings may arrive grouped by origin (default/theme/custom) or flat.
		$palettes = array();
		foreach ( array( 'default', 'theme', 'custom' ) as $origin ) {
			if ( isset( $settings[ $origin ] ) && is_array( $settings[ $origin ] ) ) {
				$palettes = array_merge( $palettes, $settings[ $origin ] );
			}
		}
		if ( empty( $palettes ) ) {
			$palettes = $settings;
		}

		foreach ( $palettes as $preset ) {
			if ( is_array( $preset ) && isset( $preset['slug'] ) && $preset['slug'] === $slug && ! empty( $preset['colors'] ) ) {
				return array_values( array_filter( array_map( array( __CLASS__, 'sanitize_color' ), $preset['colors'] ) ) );
			}
		}

		return array();
	}

	/**
	 * Validate a hex color string (#RGB, #RGBA, #RRGGBB, #RRGGBBAA).
	 *
	 * @param mixed $color Candidate.
	 * @return string The color, or '' when invalid.
	 */
	private static function sanitize_color( $color ): string {
		if ( ! is_string( $color ) ) {
			return '';
		}
		$color = trim( $color );
		return preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $color ) ? $color : '';
	}

	/**
	 * Convert a hex color to normalized [r, g, b, a] in the 0..1 range.
	 *
	 * @param string $hex Hex color (already validated).
	 * @return array{0:float,1:float,2:float,3:float}
	 */
	private static function hex_to_rgba( string $hex ): array {
		$hex = ltrim( $hex, '#' );

		// Expand shorthand (#RGB / #RGBA) to full length.
		if ( 3 === strlen( $hex ) || 4 === strlen( $hex ) ) {
			$expanded = '';
			foreach ( str_split( $hex ) as $char ) {
				$expanded .= $char . $char;
			}
			$hex = $expanded;
		}

		$r = hexdec( substr( $hex, 0, 2 ) ) / 255;
		$g = hexdec( substr( $hex, 2, 2 ) ) / 255;
		$b = hexdec( substr( $hex, 4, 2 ) ) / 255;
		$a = 8 === strlen( $hex ) ? hexdec( substr( $hex, 6, 2 ) ) / 255 : 1.0;

		return array( $r, $g, $b, $a );
	}

	/**
	 * Format a channel's stops as a compact space-separated tableValues string.
	 *
	 * @param array<int,float> $values Channel stops (0..1).
	 * @return string
	 */
	private static function table_values( array $values ): string {
		return implode(
			' ',
			array_map(
				static function ( $v ) {
					// Trim trailing zeros so "1.00000" -> "1", "0.50000" -> "0.5".
					return rtrim( rtrim( sprintf( '%.5f', $v ), '0' ), '.' );
				},
				$values
			)
		);
	}
}

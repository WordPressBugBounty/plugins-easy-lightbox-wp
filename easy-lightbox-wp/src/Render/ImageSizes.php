<?php
/**
 * Responsive `sizes` hint builder.
 *
 * `srcset` alone is not enough: without a `sizes` attribute the browser assumes
 * each image renders at `100vw` and downloads the largest candidate, which makes
 * a multi-column gallery *slower* than a single fixed `src`. A provider can only
 * describe the image (`wp_get_attachment_image_sizes()` guesses from the image's
 * own width); how wide it actually renders is a property of the LAYOUT, so that
 * part is derived here from the gallery's own column geometry.
 *
 * Kept out of {@see LayoutRenderer} (which only assembles markup) and out of
 * {@see \ShapedPlugin\ShapedGallery\Render\Css\StyleEngine} (this is an HTML
 * attribute, not CSS) — one job, one file, directly testable.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Builds the `sizes` attribute for a gallery's images.
 */
final class ImageSizes {

	/**
	 * Layouts whose tile width IS the track width — one column of `--sp-shaped-gallery-cols`
	 * — so `100vw / columns` is a safe hint.
	 *
	 * Deliberately excludes the layouts where that would UNDER-state the rendered
	 * width, which is the one direction that actually hurts: a too-small hint makes
	 * the browser pick a too-small candidate and the image renders blurry. Justified
	 * sizes rows by height (a single tile can be nearly full-width), so it keeps the
	 * provider's own hint.
	 *
	 * @var string[]
	 */
	private const COLUMN_LAYOUTS = array( 'grid', 'masonry' );

	/**
	 * Device => breakpoint max-width (px), narrowest first, mirroring the
	 * `max-width` queries in style.scss. Desktop is the unconditional last entry.
	 *
	 * @var array<string,int>
	 */
	private const BREAKPOINTS = array(
		'mobile' => 600,
		'tablet' => 1024,
	);

	/**
	 * Build the `sizes` attribute value for this gallery.
	 *
	 * @param array<string,mixed> $attrs    Normalized block attributes.
	 * @param string              $fallback The provider's own hint (used for the
	 *                                      layouts this cannot improve on).
	 * @return string `sizes` value, or '' to omit the attribute.
	 */
	public static function attr( array $attrs, string $fallback = '' ): string {
		$sizes = $fallback;

		if ( in_array( $attrs['layout'] ?? '', self::COLUMN_LAYOUTS, true ) ) {
			$columns = (array) ( $attrs['columns'] ?? array() );
			$parts   = array();
			foreach ( self::BREAKPOINTS as $device => $max ) {
				$parts[] = sprintf( '(max-width: %dpx) %dvw', $max, self::track_vw( $columns, $device ) );
			}
			$parts[] = sprintf( '%dvw', self::track_vw( $columns, 'desktop' ) );
			$sizes   = implode( ', ', $parts );
		}

		/**
		 * Filter the gallery images' `sizes` attribute.
		 *
		 * The default covers the column-driven layouts and falls back to the
		 * provider's hint elsewhere. Return '' to omit the attribute entirely.
		 *
		 * @since 1.0.0
		 *
		 * @param string              $sizes The computed `sizes` value.
		 * @param array<string,mixed> $attrs Normalized block attributes.
		 */
		return (string) apply_filters( 'shaped_gallery_image_sizes', $sizes, $attrs );
	}

	/**
	 * One track's width as whole viewport-width units, rounded UP so the hint never
	 * under-states the rendered size (gaps and container padding only make the real
	 * tile narrower).
	 *
	 * @param array<string,mixed> $columns Responsive column bundle.
	 * @param string              $device  desktop|tablet|mobile.
	 * @return int Viewport-width percentage (1-100).
	 */
	private static function track_vw( array $columns, string $device ): int {
		$count = (int) ( $columns[ $device ] ?? ( $columns['desktop'] ?? 1 ) );
		// Mirrors the 1-8 clamp GalleryOptions applies to `columns`.
		$count = max( 1, min( 8, $count ) );
		return (int) ceil( 100 / $count );
	}
}

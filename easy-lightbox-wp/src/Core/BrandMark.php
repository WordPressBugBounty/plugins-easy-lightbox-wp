<?php
/**
 * The brand mark, for every server-side surface that shows it.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Core;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * The one PHP-side owner of the ShapedGallery mark (§18).
 *
 * The artwork is `ShapedMarkMono` from `app/icons/index.js`, shipped once as
 * `assets/brand/shaped-mark.svg` and painted with `currentColor`. PHP cannot import
 * the JSX module, so that file is the only second copy there is, and
 * `verify-integrations.php` asserts its outline and dot are `MARK_PATH`/`MARK_DOT`
 * byte for byte. Every consumer reads the file through here — the admin menu icon
 * and all six page-builder panels — rather than holding its own tracing. Before
 * this, the menu carried a literal copy of the path and the builders shipped the
 * retired four-pane grid tile under the name `gallery.svg`.
 *
 * Builders take the mark in three shapes, and each has one method:
 *
 *  - a URL (WPBakery, Oxygen draw it as an `<img>`)         → {@see self::url()}
 *  - a file path or its markup (Divi, Beaver inline it)     → {@see self::path()} / {@see self::svg()}
 *  - a CSS class on an `<i>` (Elementor, Bricks: icon fonts) → {@see self::ICON_CLASS}
 *    plus {@see self::enqueue_icon_style()}
 */
final class BrandMark {

	/**
	 * The shipped mark, relative to the plugin root.
	 *
	 * @var string
	 */
	const FILE = 'assets/brand/shaped-mark.svg';

	/**
	 * Class that paints the mark on an icon-font builder's `<i>` element.
	 *
	 * @var string
	 */
	const ICON_CLASS = 'sp-shaped-gallery-builder-icon';

	/**
	 * Style handle carrying {@see self::icon_css()}. Registered without a source —
	 * the rule is a few lines, and a file for it would be a request on every
	 * builder screen.
	 *
	 * @var string
	 */
	const ICON_STYLE_HANDLE = 'shaped-gallery-builder-icon';

	/**
	 * Memoized file contents.
	 *
	 * @var string|null
	 */
	private static ?string $svg = null;

	/**
	 * Absolute path to the mark.
	 *
	 * @return string
	 */
	public static function path(): string {
		return SHAPED_GALLERY_PATH . self::FILE;
	}

	/**
	 * Public URL of the mark.
	 *
	 * @return string
	 */
	public static function url(): string {
		return SHAPED_GALLERY_URL . self::FILE;
	}

	/**
	 * The mark's markup, painted with `currentColor`.
	 *
	 * Empty when the file is missing or unreadable, so a consumer degrades to "no
	 * icon" rather than a warning on a builder screen.
	 *
	 * @return string
	 */
	public static function svg(): string {
		if ( null === self::$svg ) {
			$file = self::path();

			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a bundled asset; WP_Filesystem needs admin credentials.
			self::$svg = is_readable( $file ) ? trim( (string) file_get_contents( $file ) ) : '';
		}

		return self::$svg;
	}

	/**
	 * The mark as a base64 data URI, painted in one fixed colour.
	 *
	 * For contexts that load the SVG as an image, where `currentColor` has no
	 * element colour to inherit and would fall back to black.
	 *
	 * @param string $fill A CSS colour.
	 * @return string Empty when the mark is unavailable.
	 */
	public static function data_uri( string $fill ): string {
		$svg = self::svg();

		if ( '' === $svg ) {
			return '';
		}

		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- encoding a bundled SVG into a data URI, not obfuscation.
		return 'data:image/svg+xml;base64,' . base64_encode( str_replace( 'currentColor', $fill, $svg ) );
	}

	/**
	 * The rule that paints the mark on {@see self::ICON_CLASS}.
	 *
	 * A mask, not a background image, so the glyph takes the builder's own icon
	 * `color` — hover, active and dark-theme states included — exactly as the icon
	 * font glyphs beside it do. The mask reads alpha only, so the data URI's fill
	 * colour is irrelevant. `1em` square because icon fonts size by `font-size`.
	 *
	 * @return string
	 */
	public static function icon_css(): string {
		$uri = self::data_uri( '#000' );

		if ( '' === $uri ) {
			return '';
		}

		$mask = 'url("' . $uri . '") center / contain no-repeat';

		return '.' . self::ICON_CLASS . '::before{content:"";display:inline-block;width:1em;height:1em;'
			. 'background-color:currentColor;-webkit-mask:' . $mask . ';mask:' . $mask . ';vertical-align:middle}';
	}

	/**
	 * Enqueue {@see self::icon_css()} on the current screen.
	 *
	 * Called only from a builder's own editor hook, so the rule never reaches a page
	 * that has no builder panel on it (§10).
	 *
	 * @return void
	 */
	public static function enqueue_icon_style(): void {
		$css = self::icon_css();

		if ( '' === $css || wp_style_is( self::ICON_STYLE_HANDLE, 'enqueued' ) ) {
			return;
		}

		wp_register_style( self::ICON_STYLE_HANDLE, false, array(), SHAPED_GALLERY_VERSION );
		wp_enqueue_style( self::ICON_STYLE_HANDLE );
		wp_add_inline_style( self::ICON_STYLE_HANDLE, $css );
	}
}

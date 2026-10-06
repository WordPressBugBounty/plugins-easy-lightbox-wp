<?php
/**
 * Geometry style contributor — the layout-agnostic grid geometry that every
 * layout consumes: column counts, horizontal/vertical gaps and the justified
 * row height. Emitted as responsive CSS custom properties (desktop + `-t`/`-m`
 * tablet/mobile) that style.scss consumes via its media queries.
 *
 * This is the first StyleContributor and the extraction point for the CSS that
 * previously lived inline in LayoutRenderer::container_style(); its output is
 * byte-for-byte identical.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render\Css\Contributors;

use ShapedPlugin\ShapedGallery\Render\Css\StyleContributor;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Responsive grid-geometry custom properties.
 */
final class GeometryVars implements StyleContributor {

	/**
	 * Default justified target row height when the mode is "Auto".
	 *
	 * Kept in sync with the JS mirror (app/lib/style/geometry-vars.js) and the
	 * frontend runtime (shaped-layout.js DEFAULT_ROW_HEIGHT).
	 */
	private const DEFAULT_ROW_HEIGHT = 280;

	/**
	 * Grid-geometry CSS custom properties for the gallery container.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return array<string,int|string> Custom-property => value map.
	 */
	public function vars( array $attrs ): array {
		$cols = $attrs['columns'];
		$gh   = $attrs['horizontalGap'];
		$gv   = $attrs['verticalGap'];
		$unit = $gh['unit'] ?? 'px';

		return array(
			'--sp-shaped-gallery-cols'   => (int) $cols['desktop'],
			'--sp-shaped-gallery-cols-t' => (int) $cols['tablet'],
			'--sp-shaped-gallery-cols-m' => (int) $cols['mobile'],
			'--sp-shaped-gallery-gh'     => (int) $gh['desktop'] . $unit,
			'--sp-shaped-gallery-gh-t'   => (int) $gh['tablet'] . $unit,
			'--sp-shaped-gallery-gh-m'   => (int) $gh['mobile'] . $unit,
			'--sp-shaped-gallery-gv'     => (int) $gv['desktop'] . $unit,
			'--sp-shaped-gallery-gv-t'   => (int) $gv['tablet'] . $unit,
			'--sp-shaped-gallery-gv-m'   => (int) $gv['mobile'] . $unit,
			'--sp-shaped-gallery-row'    => self::effective_row_height( $attrs ) . 'px',
		);
	}

	/**
	 * Resolve the effective justified target row height.
	 *
	 * Custom → the stored `maxRowHeight`; Auto → the default (a stale custom
	 * value never leaks into an auto gallery). This single rule feeds both the
	 * `--sp-shaped-gallery-row` custom property and the container's `data-row` attribute, and
	 * is mirrored by the editor preview (useMeasuredLayout / geometry-vars.js).
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return int Row height in px.
	 */
	public static function effective_row_height( array $attrs ): int {
		return 'custom' === ( $attrs['rowHeightMode'] ?? 'auto' )
			? (int) $attrs['maxRowHeight']
			: self::DEFAULT_ROW_HEIGHT;
	}
}

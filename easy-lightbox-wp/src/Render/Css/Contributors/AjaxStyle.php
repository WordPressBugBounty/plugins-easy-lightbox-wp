<?php
/**
 * Ajax-pagination style contributor — the Load More button appearance from the
 * Ajax Pagination panel's Style tab (typography, per-state colour / background /
 * border, corner radius, inner padding and margin).
 *
 * Emitted as `--sp-shaped-gallery-ap-*` CSS custom properties consumed by `.sp-shaped-gallery__load-more`
 * (see style.scss). The pagination bar is gallery-wide (one button style), so
 * container-level custom properties fit exactly. Following the proven sibling
 * rule (mirrors ContentStyle), only `font-size`, `padding` and
 * `margin` are responsive (desktop + `-t`/`-m`); family / weight / style /
 * transform / decoration / line-height / letter-spacing / word-spacing and the
 * per-state colours emit once — the rule the shared {@see CssHelpers} var-set
 * builders implement, so this class only names its vars and their sources.
 *
 * Returns nothing unless Ajax Pagination is active for this gallery
 * (see {@see GalleryOptions::ajax_active()}), so a gallery without pagination —
 * contributes zero CSS.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render\Css\Contributors;

use ShapedPlugin\ShapedGallery\Render\Css\StyleContributor;
use ShapedPlugin\ShapedGallery\Render\Css\CssHelpers;
use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryOptions;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Ajax-pagination button custom properties.
 */
final class AjaxStyle implements StyleContributor {

	/**
	 * Var prefix for every property this contributor emits.
	 */
	private const PREFIX = '--sp-shaped-gallery-ap';

	/**
	 * Pagination-button CSS custom properties for the gallery container.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return array<string,int|string> Custom-property => value map.
	 */
	public function vars( array $attrs ): array {
		if ( ! GalleryOptions::ajax_active( $attrs ) ) {
			return array();
		}

		$ap    = (array) ( $attrs['ajaxPagination'] ?? array() );
		$style = (array) ( $ap['style'] ?? array() );

		// Button typography (font size responsive; the rest once).
		$vars = CssHelpers::typography_vars(
			self::PREFIX,
			(array) ( $style['typography'] ?? array() ),
			array(
				'fs' => (array) ( $style['fontSize'] ?? array() ),
				'lh' => (array) ( $style['lineHeight'] ?? array() ),
				'ls' => (array) ( $style['letterSpacing'] ?? array() ),
				'ws' => (array) ( $style['wordSpacing'] ?? array() ),
			)
		);

		// Per-state text colour + background + border (Normal / Hover).
		$vars += CssHelpers::button_state_vars( self::PREFIX, (array) ( $style['normal'] ?? array() ) );
		$vars += CssHelpers::button_state_vars( self::PREFIX, (array) ( $style['hover'] ?? array() ), '-hover' );

		// Button corner radius.
		$radius = CssHelpers::spacing_value( (array) ( $style['borderRadius'] ?? array() ) );
		if ( '' !== $radius ) {
			$vars[ self::PREFIX . '-radius' ] = $radius;
		}

		// Inner padding + outer margin (responsive).
		$vars += CssHelpers::spacing_vars( self::PREFIX . '-pad', (array) ( $style['padding'] ?? array() ) );
		$vars += CssHelpers::spacing_vars( self::PREFIX . '-mg', (array) ( $style['margin'] ?? array() ) );

		return $vars;
	}
}

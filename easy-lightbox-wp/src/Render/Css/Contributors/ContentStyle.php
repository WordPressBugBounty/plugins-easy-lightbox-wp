<?php
/**
 * Content style contributor — the image title / description styling from the
 * Content Settings panel (typography, colours, gap, alignment and the content
 * box: background, border, border radius, padding).
 *
 * Emitted as `--sp-shaped-gallery-ct-*` CSS custom properties consumed by `.sp-shaped-gallery__content`
 * (see style.scss). Following the proven sibling-plugin rule, only `font-size`
 * and `padding` are responsive (desktop + `-t`/`-m`); family / weight / style /
 * transform / decoration / line-height / letter-spacing / word-spacing are
 * emitted once (tablet & mobile inherit) to keep the property count sane.
 *
 * Returns nothing when neither the title nor the description is enabled, so a
 * gallery without content contributes zero CSS.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render\Css\Contributors;

use ShapedPlugin\ShapedGallery\Render\Css\StyleContributor;
use ShapedPlugin\ShapedGallery\Render\Css\CssHelpers;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Content (title / description) custom properties.
 */
final class ContentStyle implements StyleContributor {

	/**
	 * Content CSS custom properties for the gallery container.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return array<string,int|string> Custom-property => value map.
	 */
	public function vars( array $attrs ): array {
		$c = $attrs['content'] ?? array();

		if ( empty( $c['imageTitle'] ) && empty( $c['imageDescription'] ) ) {
			return array();
		}

		$vars = array();

		// Alignment → text-align.
		$vars['--sp-shaped-gallery-ct-align'] = $c['alignment'] ?? 'left';

		// Content box: background, border, radius, responsive padding.
		$bg = CssHelpers::background_value( (array) ( $c['background'] ?? array() ) );
		if ( '' !== $bg ) {
			$vars['--sp-shaped-gallery-ct-bg'] = $bg;
		}

		$border = (array) ( $c['border'] ?? array() );
		$style  = $border['style'] ?? 'none';
		if ( 'none' !== $style && '' !== $style ) {
			$vars['--sp-shaped-gallery-ct-bd-style'] = $style;
			if ( ! empty( $border['color'] ) ) {
				$vars['--sp-shaped-gallery-ct-bd-color'] = $border['color'];
			}
			$width = CssHelpers::spacing_value( (array) ( $c['borderWidth'] ?? array() ) );
			if ( '' !== $width ) {
				$vars['--sp-shaped-gallery-ct-bd-width'] = $width;
			}
		}

		$radius = CssHelpers::spacing_value( (array) ( $c['borderRadius'] ?? array() ) );
		if ( '' !== $radius ) {
			$vars['--sp-shaped-gallery-ct-radius'] = $radius;
		}

		$vars += CssHelpers::spacing_vars( '--sp-shaped-gallery-ct-pad', (array) ( $c['padding'] ?? array() ) );

		/*
		 * Title-to-description gap. The control is responsive AND offers px / em / %,
		 * so both have to travel: reading only the desktop slot with a hardcoded `px`
		 * rendered a `2em` gap as `2px` and dropped the tablet / mobile values
		 * entirely. The unit lives on the bundle (one switcher for all three slots),
		 * which is exactly the shape a unit-bearing responsive bundle uses.
		 */
		$gap      = (array) ( $c['titleToDescGap'] ?? array() );
		$gap_unit = is_string( $gap['unit'] ?? null ) && '' !== $gap['unit'] ? $gap['unit'] : 'px';
		$vars    += CssHelpers::length_vars( '--sp-shaped-gallery-ct-gap', $gap, $gap_unit );

		// Description line clamp (only when the limit unit is "lines"). Per device, for
		// the same reason as the gap — the control carries a device switcher.
		$limit = (array) ( $c['descriptionLimit'] ?? array() );
		if ( 'lines' === ( $limit['unit'] ?? '' ) ) {
			foreach ( CssHelpers::device_suffixes() as $device => $suffix ) {
				$lines = (int) ( $limit[ $device ] ?? 0 );
				if ( $lines > 0 ) {
					$vars[ '--sp-shaped-gallery-ct-desc-clamp' . $suffix ] = $lines;
				}
			}
		}

		// Title + description typography.
		$vars += $this->typography_vars( $c, 'title', 'ttl' );
		$vars += $this->typography_vars( $c, 'desc', 'desc' );

		return $vars;
	}

	/**
	 * Build the `--sp-shaped-gallery-ct-<slug>-*` typography custom properties for one text
	 * element (title or description).
	 *
	 * Maps this panel's per-element attribute keys (`titleFontSize`, `descLineHeight`,
	 * …) onto the shared {@see CssHelpers::typography_vars()} builder, so the
	 * responsive-vs-emit-once rules live in one place for every panel.
	 *
	 * @param array<string,mixed> $c      Normalized content object.
	 * @param string              $prefix Attribute key prefix ('title'|'desc').
	 * @param string              $slug   CSS-var slug ('ttl'|'desc').
	 * @return array<string,string> Custom-property => value map.
	 */
	private function typography_vars( array $c, string $prefix, string $slug ): array {
		$var = "--sp-shaped-gallery-ct-$slug";

		$vars = CssHelpers::font_vars( $var, (array) ( $c[ $prefix . 'Typography' ] ?? array() ) );

		// Text colour is not part of the typography bundle (the panel keeps it as its
		// own control). Emitted between the font face and the measured properties so
		// the declaration order — and therefore the generated CSS — is byte-identical
		// to what this contributor has always produced.
		$color = 'title' === $prefix ? ( $c['titleColor'] ?? '' ) : ( $c['descColor'] ?? '' );
		if ( '' !== $color ) {
			$vars[ "$var-color" ] = $color;
		}

		$vars += CssHelpers::font_scale_vars(
			$var,
			array(
				'fs' => (array) ( $c[ $prefix . 'FontSize' ] ?? array() ),
				'lh' => (array) ( $c[ $prefix . 'LineHeight' ] ?? array() ),
				'ls' => (array) ( $c[ $prefix . 'LetterSpacing' ] ?? array() ),
				'ws' => (array) ( $c[ $prefix . 'WordSpacing' ] ?? array() ),
			)
		);

		return $vars;
	}
}

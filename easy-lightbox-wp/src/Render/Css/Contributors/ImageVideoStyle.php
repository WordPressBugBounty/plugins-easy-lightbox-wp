<?php
/**
 * Image & Video style contributor — the per-item media styling from the Image &
 * Video Settings panel's Style tab (border, corner radius, box shadow — each in
 * a Normal and a Hover state), plus the panel's global per-item margin and the
 * video play-icon size.
 *
 * Emitted as `--sp-shaped-gallery-iv-*` CSS custom properties consumed by
 * `.sp-shaped-gallery__item` / `.sp-shaped-gallery__item img` (see style.scss). The
 * hover state's properties carry a `-hover` suffix and the stylesheet falls back
 * to the normal value, so a state left untouched simply inherits.
 *
 * Everything here is state-scoped rather than responsive — the panel's Normal /
 * Hover switcher is the axis, and Margin is the one per-device control, so it is
 * the only one emitted with `-t`/`-m` slots.
 *
 * Neutral values are skipped (a border set to `none`, an unset radius) so an
 * unstyled gallery contributes almost no CSS. Editor mirror:
 * app/lib/style/image-video-vars.js — keep in lockstep.
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
 * Per-item image / video custom properties.
 */
final class ImageVideoStyle implements StyleContributor {

	/**
	 * Device suffix map (desktop + tablet + mobile responsive slots).
	 */
	private const DEVICES = array(
		'desktop' => '',
		'tablet'  => '-t',
		'mobile'  => '-m',
	);

	/**
	 * Image & Video CSS custom properties for the gallery container.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return array<string,int|float|string> Custom-property => value map.
	 */
	public function vars( array $attrs ): array {
		$iv    = (array) ( $attrs['imageVideo'] ?? array() );
		$style = (array) ( $iv['style'] ?? array() );

		$vars = $this->state_vars( (array) ( $style['normal'] ?? array() ), '' );
		$vars = array_merge( $vars, $this->state_vars( (array) ( $style['hover'] ?? array() ), '-hover' ) );

		// Per-item margin (responsive box model) — the panel's global Margin.
		foreach ( self::DEVICES as $device => $suffix ) {
			$margin = CssHelpers::spacing_value( (array) ( $attrs['margin'] ?? array() ), $device );
			if ( '' !== $margin ) {
				$vars[ '--sp-shaped-gallery-iv-mg' . $suffix ] = $margin;
			}
		}

		// Video play-icon size (always present — normalized + clamped).
		if ( isset( $iv['playIconSize'] ) ) {
			$vars['--sp-shaped-gallery-iv-play'] = (int) $iv['playIconSize'] . 'px';
		}

		return $vars;
	}

	/**
	 * Build one state's custom properties (border, radius, shadow).
	 *
	 * @param array<string,mixed> $state  Per-state style bundle.
	 * @param string              $suffix '' for normal, '-hover' for hover.
	 * @return array<string,int|float|string> Custom-property => value map.
	 */
	private function state_vars( array $state, string $suffix ): array {
		$vars = array();

		// Border — style gates the colour + width, as everywhere else.
		$border       = (array) ( $state['border'] ?? array() );
		$border_style = $border['style'] ?? 'none';
		if ( 'none' !== $border_style && '' !== $border_style ) {
			$vars[ '--sp-shaped-gallery-iv-bd-style' . $suffix ] = $border_style;
			if ( ! empty( $border['color'] ) ) {
				$vars[ '--sp-shaped-gallery-iv-bd-color' . $suffix ] = $border['color'];
			}
			$width = CssHelpers::spacing_value( (array) ( $state['borderWidth'] ?? array() ) );
			if ( '' !== $width ) {
				$vars[ '--sp-shaped-gallery-iv-bd-width' . $suffix ] = $width;
			}
		}

		$radius = CssHelpers::spacing_value( (array) ( $state['borderRadius'] ?? array() ) );
		if ( '' !== $radius ) {
			$vars[ '--sp-shaped-gallery-iv-radius' . $suffix ] = $radius;
		}

		// Box shadow — gated by the control's own enable toggle.
		if ( ! empty( $state['boxShadowEnable'] ) ) {
			$shadow = CssHelpers::box_shadow_value( (array) ( $state['boxShadow'] ?? array() ) );
			if ( '' !== $shadow ) {
				$vars[ '--sp-shaped-gallery-iv-shadow' . $suffix ] = $shadow;
			}
		}

		return $vars;
	}
}

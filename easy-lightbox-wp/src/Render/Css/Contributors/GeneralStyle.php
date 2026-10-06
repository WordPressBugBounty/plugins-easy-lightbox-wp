<?php
/**
 * General style contributor — background, padding, and margin from the Advanced Settings panel.
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
 * General styling custom properties.
 */
final class GeneralStyle implements StyleContributor {

	/**
	 * General CSS custom properties for the gallery container.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return array<string,int|string> Custom-property => value map.
	 */
	public function vars( array $attrs ): array {
		$adv  = $attrs['advanced'] ?? array();
		$vars = array();

		// Background: solid or gradient.
		if ( isset( $adv['background'] ) && is_array( $adv['background'] ) ) {
			$bg = CssHelpers::background_value( $adv['background'] );
			if ( '' !== $bg ) {
				$vars['--sp-shaped-gallery-wrap-bg'] = $bg;
			}
		}

		// Padding & Margin: responsive.
		foreach ( array(
			'desktop' => '',
			'tablet'  => '-t',
			'mobile'  => '-m',
		) as $device => $suffix ) {
			if ( isset( $adv['padding'] ) && is_array( $adv['padding'] ) ) {
				$pad = CssHelpers::spacing_value( $adv['padding'], $device );
				if ( '' !== $pad ) {
					$vars[ '--sp-shaped-gallery-wrap-pad' . $suffix ] = $pad;
				}
			}

			if ( isset( $adv['margin'] ) && is_array( $adv['margin'] ) ) {
				$mg = CssHelpers::spacing_value( $adv['margin'], $device );
				if ( '' !== $mg ) {
					$vars[ '--sp-shaped-gallery-wrap-mg' . $suffix ] = $mg;
				}
			}
		}

		return $vars;
	}
}

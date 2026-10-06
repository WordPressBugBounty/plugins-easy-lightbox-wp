<?php
/**
 * Style engine — assembles the gallery's dynamic CSS from a data-driven list of
 * StyleContributors and produces the container's inline custom-property style.
 *
 * This is the single seam where gallery attributes become styling. Adding a new
 * style panel means adding a contributor to $contributors here (or via the
 * `shaped_gallery_style_contributors` filter) — never a branch in the
 * renderer. LayoutRenderer stays responsible for markup only.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render\Css;

use ShapedPlugin\ShapedGallery\Render\Css\Contributors\GeometryVars;
use ShapedPlugin\ShapedGallery\Render\Css\Contributors\ImageVideoStyle;
use ShapedPlugin\ShapedGallery\Render\Css\Contributors\ContentStyle;
use ShapedPlugin\ShapedGallery\Render\Css\Contributors\AjaxStyle;
use ShapedPlugin\ShapedGallery\Render\Css\Contributors\GeneralStyle;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Runs style contributors and builds the container inline style.
 */
final class StyleEngine {

	/**
	 * Ordered style contributors.
	 *
	 * @var StyleContributor[]
	 */
	private array $contributors;

	/**
	 * @param StyleContributor[]|null $contributors Contributor list; defaults to
	 *                                              the built-in set. Injectable
	 *                                              for testing.
	 */
	public function __construct( ?array $contributors = null ) {
		$this->contributors = $contributors ?? self::default_contributors();
	}

	/**
	 * Built-in contributor list, in application order.
	 *
	 * Contributors whose target element is a SIBLING of the grid rather than the
	 * grid itself are deliberately absent here — custom properties do not inherit
	 * across siblings, so AjaxStyle is emitted on its own element via
	 * {@see pagination_style()}.
	 *
	 * @return StyleContributor[]
	 */
	private static function default_contributors(): array {
		$contributors = array(
			new GeometryVars(),
			new ImageVideoStyle(),
			new ContentStyle(),
			new GeneralStyle(),
		);

		/**
		 * Filter the gallery style contributors.
		 *
		 * @since 1.0.0
		 *
		 * @param StyleContributor[] $contributors Ordered contributor instances.
		 */
		return (array) apply_filters( 'shaped_gallery_style_contributors', $contributors );
	}

	/**
	 * Build the gallery container inline style (merged CSS custom properties).
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return string CSS declaration string ("--sp-shaped-gallery-*:v;…").
	 */
	public function container_style( array $attrs ): string {
		$vars = array();
		foreach ( $this->contributors as $contributor ) {
			$vars = array_merge( $vars, $contributor->vars( $attrs ) );
		}
		return CssHelpers::declarations( $vars );
	}

	/**
	 * Build the Ajax-pagination bar's inline style (its `--sp-shaped-gallery-ap-*` custom
	 * properties).
	 *
	 * The pagination bar is a SIBLING of the `.sp-shaped-gallery` grid (so it never becomes a
	 * grid / flex / absolutely-positioned masonry child), and CSS custom properties
	 * do not inherit across siblings — so the button's `--sp-shaped-gallery-ap-*` vars must live on
	 * the bar element itself, not on the `.sp-shaped-gallery` container. This keeps AjaxStyle
	 * out of {@see container_style()}'s contributor list while still routing its
	 * CSS generation through the one StyleEngine seam (markup stays LayoutRenderer's
	 * job). Returns '' when pagination is inactive/unstyled.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return string CSS declaration string ("--sp-shaped-gallery-ap-*:v;…").
	 */
	public function pagination_style( array $attrs ): string {
		return CssHelpers::declarations( ( new AjaxStyle() )->vars( $attrs ) );
	}

}

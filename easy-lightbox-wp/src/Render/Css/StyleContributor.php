<?php
/**
 * Contract for a gallery style contributor.
 *
 * The gallery's dynamic styling is assembled from a data-driven LIST of
 * contributors (see StyleEngine) rather than a growing method or switch inside
 * the renderer. Each contributor owns ONE concern (geometry, item styling,
 * content, ajaxPagination, …) and returns the CSS custom properties that concern
 * needs on the gallery container. New style panels register a new contributor —
 * no renderer change, no branch.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render\Css;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * A single-concern producer of gallery CSS custom properties.
 */
interface StyleContributor {

	/**
	 * CSS custom properties this contributor adds to the gallery container.
	 *
	 * Returned maps are merged (in registration order) by the StyleEngine into
	 * the container's inline style. Return an empty array to contribute nothing
	 * for the current attributes.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return array<string,int|float|string> Custom-property => value map.
	 */
	public function vars( array $attrs ): array;
}

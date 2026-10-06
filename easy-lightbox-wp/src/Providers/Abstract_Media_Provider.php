<?php
/**
 * Abstract media provider contract.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Providers;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Every media source (Media Library now; Dropbox / Google Photos / Instagram /
 * Dribbble later) extends this class. The layout compiler only ever sees the
 * normalized MediaItem[] returned by fetch(), so it never needs to know where
 * the bytes came from — adding a provider requires zero changes downstream.
 *
 * Normalized MediaItem shape (the universal currency consumed by every layout):
 * [
 *   'id'          => int|string,
 *   'type'        => 'image'|'video',
 *   'url'         => string,   // display source (thumbnail-sized for grids)
 *   'thumb'       => string,   // small thumbnail
 *   'full'        => string,   // full-size / lightbox source
 *   'width'       => int,
 *   'height'      => int,
 *   'alt'         => string,
 *   'title'       => string,
 *   'caption'     => string,
 *   'description' => string,
 *   'link'        => string,   // custom click-through URL (optional)
 *   'provider'    => string,   // provider id
 *   'srcset'      => string,   // optional: candidate list for `url` ("<url> <w>w, …")
 *   'sizes'       => string,   // optional: the provider's default `sizes` hint
 * ]
 *
 * `srcset`/`sizes` are OPT-IN (see the `srcset` fetch arg below) because they are
 * long strings: the media-manager browse payload — which the editor persists into
 * the block's `items` attribute — must not carry them.
 */
abstract class Abstract_Media_Provider {

	/**
	 * Unique provider id, e.g. 'media_library', 'dropbox'.
	 *
	 * @return string
	 */
	abstract public function get_id(): string;

	/**
	 * Human-readable label shown in the Connect & Import rail.
	 *
	 * @return string
	 */
	abstract public function get_label(): string;

	/**
	 * Inline SVG glyph for the provider (mirrors the prototype `brands[].glyph`).
	 *
	 * @return string
	 */
	abstract public function get_icon(): string;

	/**
	 * Whether this provider is usable right now. MVP: only Media Library is true.
	 *
	 * @return bool
	 */
	abstract public function is_available(): bool;

	/**
	 * Whether this provider is a Pro/add-on feature (renders as a locked teaser).
	 *
	 * @return bool
	 */
	abstract public function is_pro(): bool;

	/**
	 * Optional short description for the connect panel.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return '';
	}

	/**
	 * Fetch media and return a normalized MediaItem[].
	 *
	 * Implementations MUST return the shape documented in the class doc-block.
	 *
	 * Recognized args are provider-specific, but three are conventional:
	 *
	 * - `ids` — the render path's fast path.
	 * - `size` — the display size the caller wants `url` to point at (the block's
	 *   Image Resolution setting). A provider that exposes only one URL per item
	 *   ignores it; one that has variants SHOULD resolve `url` (and its
	 *   `width`/`height`) at that size, leaving `thumb` and `full` alone. Resolving
	 *   it here keeps size knowledge with the media source instead of in the
	 *   renderer, and costs no extra request.
	 * - `srcset` (bool) — also return the `srcset`/`sizes` candidate strings for
	 *   `url`. Opt-in so the browse payload the editor persists stays lean; the
	 *   render path asks for it, the media manager does not.
	 *
	 * @param array $args Query args (ids, size, srcset, search, page, per_page, …).
	 * @return array<int,array<string,mixed>>
	 */
	abstract public function fetch( array $args ): array;

	/**
	 * Serialize the provider's public metadata for the REST catalog / React rail.
	 *
	 * @return array<string,mixed>
	 */
	public function to_array(): array {
		return array(
			'id'          => $this->get_id(),
			'label'       => $this->get_label(),
			'icon'        => $this->get_icon(),
			'description' => $this->get_description(),
			'available'   => $this->is_available(),
			'pro'         => $this->is_pro(),
		);
	}
}

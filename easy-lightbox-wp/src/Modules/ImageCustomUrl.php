<?php
/**
 * The Image Custom URL module: a site-wide switch, and nothing else to configure.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Modules;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns no branch of `shaped_gallery_settings` — the same shape as
 * {@see ReadyPatterns}, for the same reason: the Modules grid's switch
 * (`modules.image-custom-url`, already handled by {@see ModuleRegistry}) IS the
 * whole module, and the dashboard card ships `hasSettings: false`.
 *
 * ## What the switch gates
 *
 * "Custom URL" is not a module feature at all — it is the `clickAction: 'url'`
 * option of the block's ALREADY-EXISTING Image Click Action panel, plus the
 * per-item `link` field editors already collect in the media picker and the Edit
 * Gallery modal. This module is that feature's site-wide kill switch, the same
 * §6.9 split {@see Lightbox} uses:
 * **the block owns WHETHER a tile links out, the module owns whether the site
 * allows that click model at all.**
 *
 * Switching it off is meant to be total, on both sides of the editor boundary:
 *
 * - **Render:** {@see \ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\GalleryOptions::custom_url_active()}
 *   folds this into the click-behaviour gate `LayoutRenderer::render_item()` reads,
 *   so a tile whose `clickAction` is still `'url'` degrades to a plain, unlinked
 *   image — the same fail-safe direction every other module gate here takes.
 * - **Editor:** the controls are HIDDEN outright rather than disabled — both the
 *   "URL" entry in Click Action Type's button set and the per-item Custom URL
 *   field disappear, via the
 *   `imageCustomUrlEnabled` flag `Core\Assets::localize_data()` adds to the shared
 *   editor/admin payload. A gallery that already has `clickAction: 'url'` or items
 *   with a stored `link` keeps that data untouched — hiding the CONTROL is not the
 *   same as clearing the VALUE, and re-enabling the module must restore exactly what
 *   was there before.
 *
 * Pure static — a data model, like {@see Settings} itself. No hooks.
 */
final class ImageCustomUrl {

	/**
	 * The module's key in {@see ModuleRegistry}.
	 *
	 * @var string
	 */
	public const KEY = 'image-custom-url';

	/**
	 * Whether the module is switched on in Settings → Modules.
	 *
	 * @return bool
	 */
	public static function is_enabled(): bool {
		return ModuleRegistry::is_enabled( self::KEY );
	}
}

<?php
/**
 * Beaver Builder module template: the gallery itself.
 *
 * Beaver renders a module by including this file, so it is the module's `render()`
 * in everything but name. `$module`, `$id` and `$settings` are put in scope by
 * Beaver's rendering engine.
 *
 * @package ShapedPlugin\ShapedGallery
 *
 * @var \ShapedPlugin\ShapedGallery\Integrations\BeaverGalleryModule $module   Module instance.
 * @var string                                                     $id       Node id.
 * @var object                                                     $settings Saved settings.
 */

use ShapedPlugin\ShapedGallery\Integrations\BeaverIntegration;
use ShapedPlugin\ShapedGallery\Integrations\GalleryEmbed;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/*
 * Resolved into a variable first, as BricksGalleryElement::render() already does.
 * `WordPress.Security.EscapeOutput` flags every call in an `echo` statement that is
 * not a known escaping function — `is_editing()` in the argument list included — and
 * a trailing `phpcs:ignore` covers only its own line, so the annotation that used to
 * sit on the `echo` never reached it and suppressed nothing.
 *
 * Prefixed, because this file is included at Beaver's own variable scope.
 */
$shaped_gallery_markup = GalleryEmbed::render(
	$settings->gallery_id ?? 0,
	BeaverIntegration::is_editing()
);

// Escaped inside GalleryEmbed::render(); the gallery markup itself is the block's
// own SSR output, which escapes late and inline as it builds.
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- see above.
echo $shaped_gallery_markup;

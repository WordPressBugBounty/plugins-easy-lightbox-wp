<?php
/**
 * The Ready Patterns module: a site-wide switch, and nothing else to configure.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Modules;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns no branch of `shaped_gallery_settings` — the same zero-settings shape as
 * {@see ImageCustomUrl}. The Modules grid's switch
 * (`modules.ready-patterns`) IS the whole module, and the dashboard card ships
 * `hasSettings: false` because there is no drawer to open. The class exists so
 * "is this module on?" still has exactly one name, per {@see ModuleRegistry}'s
 * own doc-block.
 *
 * ## What the switch gates
 *
 * Unlike the other modules, this one has NO per-gallery half — there is no block
 * attribute to pair it with, because a pattern is not a property of a gallery.
 * It is closer to an editor capability: on, the block editor grows a **Ready
 * Patterns** button and {@see \ShapedPlugin\ShapedGallery\Rest\PatternController}
 * answers; off, the button is never drawn AND every route 403s.
 *
 * Both halves matter and only one of them is the enforcement. The editor read
 * (`readyPatternsEnabled` in the shared localize payload) hides a control for a
 * feature that does not exist — §6.9's hide-don't-disable rule. The REST gate is
 * what actually stops the outbound request to the provider, which is the thing a
 * site switching this off is asking for: no third-party call from its editor.
 *
 * Pure static. No hooks.
 */
final class ReadyPatterns {

	/**
	 * The module's key in {@see ModuleRegistry}.
	 *
	 * @var string
	 */
	public const KEY = 'ready-patterns';

	/**
	 * Whether the module is switched on in Settings → Modules.
	 *
	 * @return bool
	 */
	public static function is_enabled(): bool {
		return ModuleRegistry::is_enabled( self::KEY );
	}
}

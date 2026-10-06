<?php
/**
 * The page-builder integrations subsystem: which of the six boot, and when.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Integrations;

use ShapedPlugin\ShapedGallery\Modules\IntegrationRegistry;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Boots one integration class per switched-on page builder.
 *
 * The Settings screen's Integrations grid writes {@see IntegrationRegistry}; this is
 * the one thing that reads it back. Two rules shape the whole subsystem:
 *
 * 1. **The switch decides whether an integration exists at all**, not whether it does
 *    anything once it has hooked in. A switched-off builder never constructs its
 *    class, so it costs the request nothing — the failure mode of the alternative
 *    (register everything, check the switch inside each callback) is a switch that
 *    still leaves an element in the builder's panel.
 * 2. **The builder's own presence is checked LATE, inside the callbacks**, never
 *    here. This runs on `plugins_loaded`, where the load order between this plugin
 *    and Elementor, Bricks or Divi is not defined — a `class_exists()` here would
 *    intermittently answer "absent" for a builder that is perfectly active. Every
 *    integration therefore registers its hooks unconditionally (an `add_action()`
 *    costs nothing) and bails in the callback, which runs at `init` or later, by
 *    which point every plugin and the theme have loaded.
 */
final class Integrations {

	/**
	 * Integration key => the class that implements it.
	 *
	 * The keys are {@see IntegrationRegistry}'s, and a key here with no switch there
	 * could never boot — `verify-integrations.php` pins the two lists as equal so the
	 * grid, the stored option and the shipped code cannot describe three different
	 * sets of builders.
	 *
	 * @var array<string,class-string>
	 */
	private const BUILDERS = array(
		'elementor' => ElementorIntegration::class,
		'divi'      => DiviIntegration::class,
		'wpbakery'  => WPBakeryIntegration::class,
		'oxygen'    => OxygenIntegration::class,
		'beaver'    => BeaverIntegration::class,
		'bricks'    => BricksIntegration::class,
	);

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		foreach ( self::BUILDERS as $key => $class ) {
			if ( ! IntegrationRegistry::is_enabled( $key ) ) {
				continue;
			}

			( new $class() )->hooks();
		}

		/**
		 * Fires once the built-in page-builder integrations have booted.
		 *
		 * An add-on registers a further builder here; it gets the same contract the
		 * six built-ins have — {@see GalleryEmbed} for the list, the render and the
		 * canvas placeholder — and owns its own on/off decision, since
		 * {@see IntegrationRegistry} is an allow-list of the builders this plugin
		 * ships code for.
		 *
		 * @since 1.0.0
		 *
		 * @param array<string,class-string> $builders Key => integration class.
		 */
		do_action( 'shaped_gallery_integrations_loaded', self::BUILDERS );
	}

	/**
	 * The integrations this plugin ships code for.
	 *
	 * @return array<string,class-string>
	 */
	public static function builders(): array {
		return self::BUILDERS;
	}
}

<?php
/**
 * The gallery post type's own capabilities, and who holds them.
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Core;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns the `*_shaped_galleries` capability set: what it contains, who is granted it,
 * and how a site that never ran the activation hook still ends up with it.
 *
 * ## Why the post type has capabilities of its own
 *
 * It used to register with `capability_type => 'post'`, which meant any role with
 * `edit_posts` could author a gallery through core's editor and REST route — while
 * every screen and route in this plugin required `manage_options`. Two doors, two
 * locks, and the weaker one was core's.
 *
 * The fix that must NOT be used for this is mapping the post type onto
 * `manage_options`. That was tried and reverted: `manage_options` is a settings
 * capability with no content meaning, no role-management plugin can then express
 * "may edit galleries" without also handing over the options screen, and — worst —
 * every primitive collapses to one identical check, so `map_meta_cap()` still runs
 * but can no longer distinguish an author from a stranger or a draft from a
 * published gallery.
 *
 * A dedicated capability type is the answer core is built for: the primitives stay
 * distinct, `map_meta_cap()` keeps working, and "may manage galleries" becomes a
 * thing a site can actually grant.
 *
 * ## Why granting is idempotent and self-healing
 *
 * A capability set is only as good as its grant, and an ungranted set locks the
 * administrator out of their own galleries. `register_activation_hook()` alone does
 * not cover the cases that matter:
 *
 * - a plugin updated in place, which never fires an activation hook;
 * - network activation, which fires once and not per site;
 * - a role reset by a role-management plugin or by `populate_roles()`.
 *
 * So the grant also runs from `init` whenever the stored schema version does not
 * match {@see self::VERSION}. The check is one autoloaded option read and an integer
 * comparison — the write only happens when something is actually missing.
 *
 * ## What is deliberately NOT here
 *
 * Deactivation does not revoke. A site that deactivates to debug, or updates through
 * a deactivate/activate cycle, must not come back with an administrator who cannot
 * open their galleries. Revocation belongs to uninstall, and `uninstall.php` calls
 * {@see self::revoke()}.
 */
final class Capabilities {

	/**
	 * Option holding the granted capability schema version.
	 *
	 * @var string
	 */
	const OPTION = 'shaped_gallery_caps_version';

	/**
	 * Bump this when {@see self::PRIMITIVES} changes, so every existing site
	 * re-grants on its next request instead of silently missing the new capability.
	 *
	 * @var int
	 */
	const VERSION = 1;

	/**
	 * Roles granted the gallery capabilities on activation.
	 *
	 * Administrator only: galleries are an administrative feature everywhere else in
	 * this plugin ({@see \ShapedPlugin\ShapedGallery\Admin\Menu::CAPABILITY}), and a
	 * capability set that is granted more widely than the screens that use it would
	 * recreate the very mismatch this class exists to remove.
	 *
	 * A site that wants an Editor to manage galleries now has a supported way to say
	 * so — grant `edit_shaped_galleries` to that role — which is exactly what a
	 * dedicated capability type buys and what mapping onto `manage_options` denied.
	 *
	 * @var array<int,string>
	 */
	const ROLES = array( 'administrator' );

	/**
	 * The PRIMITIVE capability name patterns, as `sprintf` templates over the plural
	 * base.
	 *
	 * The meta capabilities (`edit_post`, `read_post`, `delete_post`) are absent on
	 * purpose and must stay absent: with `map_meta_cap => true` core derives them from
	 * the primitives below, per post, and a meta capability granted to a role is a
	 * capability nothing ever checks.
	 *
	 * `create_posts` is absent for a different reason — core defaults it to
	 * `edit_posts`, so `edit_shaped_galleries` already authorises creation and declaring
	 * a separate one would add a capability the grant has to remember.
	 *
	 * Kept as patterns rather than read back from `get_post_type_object()` so the set
	 * is assertable without WordPress loaded; `verify-capabilities.php` pins it
	 * against the names core generates.
	 *
	 * @var array<int,string>
	 */
	private const PRIMITIVES = array(
		'edit_%s',
		'edit_others_%s',
		'edit_private_%s',
		'edit_published_%s',
		'publish_%s',
		'read_private_%s',
		'delete_%s',
		'delete_others_%s',
		'delete_private_%s',
		'delete_published_%s',
	);

	/**
	 * Hook registration.
	 *
	 * `init` at 20, i.e. after {@see PostType::register()} at 10 — the grant describes
	 * a registered post type, and running first would be granting capabilities for
	 * something that does not exist yet. It fires on front-end requests too, which is
	 * intentional: a REST request is not `is_admin()`, and the block editor's own data
	 * requests are the first thing a locked-out administrator would notice.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'init', array( __CLASS__, 'maybe_grant' ), 20 );
	}

	/**
	 * Every primitive capability the gallery post type uses.
	 *
	 * @return array<int,string>
	 */
	public static function primitives(): array {
		$plural = PostType::CAPABILITY_TYPE[1];

		return array_map(
			static function ( string $pattern ) use ( $plural ): string {
				return sprintf( $pattern, $plural );
			},
			self::PRIMITIVES
		);
	}

	/**
	 * The capability that means "may manage galleries".
	 *
	 * The one a site grants to widen access, and the one any future consolidation of
	 * {@see \ShapedPlugin\ShapedGallery\Admin\Menu::CAPABILITY} should point at.
	 *
	 * @return string
	 */
	public static function edit_capability(): string {
		return 'edit_' . PostType::CAPABILITY_TYPE[1];
	}

	/**
	 * Grant the capabilities if this site has not been given the current set.
	 *
	 * @return bool Whether a grant was performed.
	 */
	public static function maybe_grant(): bool {
		if ( (int) get_option( self::OPTION, 0 ) === self::VERSION ) {
			return false;
		}

		self::grant();

		return true;
	}

	/**
	 * Add every gallery capability to {@see self::ROLES}.
	 *
	 * Idempotent — `WP_Role::add_cap()` on a capability a role already has is a no-op
	 * beyond the option write, which is why the version check above exists to keep it
	 * from running on every request.
	 *
	 * The version is recorded even when a role is missing, so a site with a
	 * hand-pruned role list does not re-attempt the grant on every request forever.
	 *
	 * @return void
	 */
	public static function grant(): void {
		$primitives = self::primitives();

		foreach ( self::ROLES as $role_name ) {
			$role = get_role( $role_name );

			if ( ! $role instanceof \WP_Role ) {
				continue;
			}

			foreach ( $primitives as $capability ) {
				if ( ! $role->has_cap( $capability ) ) {
					$role->add_cap( $capability );
				}
			}
		}

		update_option( self::OPTION, self::VERSION, false );
	}

	/**
	 * Remove every gallery capability from every role.
	 *
	 * Called from `uninstall.php` only — see the class doc-block on why deactivation
	 * must not revoke. Walks ALL roles rather than {@see self::ROLES}, because a site
	 * may have granted the capability to a role of its own and uninstall should not
	 * leave orphaned capability names behind in `wp_user_roles`.
	 *
	 * @return void
	 */
	public static function revoke(): void {
		$primitives = self::primitives();
		$roles      = wp_roles();

		foreach ( array_keys( $roles->get_names() ) as $role_name ) {
			$role = get_role( $role_name );

			if ( ! $role instanceof \WP_Role ) {
				continue;
			}

			foreach ( $primitives as $capability ) {
				if ( $role->has_cap( $capability ) ) {
					$role->remove_cap( $capability );
				}
			}
		}

		delete_option( self::OPTION );
	}
}

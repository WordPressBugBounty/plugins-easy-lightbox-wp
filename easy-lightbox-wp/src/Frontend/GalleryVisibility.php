<?php
/**
 * The one answer to "may THIS request see this gallery's items?".
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Frontend;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Owns the Advanced → Visibility access decision for every render path.
 *
 * ## Why this is a class and not two `if`s in the renderer
 *
 * It WAS two `if`s in `Blocks\BlockTypes\Gallery::render()`, and that is exactly how
 * the gate came to be missing from the other render path. A gallery's items reach a
 * visitor through two doors:
 *
 * 1. `Gallery::render()` — the block's `render_callback`, during `the_content`;
 * 2. `Render\LayoutRenderer::render_window()` — the Ajax Pagination window, reached
 *    through the deliberately PUBLIC `/gallery-page` REST route.
 *
 * Door 1 checked `read_private_posts` and asked `GalleryPassword` for a verdict.
 * Door 2 checked neither, so `GET /gallery-page?galleryId=<n>&offset=0` returned the
 * full contents of a private or password-protected gallery to an anonymous caller —
 * post ids being sequential, that is an enumeration, not a guess. The endpoint's own
 * gate was "does this gallery exist and is pagination on", which is a check for
 * EXISTENCE where an authorization check was needed.
 *
 * So the decision lives here, in one place both doors ask, and the answer is not
 * something a caller can forget to look up: {@see \ShapedPlugin\ShapedGallery\Render\LayoutRenderer::render_window()}
 * asks it itself rather than trusting that it was asked upstream. A third door
 * inherits the gate by construction.
 *
 * ## Why the answer is a reason string rather than a bool
 *
 * The two modes are not the same refusal and must not render the same way. Private
 * is HIDDEN — a visitor who cannot read private content is told nothing at all,
 * exactly as WordPress treats a private post. Password is LOCKED — there is a form,
 * and the whole point is that the visitor is invited to fill it in. `Gallery::render()`
 * needs to know which one closed so it can draw the right thing (and so Debug
 * Performance can name it); the REST route treats both identically and just refuses.
 * A bool would force the caller to re-derive the mode to tell them apart.
 *
 * ## What it deliberately does NOT do
 *
 * No markup, no cookies, no transient writes. Issuing the unlock cookie belongs to
 * `GalleryPassword` on `template_redirect` (see that class for why it cannot happen
 * during `the_content`), and drawing the form belongs to
 * {@see GalleryPassword::challenge()}. This class only decides.
 */
final class GalleryVisibility {

	/**
	 * Nothing is in the way — the gallery renders.
	 *
	 * @var string
	 */
	public const OPEN = '';

	/**
	 * Hidden: the mode is Private and this user cannot read private content.
	 *
	 * @var string
	 */
	public const PRIVATE_MODE = 'private';

	/**
	 * Locked: the mode is Password and this visitor holds no valid unlock cookie.
	 *
	 * @var string
	 */
	public const PASSWORD_MODE = 'password';

	/**
	 * Which gate closes for this request, if any.
	 *
	 * Reads the mode off ALREADY-NORMALIZED attributes: `GalleryOptions::normalize()`
	 * allow-lists it to public|password|private, so an unrecognised value here is a
	 * caller that skipped normalization rather than a value to interpret. It falls
	 * through to OPEN, which is safe precisely because both real gates are then
	 * evaluated on their own terms — a garbage mode cannot switch a gate OFF, only
	 * fail to switch one on.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return string One of self::OPEN, self::PRIVATE_MODE, self::PASSWORD_MODE.
	 */
	public static function blocked_by( array $attrs ): string {
		$mode = (string) ( $attrs['advanced']['visibility']['mode'] ?? 'public' );

		if ( self::PRIVATE_MODE === $mode && ! current_user_can( 'read_private_posts' ) ) {
			return self::PRIVATE_MODE;
		}

		if ( self::PASSWORD_MODE === $mode && GalleryPassword::is_locked( $attrs ) ) {
			return self::PASSWORD_MODE;
		}

		return self::OPEN;
	}

	/**
	 * Whether this request may be served this gallery's items.
	 *
	 * The form every caller that has nothing to draw should use — a REST route, a
	 * feed, an export. `Gallery::render()` wants {@see blocked_by()} instead, because
	 * it draws a different thing per reason.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return bool
	 */
	public static function is_viewable( array $attrs ): bool {
		return self::OPEN === self::blocked_by( $attrs );
	}
}

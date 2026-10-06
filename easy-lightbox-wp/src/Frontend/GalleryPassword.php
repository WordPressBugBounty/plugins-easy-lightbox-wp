<?php
/**
 * The password gate for a gallery whose Visibility mode is "Password".
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
 * Owns everything about the per-gallery password: the challenge form, the unlock
 * cookie, and the one hook that can actually issue it.
 *
 * ## Why this is a hooked subsystem and not four lines in the renderer
 *
 * It used to live inside `Gallery::render()`, which runs during `the_content` —
 * long after the response headers have gone out. `setcookie()` there is a no-op
 * plus a "headers already sent" warning, so the visitor's correct password was
 * accepted for exactly one paint and then forgotten on the next request. A cookie
 * has to be written before ANY output, which on the front end means
 * `template_redirect`; that is the whole reason this class exists.
 *
 * ## How the handler knows the password without rendering anything
 *
 * At `template_redirect` no block has been parsed yet, so the correct password —
 * a block attribute buried in some post's content — is not reachable. Rather than
 * re-parse the queried post (which would miss widgets, template parts and
 * shortcodes), {@see challenge()} stashes the gallery's UNLOCK TOKEN in a
 * transient the moment it draws the form, and the handler verifies against that.
 *
 * The token is a keyed hash, never the password, and the client only ever sends
 * back an opaque key. That is the same "server-owned render context, opaque id"
 * shape `LayoutRenderer` already uses for its Ajax pagination `ctx` transient —
 * the client cannot widen what it is allowed to unlock, only name a gallery.
 *
 * ## What a visitor's cookie is worth
 *
 * `wp_hash()` of the key + password, so it is bound to this site's salts and to
 * this gallery: it cannot be replayed on another site, cannot be replayed against
 * another gallery, and cannot be reversed into the password. It replaces an
 * unsalted `md5( $password )` that was all three of those things.
 *
 * ## Deliberately no nonce
 *
 * This form is a credential prompt, not a state-changing action on the visitor's
 * behalf, and WordPress core's own post-password form carries no nonce either. A
 * nonce on a front-end form is also actively harmful on a page-cached site: the
 * cached token goes stale and the correct password starts being rejected. The
 * real threat is blind guessing, which a nonce does nothing about — see
 * {@see throttled()} for what does.
 *
 * ## Why the password does not stay in post_content
 *
 * It used to: `visibility.password` was a plain block attribute, so it sat in
 * `post_content` in cleartext — every past password preserved forever in the
 * post's revision history (the CPT supports revisions), and shipped in the clear
 * in a WXR export. {@see migrate_on_save()} closes that: on every save of a post
 * containing this block, it computes the SAME unlock token {@see token()} always
 * derives, stores it under a dedicated option keyed by the block's `uniqueId`,
 * and blanks the password attribute before the content reaches the database — so
 * the row `wp_save_post_revision()` snapshots for the NEXT edit already has
 * nothing in it. {@see credentials()} then prefers that stored token over
 * anything still inline, which is what lets a gallery saved before this fix keep
 * working unmigrated until its post is next saved: `migrate_on_save()` runs on
 * every save, not only on an explicit password change.
 *
 * `wp_insert_post_data` rather than `save_post`: it fires BEFORE the row is
 * written, which is what lets it stop the password from ever landing in the
 * database rather than scrubbing it after the fact — including for the very
 * first save, and including revisions (which snapshot the CURRENT row, so
 * stripping happens before any revision of this content can be taken).
 *
 * A block with no `uniqueId` — content saved before that attribute existed — is
 * left untouched: there is no stable name to hang a verifier option on, and the
 * block editor assigns one on the next open regardless. It migrates then.
 */
final class GalleryPassword {

	/**
	 * Option name prefix for a gallery's stored unlock-token verifier.
	 *
	 * One row per password-protected gallery block, keyed by its `uniqueId`. Not a
	 * transient: unlike the token cache in {@see challenge()}, this is the
	 * authoritative record once a gallery has been migrated off an inline
	 * password, and must outlive any transient's TTL. Cleaned up on uninstall
	 * only, alongside the transient prefixes it lives next to.
	 *
	 * @var string
	 */
	private const VERIFIER_PREFIX = 'shaped_gallery_pwdv_';

	/**
	 * Password input name.
	 *
	 * @var string
	 */
	public const FIELD = 'shaped_gallery_password';

	/**
	 * Hidden input naming WHICH gallery is being unlocked.
	 *
	 * @var string
	 */
	public const ID_FIELD = 'shaped_gallery_pwd_id';

	/**
	 * Query arg carrying "that password was wrong" across the redirect.
	 *
	 * @var string
	 */
	public const ERROR_ARG = 'shaped-gallery-locked';

	/**
	 * Unlock-cookie name prefix.
	 *
	 * @var string
	 */
	private const COOKIE_PREFIX = 'shaped_gallery_pwd_';

	/**
	 * Token-transient name prefix.
	 *
	 * @var string
	 */
	private const TOKEN_PREFIX = 'shaped_gallery_pwd_';

	/**
	 * Failure-counter transient name prefix.
	 *
	 * @var string
	 */
	private const THROTTLE_PREFIX = 'shaped_gallery_pwd_try_';

	/**
	 * How long a stashed unlock token stays valid.
	 *
	 * Long, and refreshed by every render, because it is not a secret with a
	 * lifetime of its own — it is a lookup the submit handler needs to exist for as
	 * long as a visitor might sit on the form.
	 *
	 * @var int
	 */
	private const TOKEN_TTL = MONTH_IN_SECONDS;

	/**
	 * How long an unlock cookie lasts.
	 *
	 * @var int
	 */
	private const COOKIE_TTL = DAY_IN_SECONDS;

	/**
	 * Failed attempts, per gallery per address, before submissions are ignored.
	 *
	 * @var int
	 */
	private const MAX_ATTEMPTS = 20;

	/**
	 * Window the failure counter is measured over.
	 *
	 * @var int
	 */
	private const THROTTLE_TTL = 15 * MINUTE_IN_SECONDS;

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'template_redirect', array( $this, 'handle_submission' ) );
		// No post_type gate: the block name in the serialized markup is what
		// self::migrate_on_save() actually keys on, and it bails on the very first
		// strpos() for every save that does not contain one.
		add_filter( 'wp_insert_post_data', array( __CLASS__, 'migrate_on_save' ) );
	}

	/**
	 * Whether this gallery is locked, and what to render instead if it is.
	 *
	 * Returns `null` when the gallery should render normally — it is not password
	 * protected, has no password set, or this visitor already holds a valid unlock
	 * cookie. Otherwise it returns the challenge form.
	 *
	 * Side effect, and the point of doing this here: the gallery's unlock token is
	 * refreshed in a transient, so {@see handle_submission()} can verify a
	 * submission for this gallery without any access to its attributes.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return string|null Challenge markup, or null when the gallery may render.
	 */
	public static function challenge( array $attrs ): ?string {
		$credentials = self::credentials( $attrs );

		if ( null === $credentials ) {
			return null;
		}

		list( $key, $token ) = $credentials;

		/*
		 * Read before writing. `set_transient()` rewrites the timeout row on every
		 * call, so an unconditional write here would be a database write per page
		 * view on any site without a persistent object cache.
		 */
		$stored = get_transient( self::TOKEN_PREFIX . $key );
		if ( ! is_string( $stored ) || ! hash_equals( $token, $stored ) ) {
			set_transient( self::TOKEN_PREFIX . $key, $token, self::TOKEN_TTL );
		}

		if ( self::unlocked( $key, $token ) ) {
			return null;
		}

		return self::form( $key, self::has_error( $key ) );
	}

	/**
	 * Whether this gallery is still locked for the current request.
	 *
	 * The read-only half of {@see challenge()}: same verdict, no markup and no
	 * transient write. That is what makes it usable from a render path that has
	 * nothing to draw and no business refreshing a token — the public
	 * `/gallery-page` REST route, reached through
	 * {@see \ShapedPlugin\ShapedGallery\Frontend\GalleryVisibility::blocked_by()}.
	 *
	 * The unlock cookie rides on a REST request like any other, so asking here gets
	 * the same answer `the_content` would have given the same visitor.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return bool
	 */
	public static function is_locked( array $attrs ): bool {
		$credentials = self::credentials( $attrs );

		if ( null === $credentials ) {
			return false;
		}

		list( $key, $token ) = $credentials;

		return ! self::unlocked( $key, $token );
	}

	/**
	 * The gallery key and expected unlock token, or null when there is no gate.
	 *
	 * Extracted so {@see challenge()} and {@see is_locked()} cannot come to disagree
	 * about what "this gallery is protected" means — the two conditions below are the
	 * whole definition, and a second copy of them is how a gate ends up open on one
	 * path and closed on another.
	 *
	 * Null covers both non-cases: the mode is not Password, or it is but no password
	 * has been set. The second is not a locked gallery, it is an unfinished setting —
	 * locking everyone out of it would be a worse answer than rendering, because
	 * nobody could ever supply the empty string.
	 *
	 * The token itself is read from the migrated verifier option when one exists —
	 * {@see migrate_on_save()} writes it and blanks the inline password at the same
	 * time, so a migrated gallery never has both. A gallery not yet migrated (saved
	 * before this fix, or with no `uniqueId` to key an option by) still carries its
	 * password inline, and the token is derived from it exactly as it always was.
	 *
	 * @param array<string,mixed> $attrs Normalized block attributes.
	 * @return array{0:string,1:string}|null Gallery key and unlock token.
	 */
	private static function credentials( array $attrs ): ?array {
		$visibility = $attrs['advanced']['visibility'] ?? array();

		if ( 'password' !== ( $visibility['mode'] ?? 'public' ) ) {
			return null;
		}

		$unique = sanitize_html_class( (string) ( $attrs['uniqueId'] ?? '' ) );

		if ( '' !== $unique ) {
			$verifier = get_option( self::verifier_option( $unique ) );
			if ( is_string( $verifier ) && '' !== $verifier ) {
				return array( $unique, $verifier );
			}
		}

		$password = (string) ( $visibility['password'] ?? '' );
		if ( '' === $password ) {
			return null;
		}

		$key = '' !== $unique ? $unique : self::legacy_key( $password );

		return array( $key, self::token( $key, $password ) );
	}

	/**
	 * Verify a submitted password and issue the unlock cookie.
	 *
	 * Runs on `template_redirect` — before a single byte of the response body — so
	 * the cookie can actually be set, and always ends in a redirect so a refresh
	 * never re-posts the password.
	 *
	 * Deliberately thin: it reads the request, hands the decision to
	 * {@see unlock()} and performs the two side effects. Everything that decides
	 * anything lives in that method, which is testable precisely because this one
	 * ends in `exit`.
	 *
	 * @return void
	 */
	public function handle_submission(): void {
		if ( 'POST' !== strtoupper( (string) ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) ) {
			return;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- A credential prompt, not an action taken on the visitor's behalf; see the class doc-block.
		if ( ! isset( $_POST[ self::ID_FIELD ], $_POST[ self::FIELD ] ) ) {
			return;
		}

		$key   = sanitize_html_class( (string) wp_unslash( $_POST[ self::ID_FIELD ] ) );
		$token = self::unlock( $key, $_POST[ self::FIELD ] );
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		if ( '' === $key ) {
			return;
		}

		if ( null !== $token ) {
			self::set_cookie( $key, $token );
		}

		wp_safe_redirect( self::redirect_url( $key, null !== $token ) );
		exit;
	}

	/**
	 * Decide whether a submitted password opens a gallery.
	 *
	 * Returns the unlock token on success and `null` on every failure — a wrong
	 * password, an unknown gallery, or an address that has been guessing.
	 *
	 * The raw POST value is taken rather than a cleaned one so the unslashing
	 * happens exactly once, here, next to the comparison it has to agree with.
	 *
	 * @param string $key           Gallery key, already class-sanitized.
	 * @param mixed  $raw_password  Submitted password, straight off `$_POST`.
	 * @return string|null Unlock token, or null when the gallery stays locked.
	 */
	public static function unlock( string $key, $raw_password ): ?string {
		if ( '' === $key ) {
			return null;
		}

		$stored = get_transient( self::TOKEN_PREFIX . $key );
		if ( ! is_string( $stored ) || '' === $stored ) {
			return null;
		}

		if ( self::throttled( $key ) ) {
			return null;
		}

		/*
		 * Unslashed, then put through the SAME transform the stored password went
		 * through in `GalleryOptions::normalize_advanced()`. Both sides must agree on
		 * what the password IS, or an author whose password contains markup or a
		 * double space would set one nobody — including them — could ever type.
		 */
		$submitted = sanitize_text_field( (string) wp_unslash( $raw_password ) );

		if ( hash_equals( $stored, self::token( $key, $submitted ) ) ) {
			self::clear_attempts( $key );

			return $stored;
		}

		self::record_attempt( $key );

		return null;
	}

	/**
	 * Whether the visitor already holds a valid unlock cookie for this gallery.
	 *
	 * @param string $key   Gallery key.
	 * @param string $token Expected unlock token.
	 * @return bool
	 */
	private static function unlocked( string $key, string $token ): bool {
		$name = self::COOKIE_PREFIX . $key;

		if ( empty( $_COOKIE[ $name ] ) ) {
			return false;
		}

		return hash_equals( $token, (string) wp_unslash( $_COOKIE[ $name ] ) );
	}

	/**
	 * Issue the unlock cookie.
	 *
	 * `HttpOnly` because no script has any business reading it, `Secure` on HTTPS,
	 * and `SameSite=Lax` so it still arrives when the visitor follows a link to the
	 * page from elsewhere. `$_COOKIE` is seeded as well so anything later in THIS
	 * request already sees the gallery as unlocked.
	 *
	 * @param string $key   Gallery key.
	 * @param string $token Unlock token.
	 * @return void
	 */
	private static function set_cookie( string $key, string $token ): void {
		$name = self::COOKIE_PREFIX . $key;

		setcookie(
			$name,
			$token,
			array(
				'expires'  => time() + self::COOKIE_TTL,
				'path'     => defined( 'COOKIEPATH' ) ? COOKIEPATH : '/',
				'domain'   => defined( 'COOKIE_DOMAIN' ) ? COOKIE_DOMAIN : '',
				'secure'   => is_ssl(),
				'httponly' => true,
				'samesite' => 'Lax',
			)
		);

		$_COOKIE[ $name ] = $token;
	}

	/**
	 * The stable id for a gallery with no `uniqueId` to key anything by.
	 *
	 * A gallery saved before that attribute existed has none, and two such
	 * galleries must not share one cookie, so the id is derived from the password
	 * itself through `wp_hash()` — stable across requests, distinct per password,
	 * and not reversible. Used only pre-migration: {@see migrate_on_save()} never
	 * writes a verifier for a block with no `uniqueId`, so such a gallery keeps
	 * using this path (and its password stays inline) until the block editor
	 * assigns one on its next save.
	 *
	 * @param string $password Stored password.
	 * @return string
	 */
	private static function legacy_key( string $password ): string {
		return 'k' . substr( wp_hash( 'shaped-gallery-pwd-key|' . $password ), 0, 16 );
	}

	/**
	 * The option name a gallery's migrated verifier is stored under.
	 *
	 * @param string $unique Gallery `uniqueId`, already class-sanitized.
	 * @return string
	 */
	private static function verifier_option( string $unique ): string {
		return self::VERIFIER_PREFIX . $unique;
	}

	/**
	 * Move a gallery's password out of `post_content` and into a verifier option.
	 *
	 * Hooked to `wp_insert_post_data`, which fires for every post insert or update
	 * — new content, an edit, a revision snapshot, an autosave — of any post type.
	 * No post_type check: the strpos() below is the actual gate, and it is cheaper
	 * than asking what post type this is for the overwhelming majority of saves
	 * that never mention this block at all.
	 *
	 * `$data['post_content']` arrives SLASHED (WordPress inserts it straight into
	 * the query otherwise), so it is unslashed before {@see parse_blocks()} and
	 * re-slashed on the way back out — the same convention every other filter on
	 * this hook follows.
	 *
	 * @param array<string,mixed> $data Slashed post data about to be saved.
	 * @return array<string,mixed>
	 */
	public static function migrate_on_save( array $data ): array {
		if ( ! isset( $data['post_content'] ) || false === strpos( (string) $data['post_content'], 'wp:shaped-gallery/gallery' ) ) {
			return $data;
		}

		$blocks  = parse_blocks( wp_unslash( (string) $data['post_content'] ) );
		$changed = false;

		self::migrate_blocks( $blocks, $changed );

		if ( $changed ) {
			$data['post_content'] = wp_slash( serialize_blocks( $blocks ) );
		}

		return $data;
	}

	/**
	 * Walk a parsed block tree and migrate every gallery block found, at any
	 * depth — a gallery can sit inside Columns, Group, or any other container.
	 *
	 * @param array<int,array<string,mixed>> $blocks  Parsed blocks, by reference.
	 * @param bool                           $changed Set true if anything was migrated.
	 * @return void
	 */
	private static function migrate_blocks( array &$blocks, bool &$changed ): void {
		foreach ( $blocks as &$block ) {
			if ( 'shaped-gallery/gallery' === ( $block['blockName'] ?? '' ) ) {
				self::migrate_block( $block, $changed );
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				self::migrate_blocks( $block['innerBlocks'], $changed );
			}
		}
	}

	/**
	 * Migrate one gallery block: store its verifier, blank its password.
	 *
	 * A no-op for every case that is not "Password mode with a non-empty password
	 * and a `uniqueId` to key the verifier by" — public/private galleries, an
	 * unfinished Password setting with nothing typed yet, and the no-`uniqueId`
	 * edge case {@see legacy_key()} exists for are all left exactly as written.
	 *
	 * @param array<string,mixed> $block   Parsed block, by reference.
	 * @param bool                $changed Set true if this block was migrated.
	 * @return void
	 */
	private static function migrate_block( array &$block, bool &$changed ): void {
		$visibility = $block['attrs']['advanced']['visibility'] ?? null;

		if ( ! is_array( $visibility ) || 'password' !== ( $visibility['mode'] ?? '' ) ) {
			return;
		}

		$password = (string) ( $visibility['password'] ?? '' );
		if ( '' === $password ) {
			return;
		}

		$unique = sanitize_html_class( (string) ( $block['attrs']['uniqueId'] ?? '' ) );
		if ( '' === $unique ) {
			return;
		}

		update_option( self::verifier_option( $unique ), self::token( $unique, $password ), false );

		$block['attrs']['advanced']['visibility']['password'] = '';
		$changed = true;
	}

	/**
	 * The unlock token for a gallery + password pair.
	 *
	 * Keyed with the site's salts, so it is worthless on any other install, and
	 * bound to the gallery key, so unlocking one gallery cannot unlock another that
	 * happens to share a password.
	 *
	 * @param string $key      Gallery key.
	 * @param string $password Password.
	 * @return string
	 */
	private static function token( string $key, string $password ): string {
		return wp_hash( 'shaped-gallery-pwd|' . $key . '|' . $password );
	}

	/**
	 * Whether the last redirect reported a wrong password for THIS gallery.
	 *
	 * Scoped by key so a page carrying two locked galleries only ever shows the
	 * error on the one that was actually submitted.
	 *
	 * @param string $key Gallery key.
	 * @return bool
	 */
	private static function has_error( string $key ): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only display flag; it selects a message, nothing else.
		$flag = isset( $_GET[ self::ERROR_ARG ] ) ? sanitize_html_class( (string) wp_unslash( $_GET[ self::ERROR_ARG ] ) ) : '';

		return '' !== $flag && $flag === $key;
	}

	/**
	 * Where to send the visitor after a submission.
	 *
	 * Back to the page they were on, with the error flag added or removed, and with
	 * the gallery as the fragment so they land on it rather than at the top of a
	 * long page.
	 *
	 * @param string $key      Gallery key.
	 * @param bool   $unlocked Whether the password was correct.
	 * @return string
	 */
	private static function redirect_url( string $key, bool $unlocked ): string {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
		$uri = remove_query_arg( self::ERROR_ARG, $uri );

		if ( ! $unlocked ) {
			$uri = add_query_arg( self::ERROR_ARG, $key, $uri );
		}

		return esc_url_raw( $uri ) . '#' . rawurlencode( $key );
	}

	/**
	 * Whether this address has failed too often on this gallery to keep guessing.
	 *
	 * The form is public and unauthenticated, so blind guessing — not CSRF — is its
	 * real exposure. `REMOTE_ADDR` only: a proxy header is attacker-controlled, and
	 * a throttle keyed on a value the attacker picks is not a throttle. Behind a
	 * reverse proxy that means one bucket for the whole proxy, which is why the cap
	 * is generous and the window short.
	 *
	 * @param string $key Gallery key.
	 * @return bool
	 */
	private static function throttled( string $key ): bool {
		return (int) get_transient( self::attempt_key( $key ) ) >= self::MAX_ATTEMPTS;
	}

	/**
	 * Count one failed attempt.
	 *
	 * @param string $key Gallery key.
	 * @return void
	 */
	private static function record_attempt( string $key ): void {
		$name = self::attempt_key( $key );

		set_transient( $name, (int) get_transient( $name ) + 1, self::THROTTLE_TTL );
	}

	/**
	 * Forget the failures for an address that has now succeeded.
	 *
	 * @param string $key Gallery key.
	 * @return void
	 */
	private static function clear_attempts( string $key ): void {
		delete_transient( self::attempt_key( $key ) );
	}

	/**
	 * Transient name for one gallery + address failure counter.
	 *
	 * Hashed rather than concatenated: a raw address in an option name would put
	 * visitor IPs in the options table in the clear.
	 *
	 * @param string $key Gallery key.
	 * @return string
	 */
	private static function attempt_key( string $key ): string {
		$address = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) wp_unslash( $_SERVER['REMOTE_ADDR'] ) : '';

		return self::THROTTLE_PREFIX . substr( wp_hash( $key . '|' . $address ), 0, 24 );
	}

	/**
	 * The challenge form.
	 *
	 * A real `<form>` with a real `<label>` and a real submit button — no
	 * click-handler div, and operable with JavaScript off, which matters more here
	 * than anywhere else in the plugin: this is the only thing standing between the
	 * visitor and the content.
	 *
	 * The action is empty, i.e. "this URL", so the form survives whatever permalink,
	 * query string or pagination the gallery is embedded under.
	 *
	 * @param string $key   Gallery key.
	 * @param bool   $error Whether to show the wrong-password message.
	 * @return string
	 */
	private static function form( string $key, bool $error ): string {
		$field_id = $key . '-password';

		$markup = sprintf(
			'<div class="sp-shaped-gallery-password" id="%s">',
			esc_attr( $key )
		);

		$markup .= '<form class="sp-shaped-gallery-password__form" method="post" action="">';

		$markup .= sprintf(
			'<p class="sp-shaped-gallery-password__text">%s</p>',
			esc_html__( 'This gallery is password protected. Enter the password to view it.', 'easy-lightbox-wp' )
		);

		if ( $error ) {
			$markup .= sprintf(
				'<p class="sp-shaped-gallery-password__error" role="alert">%s</p>',
				esc_html__( 'That password was not correct. Please try again.', 'easy-lightbox-wp' )
			);
		}

		$markup .= sprintf(
			'<input type="hidden" name="%s" value="%s" />',
			esc_attr( self::ID_FIELD ),
			esc_attr( $key )
		);

		$markup .= sprintf(
			'<label class="sp-shaped-gallery-password__label" for="%s">%s</label>',
			esc_attr( $field_id ),
			esc_html__( 'Password', 'easy-lightbox-wp' )
		);

		$markup .= sprintf(
			'<input class="sp-shaped-gallery-password__field" type="password" id="%s" name="%s" autocomplete="off" spellcheck="false" required />',
			esc_attr( $field_id ),
			esc_attr( self::FIELD )
		);

		$markup .= sprintf(
			'<button class="sp-shaped-gallery-password__submit" type="submit">%s</button>',
			esc_html__( 'Submit', 'easy-lightbox-wp' )
		);

		$markup .= '</form></div>';

		return $markup;
	}
}

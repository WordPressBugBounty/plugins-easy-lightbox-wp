<?php
/**
 * Gallery option normalizer.
 *
 * Turns raw (untrusted) block attributes into a validated, fully-defaulted array
 * the renderer can consume without further guards. This is the "option
 * processing" concern, kept separate from markup (LayoutRenderer) and styling
 * (Render\Css\StyleEngine).
 *
 * Defaults come from {@see GalleryAttributesFactory::defaults()} — the single
 * source (CLAUDE.md §7) — so a default is declared once. This class only adds
 * the validation the schema can't express: enum allow-lists, numeric/boolean
 * casts and responsive-object merges.
 *
 * @package ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes
 */

namespace ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes;

use ShapedPlugin\ShapedGallery\Includes\Functions;
use ShapedPlugin\ShapedGallery\Modules\ImageCustomUrl as ImageCustomUrlModule;
use ShapedPlugin\ShapedGallery\Modules\Lightbox as LightboxModule;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Validates + defaults gallery attributes for rendering.
 */
final class GalleryOptions {

	/**
	 * Layout allow-list (mirrors Functions::layouts() and the JS LAYOUTS set).
	 */
	public const LAYOUTS = array( 'justified', 'grid', 'masonry' );

	/**
	 * Image Resolution allow-list (mirrors the Settings-tab Resolution select).
	 * Each value is a registered WordPress image size name, forwarded to the
	 * provider as a `size` fetch argument (see LayoutRenderer::provider_items()).
	 */
	public const RESOLUTIONS = array( 'thumbnail', 'medium', 'large', 'full' );

	/**
	 * Advanced → Visibility: the Hide on <device> flag → wrapper class map.
	 *
	 * A data map rather than four `if`s in the renderer (§11), because this table is
	 * the seam of a feature that spans three languages: the class is printed here,
	 * hidden by a media query in `app/blocks/gallery/style.scss`, and mirrored for
	 * the editor canvas by `app/lib/visibility.js`. Naming it once means
	 * `tests/php/verify-visibility.php` can assert that every class this emits has a
	 * rule to match — a renamed class used to leave the option switched on, printed,
	 * and doing nothing at all.
	 */
	public const HIDE_CLASSES = array(
		'hideDesktop'         => 'sp-shaped-gallery-hide-desktop',
		'hideTablet'          => 'sp-shaped-gallery-hide-tablet',
		'hideMobilePortrait'  => 'sp-shaped-gallery-hide-mobile-portrait',
		'hideMobileLandscape' => 'sp-shaped-gallery-hide-mobile-landscape',
	);

	/**
	 * Responsive Visibility classes for one gallery's wrapper.
	 *
	 * Reads the raw attributes rather than the normalized ones so the shortcode,
	 * the block and any future caller can ask the same question without having to
	 * normalize first; `! empty()` is the same coercion `normalize_advanced()`
	 * applies, so the two cannot disagree about what "on" means.
	 *
	 * @param array<string,mixed> $attrs Gallery attributes (raw or normalized).
	 * @return string[] Wrapper classes, in declaration order; empty when the
	 *                  gallery is visible everywhere.
	 */
	public static function hidden_classes( array $attrs ): array {
		$visibility = $attrs['advanced']['visibility'] ?? array();

		if ( ! is_array( $visibility ) ) {
			return array();
		}

		$classes = array();
		foreach ( self::HIDE_CLASSES as $flag => $class ) {
			if ( ! empty( $visibility[ $flag ] ) ) {
				$classes[] = $class;
			}
		}

		return $classes;
	}

	/**
	 * Normalize raw block attributes.
	 *
	 * Returns exactly the keys the renderer consumes, each validated and given
	 * the factory default when missing or invalid.
	 *
	 * @param array<string,mixed> $a Raw attributes.
	 * @return array<string,mixed> Normalized attributes.
	 */
	public static function normalize( array $a ): array {
		$d = GalleryAttributesFactory::defaults();

		return array(
			'uniqueId'       => isset( $a['uniqueId'] ) ? (string) $a['uniqueId'] : (string) $d['uniqueId'],
			// The gallery CPT id the render path is currently serving, injected by
			// Gallery::render() from its render-context fallback when the block's own
			// attribute is unset. Absent from this list until now, which is why the
			// pagination debug comment always read `gallery=0` (CLAUDE.md §18: no
			// downstream guard should be needed once normalize() carries a key through).
			'galleryId'      => absint( $a['galleryId'] ?? $d['galleryId'] ?? 0 ),
			'layout'         => self::enum( $a['layout'] ?? null, self::LAYOUTS, $d['layout'] ),
			'provider'       => isset( $a['provider'] ) ? sanitize_key( $a['provider'] ) : $d['provider'],
			'items'          => isset( $a['items'] ) && is_array( $a['items'] ) ? $a['items'] : $d['items'],
			'rowHeightMode'  => isset( $a['rowHeightMode'] ) && 'custom' === $a['rowHeightMode'] ? 'custom' : $d['rowHeightMode'],
			'maxRowHeight'   => isset( $a['maxRowHeight'] ) ? (int) $a['maxRowHeight'] : (int) $d['maxRowHeight'],
			'columns'        => self::responsive_clamped_int( $a['columns'] ?? null, $d['columns'], 1, 8 ),
			'horizontalGap'  => self::responsive( $a['horizontalGap'] ?? null, $d['horizontalGap'] ),
			'verticalGap'    => self::responsive( $a['verticalGap'] ?? null, $d['verticalGap'] ),
			// Per-item margin (the Image & Video Style tab's global Margin) — a
			// responsive box model consumed as `--sp-shaped-gallery-iv-mg*`.
			'margin'         => self::responsive( $a['margin'] ?? null, $d['margin'] ),
			// Item order. Absent from this list until now, which is why the Layout
			// Settings "Order" control had no effect whatever it was set to: the value
			// was dropped here before anything could read it.
			'order'          => self::enum( $a['order'] ?? null, array( 'default', 'random' ), $d['order'] ),
			'clickAction'    => self::enum( $a['clickAction'] ?? null, array( 'lightbox', 'url', 'none' ), $d['clickAction'] ),
			// Image & Video Settings. Media behaviour (resolution / loading / video)
			// validated as markup; the per-state Style-tab sub-objects pass through
			// and are sanitized at CSS-emit time.
			'imageVideo'     => self::normalize_image_video( $a['imageVideo'] ?? null, (array) $d['imageVideo'] ),

			// Content Settings (image title / description). The render-critical
			// fields are validated (enums, the HTML tag, booleans); the Style-tab
			// sub-objects pass through and are sanitized at CSS-emit time.
			'content'        => self::normalize_content( $a['content'] ?? null, (array) $d['content'] ),

			// Ajax Pagination (Load More). Behaviour text validated; responsive counts
			// merged; the Style-tab sub-object passes through, sanitized at CSS-emit
			// time (AjaxStyle).
			'ajaxPagination' => self::normalize_ajax_pagination( $a['ajaxPagination'] ?? null, (array) $d['ajaxPagination'] ),
			// Advanced Settings (background, padding, margin, visibility, custom CSS class/ID).
			'advanced'       => self::normalize_advanced( $a['advanced'] ?? null, (array) $d['advanced'] ),
		);
	}

	/**
	 * Normalize the grouped `content` object.
	 *
	 * Starts from the factory defaults (so every Style-tab sub-key is present),
	 * then validates the fields the renderer consumes as markup: the title/
	 * description toggles + sources, the HTML tag (allow-listed — it is echoed as
	 * an element name), the display style, position and alignment. Responsive
	 * scalars are coerced to arrays. Style sub-objects pass through unchanged and
	 * are neutralized against injection when emitted as CSS ({@see CssHelpers}).
	 *
	 * @param mixed               $raw      Raw content object (or null).
	 * @param array<string,mixed> $defaults Factory content defaults.
	 * @return array<string,mixed>
	 */
	private static function normalize_content( $raw, array $defaults ): array {
		$c = array_merge( $defaults, is_array( $raw ) ? $raw : array() );

		$c['imageTitle']             = ! empty( $c['imageTitle'] );
		$c['imageDescription']       = ! empty( $c['imageDescription'] );
		$c['imageTitleSource']       = self::enum( $c['imageTitleSource'] ?? null, array( 'title', 'caption' ), 'caption' );
		$c['imageTitleTag']          = self::enum( $c['imageTitleTag'] ?? null, array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span' ), 'h4' );
		$c['imageDescriptionSource'] = self::enum( $c['imageDescriptionSource'] ?? null, array( 'caption', 'description' ), 'description' );
		$c['displayStyle']           = self::enum( $c['displayStyle'] ?? null, array( 'classic', 'overlay' ), 'classic' );
		$c['position']               = self::enum( $c['position'] ?? null, array( 'top', 'bottom' ), 'bottom' );
		$c['alignment']              = self::enum( $c['alignment'] ?? null, array( 'left', 'center', 'right' ), 'left' );

		if ( ! is_array( $c['descriptionLimit'] ?? null ) ) {
			$c['descriptionLimit'] = $defaults['descriptionLimit'];
		}
		if ( ! is_array( $c['titleToDescGap'] ?? null ) ) {
			$c['titleToDescGap'] = $defaults['titleToDescGap'];
		}

		return $c;
	}

	/**
	 * Normalize the grouped `imageVideo` object (Image & Video Settings panel).
	 *
	 * Starts from the factory defaults (so every Style-tab sub-key is present),
	 * then validates the fields the renderer + runtime consume as behaviour: the
	 * image resolution (a registered WP image size name, forwarded to the provider
	 * as a `size` fetch arg), the loading boolean, the video play mode and autoplay
	 * flag, and the play-icon size — clamped to its control's range so a tampered
	 * value can't emit an absurd icon.
	 *
	 * The per-state `style.{normal,hover}` sub-objects (border / radius / shadow)
	 * pass through unchanged and are neutralized against injection when emitted as
	 * CSS ({@see \ShapedPlugin\ShapedGallery\Render\Css\Contributors\ImageVideoStyle})
	 * — the same validate-what-becomes-markup / pass-through-what-becomes-CSS split
	 * as the content and ajaxPagination objects.
	 *
	 * @param mixed               $raw      Raw imageVideo object (or null).
	 * @param array<string,mixed> $defaults Factory imageVideo defaults.
	 * @return array<string,mixed>
	 */
	private static function normalize_image_video( $raw, array $defaults ): array {
		$iv = array_merge( $defaults, is_array( $raw ) ? $raw : array() );

		$iv['resolution']    = self::enum( $iv['resolution'] ?? null, self::RESOLUTIONS, $defaults['resolution'] );
		$iv['videoPlayMode'] = self::enum( $iv['videoPlayMode'] ?? null, array( 'inline', 'popup' ), $defaults['videoPlayMode'] );

		// Booleans that default to true keep their default when the key is absent;
		// the opt-in flags are a plain truthiness test.
		$iv['lazyLoad']           = isset( $iv['lazyLoad'] ) ? (bool) $iv['lazyLoad'] : (bool) $defaults['lazyLoad'];
		$iv['autoplay']           = isset( $iv['autoplay'] ) ? (bool) $iv['autoplay'] : (bool) $defaults['autoplay'];
		$iv['imagePreloader']     = ! empty( $iv['imagePreloader'] );
		$iv['displayIconOnHover'] = ! empty( $iv['displayIconOnHover'] );

		// Clamped to the inspector control's own range (12-120 px).
		$iv['playIconSize'] = isset( $iv['playIconSize'] )
			? max( 12, min( 120, (int) $iv['playIconSize'] ) )
			: (int) $defaults['playIconSize'];

		/*
		 * Per-state style bundles pass through (sanitized at CSS-emit time), but they
		 * are MERGED over their defaults rather than substituted for them.
		 *
		 * A stored state is whatever the panel last wrote, and the panel writes the
		 * whole state object it happens to be holding — so a state saved before a
		 * sub-key existed simply has no such key, and substituting it wholesale left
		 * that key undefined at render time. Box Shadow is where that surfaced: the
		 * shipped default is now a drawable shadow
		 * ({@see AttributeGenerators::box_shadow()}), and without this merge a gallery
		 * saved by an earlier build would keep its key-less bundle for ever and the
		 * enable toggle would go on doing nothing. Merging honours the docblock's own
		 * promise — "every Style-tab sub-key is present" — for the nested states too,
		 * not just the top level.
		 *
		 * `boxShadow` is merged one level deeper because it is the one bundle whose
		 * default MATTERS rather than merely existing: a colourless bundle emits no CSS
		 * at all, so an old `{ unit: 'outset' }` has to pick the default colour and
		 * offsets up. Nothing else here has a default that changes whether the control
		 * works, so nothing else needs the extra level.
		 */
		$style       = is_array( $iv['style'] ?? null ) ? $iv['style'] : array();
		$iv['style'] = array();
		foreach ( array( 'normal', 'hover' ) as $state ) {
			$state_defaults = (array) ( $defaults['style'][ $state ] ?? array() );
			$stored         = is_array( $style[ $state ] ?? null ) ? $style[ $state ] : array();
			$merged         = array_merge( $state_defaults, $stored );

			$merged['boxShadow'] = array_merge(
				(array) ( $state_defaults['boxShadow'] ?? array() ),
				is_array( $merged['boxShadow'] ?? null ) ? $merged['boxShadow'] : array()
			);

			$iv['style'][ $state ] = $merged;
		}

		return $iv;
	}

	/**
	 * Whether the image preloader is active for this gallery.
	 *
	 * True only when lazy loading is on AND the preloader is enabled: a preloader
	 * placeholder is meaningless for eager images, which are already decoded before
	 * first paint.
	 *
	 * Shared by the markup (container modifier class) and the frontend runtime so
	 * the gate can never drift between them; mirrored in
	 * app/lib/style/image-video-vars.js.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return bool
	 */
	public static function preloader_active( array $attrs ): bool {
		// Built on lazy_load_active(), not on the raw attribute: the placeholder exists
		// to cover the gap while a deferred image arrives, so with nothing deferred
		// there is no gap to cover and the class would be a permanent grey box behind
		// an image that was already there.
		return self::lazy_load_active( $attrs )
			&& ! empty( $attrs['imageVideo']['imagePreloader'] );
	}

	/**
	 * Whether this gallery defers its images.
	 *
	 * The attribute defaults TRUE and the free build gives it no control of its own,
	 * so in practice this reads "yes". It stays a predicate rather than a literal
	 * because the renderer, the preloader gate and the editor mirror must all ask the
	 * same question in one place.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return bool
	 */
	public static function lazy_load_active( array $attrs ): bool {
		return ! empty( $attrs['imageVideo']['lazyLoad'] );
	}

	/**
	 * Whether images ship responsive candidates, i.e. Settings → Advanced Controls →
	 * **Retina Images** (`retinaImages`, default ON).
	 *
	 * The odd one out among the predicates here: it takes no `$attrs`, because this is a
	 * site-wide delivery decision with no per-gallery half to combine with. It lives
	 * beside them anyway — the renderer already asks this class "is this feature on", and
	 * {@see lazy_load_active()} already reads a global from here, so a fifth `Core\*`
	 * class holding one predicate would be structure without substance.
	 *
	 * **What "retina" means here is a `w`-descriptor `srcset` plus a `sizes` hint**, not
	 * a hand-built `1x, 2x` pair. Given both, a browser multiplies the CSS width it
	 * computes from `sizes` by the display's pixel ratio and picks the candidate that
	 * covers it — so one attribute pair serves 1×, 2× and 3× screens, and accounts for
	 * the viewport at the same time. (The sibling plugins build a two-entry `x`
	 * descriptor set through their own resize service; there is nothing to port, this is
	 * the stronger form.)
	 *
	 * Switching it OFF is a real trade rather than a no-op: the attributes are omitted,
	 * AND the provider stops computing them, which is two attachment-meta lookups per
	 * image per render that a site with very large galleries may prefer not to pay.
	 *
	 * `rest_sanitize_boolean()` because a row written by WP-CLI can hold the string
	 * `'0'` or `'false'`, both of which are truthy to a bare cast. A missing key defaults
	 * ON — the shipped value, and the one that costs a visitor nothing.
	 *
	 * @return bool
	 */
	public static function retina_active(): bool {
		$enabled = rest_sanitize_boolean( Functions::get_setting( 'retinaImages', true ) );

		/**
		 * Filter whether gallery images ship responsive `srcset`/`sizes` candidates.
		 *
		 * @since 1.0.0
		 *
		 * @param bool $enabled Whether retina delivery is on.
		 */
		return (bool) apply_filters( 'shaped_gallery_retina_images', $enabled );
	}

	/**
	 * Whether videos play inline (in the tile) rather than in the video popup.
	 *
	 * Shared by the markup (an inline video gets a click-to-play button, never a
	 * lightbox link) and the frontend runtime (which swaps the poster for a playing
	 * `<video>` on click).
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return bool
	 */
	public static function video_inline( array $attrs ): bool {
		return 'inline' === ( $attrs['imageVideo']['videoPlayMode'] ?? 'inline' );
	}

	/**
	 * Whether videos play in the video popup rather than in the tile.
	 *
	 * Video Play Mode alone decides it. The popup is the Image & Video runtime's own
	 * player (`app/frontend/media.js`), not the lightbox: it answers to neither the
	 * click action nor the Lightbox module, so a Popup video opens the same way on a
	 * gallery whose images open the lightbox, follow a URL or do nothing — and a
	 * video appended by Load More plays exactly as one rendered with the page.
	 *
	 * Shared by the markup (the video's click-to-play button and the container's
	 * `data-video`) and the runtime that reads it.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return bool
	 */
	public static function video_popup( array $attrs ): bool {
		return 'popup' === ( $attrs['imageVideo']['videoPlayMode'] ?? 'inline' );
	}

	/**
	 * Normalize the grouped `ajaxPagination` object.
	 *
	 * Starts from the factory defaults (so every Style-tab sub-key is present),
	 * then validates the fields the renderer + endpoint consume as behaviour: the
	 * enable boolean, the alignment (allow-listed — it becomes a class name), the
	 * button label and ending message (free text, sanitized at entry), and the
	 * responsive show-per-view count (merged over defaults). `showPerView` alone
	 * sizes both the initial view and each Load More page. The `style` sub-object
	 * passes through unchanged and is neutralized against injection when emitted as
	 * CSS ({@see \ShapedPlugin\ShapedGallery\Render\Css\Contributors\AjaxStyle}) —
	 * the same validate-what-becomes-markup / pass-through-what-becomes-CSS split as
	 * the content + imageVideo objects.
	 *
	 * @param mixed               $raw      Raw ajaxPagination object (or null).
	 * @param array<string,mixed> $defaults Factory ajaxPagination defaults.
	 * @return array<string,mixed>
	 */
	private static function normalize_ajax_pagination( $raw, array $defaults ): array {
		$p = array_merge( $defaults, is_array( $raw ) ? $raw : array() );

		$p['enable']    = ! empty( $p['enable'] );
		$p['alignment'] = self::enum( $p['alignment'] ?? null, array( 'left', 'center', 'right' ), 'center' );

		$p['buttonLabel']   = isset( $p['buttonLabel'] ) ? sanitize_text_field( (string) $p['buttonLabel'] ) : '';
		$p['endingMessage'] = isset( $p['endingMessage'] ) ? sanitize_text_field( (string) $p['endingMessage'] ) : '';

		$p['showPerView'] = self::responsive( $p['showPerView'] ?? null, $defaults['showPerView'] );

		if ( ! is_array( $p['style'] ?? null ) ) {
			$p['style'] = $defaults['style'];
		}

		return $p;
	}

	/**
	 * Normalize the grouped `advanced` object.
	 *
	 * @param mixed               $raw      Raw advanced object (or null).
	 * @param array<string,mixed> $defaults Factory advanced defaults.
	 * @return array<string,mixed>
	 */
	private static function normalize_advanced( $raw, array $defaults ): array {
		$adv = array_merge( $defaults, is_array( $raw ) ? $raw : array() );

		// Normalize visibility sub-object.
		if ( isset( $adv['visibility'] ) && is_array( $adv['visibility'] ) ) {
			$v                 = $adv['visibility'];
			$v_def             = $defaults['visibility'];
			$adv['visibility'] = array(
				'mode'                => self::enum( $v['mode'] ?? null, array( 'public', 'password', 'private' ), $v_def['mode'] ),
				'password'            => isset( $v['password'] ) ? sanitize_text_field( (string) $v['password'] ) : $v_def['password'],
				'hideDesktop'         => ! empty( $v['hideDesktop'] ),
				'hideTablet'          => ! empty( $v['hideTablet'] ),
				'hideMobilePortrait'  => ! empty( $v['hideMobilePortrait'] ),
				'hideMobileLandscape' => ! empty( $v['hideMobileLandscape'] ),
			);
		} else {
			$adv['visibility'] = $defaults['visibility'];
		}

		// Two hooks for CSS written elsewhere, sanitized to what each is allowed to
		// be: a class list is free text, an id is a single key. Both are printed as
		// attributes by `Gallery::render()` and escaped again there.
		$adv['customCssClass'] = isset( $adv['customCssClass'] ) ? sanitize_text_field( (string) $adv['customCssClass'] ) : '';
		$adv['customCssId']    = isset( $adv['customCssId'] ) ? sanitize_key( (string) $adv['customCssId'] ) : '';

		return $adv;
	}

	/**
	 * Whether Ajax Pagination is active for this gallery.
	 *
	 * Shared by the markup (LayoutRenderer), the styling (AjaxStyle contributor) and
	 * the REST endpoint so the gate can never drift between them.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return bool
	 */
	public static function ajax_active( array $attrs ): bool {
		return ! empty( $attrs['ajaxPagination']['enable'] );
	}

	/**
	 * Resolve a responsive scalar bundle to a positive int for a device.
	 *
	 * The server mirror of the frontend `resolveResponsive`/`pickResponsive`
	 * (app/lib/responsive.js): read the device slot, fall back to desktop, then to
	 * `$fallback`. Used to resolve the per-view / per-click window sizes for the
	 * requested device (SSR + the windowing endpoint) so JS and PHP agree.
	 *
	 * @param mixed  $bundle   Responsive scalar bundle ({desktop,tablet,mobile}).
	 * @param string $device   desktop|tablet|mobile.
	 * @param int    $fallback Fallback when unset/non-numeric.
	 * @return int Positive integer (>= 1).
	 */
	public static function responsive_int( $bundle, string $device, int $fallback ): int {
		if ( is_array( $bundle ) ) {
			$value = $bundle[ $device ] ?? ( $bundle['desktop'] ?? null );
			if ( is_numeric( $value ) ) {
				return max( 1, (int) $value );
			}
		}
		return max( 1, $fallback );
	}

	/**
	 * Whether clicking a tile in this gallery opens the lightbox.
	 *
	 * The gallery has to ask for it AND the Lightbox module has to be switched on
	 * in Settings → Modules. With the module off the anchor stays in the markup and
	 * simply behaves as what it already is — a link to the full-size file — which is
	 * the same graceful degradation a no-JS visitor gets, so turning the module off
	 * can never leave a gallery with dead tiles.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return bool
	 */
	public static function lightbox_active( array $attrs ): bool {
		return 'lightbox' === ( $attrs['clickAction'] ?? '' ) && LightboxModule::is_enabled();
	}

	/**
	 * Whether clicking a tile in this gallery follows a custom, per-item URL.
	 *
	 * The same shape as {@see lightbox_active()} one click-action value over: the
	 * gallery asks for `clickAction: 'url'` and the Image Custom URL module answers.
	 * With the module off, `render_item()`'s `'url' === $click` branch never fires —
	 * every tile falls through to a plain, unlinked image — the same fail-safe
	 * direction every module switch here degrades in. The per-item `link` values
	 * themselves are untouched either way; only whether they are ever READ changes.
	 *
	 * @param array<string,mixed> $attrs Normalized attributes.
	 * @return bool
	 */
	public static function custom_url_active( array $attrs ): bool {
		return 'url' === ( $attrs['clickAction'] ?? '' ) && ImageCustomUrlModule::is_enabled();
	}

	/**
	 * Return $value when it is in the allow-list, else the default.
	 *
	 * @param mixed            $value   Candidate value (null when the attribute is absent).
	 * @param array<int,mixed> $allowed Allow-list.
	 * @param mixed            $default Fallback value.
	 * @return mixed
	 */
	private static function enum( $value, array $allowed, $default ) {
		return null !== $value && in_array( $value, $allowed, true ) ? $value : $default;
	}

	/**
	 * Merge a responsive value object over its defaults.
	 *
	 * @param mixed $value    Raw value ({desktop,tablet,mobile[,unit]}) or null/non-array.
	 * @param mixed $defaults Default bundle from the factory.
	 * @return array<string,mixed>
	 */
	private static function responsive( $value, $defaults ): array {
		$defaults = is_array( $defaults ) ? $defaults : array();
		if ( ! is_array( $value ) ) {
			return $defaults;
		}
		return array_merge( $defaults, $value );
	}

	/**
	 * Merge a responsive value object over its defaults, casting each device slot to
	 * a clamped int.
	 *
	 * Track counts feed `repeat()`,
	 * so an out-of-range value would break the grid rather than just look wrong.
	 *
	 * @param mixed $value    Raw value ({desktop,tablet,mobile}) or null/non-array.
	 * @param mixed $defaults Default bundle from the factory.
	 * @param int   $min      Lowest allowed value.
	 * @param int   $max      Highest allowed value.
	 * @return array<string,int>
	 */
	private static function responsive_clamped_int( $value, $defaults, int $min, int $max ): array {
		$merged = self::responsive( $value, $defaults );
		foreach ( $merged as $device => $slot ) {
			$merged[ $device ] = max( $min, min( $max, (int) $slot ) );
		}
		return $merged;
	}
}

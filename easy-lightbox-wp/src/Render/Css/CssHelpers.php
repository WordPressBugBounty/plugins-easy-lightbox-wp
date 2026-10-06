<?php
/**
 * CSS helper toolkit — the PHP side of the shared dynamic-CSS primitives
 * (mirrors app/lib/css-helpers.js). Small, pure string builders used by the
 * StyleEngine and its contributors so CSS-building logic lives in one place
 * instead of being hand-rolled inside the renderer.
 *
 * @package ShapedPlugin\ShapedGallery
 */

namespace ShapedPlugin\ShapedGallery\Render\Css;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Stateless CSS string helpers.
 */
final class CssHelpers {

	/**
	 * Join a flat property => value map into a CSS declaration string.
	 *
	 * Used to build the container's inline custom-property list, e.g.
	 * `array( '--sp-shaped-gallery-cols' => 4, '--sp-shaped-gallery-gh' => '8px' )` becomes
	 * `--sp-shaped-gallery-cols:4;--sp-shaped-gallery-gh:8px;`. Each value is run through {@see css_value()}
	 * (which strips the `;{}` characters that could break out of the
	 * declaration) and empty values are skipped; the final attribute is then
	 * escaped with esc_attr() at render (LayoutRenderer::build_attrs()).
	 *
	 * @param array<string,int|float|string> $declarations Property => value map.
	 * @return string CSS declaration string ("k:v;k:v;"), empty when no declarations.
	 */
	public static function declarations( array $declarations ): string {
		$css = '';
		foreach ( $declarations as $property => $value ) {
			$value = self::css_value( $value );
			if ( '' === $value ) {
				continue;
			}
			$css .= $property . ':' . $value . ';';
		}
		return $css;
	}

	/**
	 * Neutralize a CSS value against injection.
	 *
	 * `;`, `{` and `}` can never appear in a single valid CSS value, so stripping
	 * them prevents an editor-supplied value (colour, gradient, font family, …)
	 * from breaking out of its declaration or rule. Mirrors the guard in Woo
	 * Product Slider Pro's `object_to_css_string`.
	 *
	 * @param int|float|string $value Raw value.
	 * @return string Sanitized value.
	 */
	public static function css_value( $value ): string {
		return trim( str_replace( array( ';', '{', '}' ), '', (string) $value ) );
	}

	/**
	 * Resolve a four-side spacing bundle into a CSS "T R B L" string.
	 *
	 * Handles both the plugin's shapes:
	 *  - responsive box model: `{ desktop:{top,right,bottom,left}, tablet:{…},
	 *    mobile:{…}, unit }` — reads the requested `$device` slot;
	 *  - non-responsive spacing: `{ value:{top,right,bottom,left}, unit }` — used
	 *    by border width / radius.
	 * Empty sides render as `0`. Returns '' when every side is empty (so an
	 * untouched control contributes no CSS). `$unit` may be a scalar or a
	 * per-device map. Linked sides are already written equal by the control, so
	 * the four-side form is always correct.
	 *
	 * @param array<string,mixed> $attr   Spacing bundle.
	 * @param string              $device desktop|tablet|mobile.
	 * @return string CSS shorthand or ''.
	 */
	public static function spacing_value( array $attr, string $device = 'desktop' ): string {
		if ( empty( $attr ) ) {
			return '';
		}

		$unit = 'px';
		if ( isset( $attr['unit'] ) ) {
			$unit = is_array( $attr['unit'] ) ? ( $attr['unit'][ $device ] ?? 'px' ) : $attr['unit'];
		}

		if ( isset( $attr[ $device ] ) && is_array( $attr[ $device ] ) ) {
			$sides = $attr[ $device ];
		} elseif ( isset( $attr['value'] ) && is_array( $attr['value'] ) ) {
			$sides = $attr['value'];
		} else {
			return '';
		}

		$top    = $sides['top'] ?? '';
		$right  = $sides['right'] ?? '';
		$bottom = $sides['bottom'] ?? '';
		$left   = $sides['left'] ?? '';

		if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
			return '';
		}

		$side = static function ( $v ) use ( $unit ) {
			return ( '' !== $v ? $v : '0' ) . $unit;
		};

		return $side( $top ) . ' ' . $side( $right ) . ' ' . $side( $bottom ) . ' ' . $side( $left );
	}

	/**
	 * Resolve a `{ style, solid, gradient }` background bundle to a CSS value.
	 *
	 * @param array<string,mixed> $background Background bundle.
	 * @return string CSS colour / gradient, or '' when unset.
	 */
	public static function background_value( array $background ): string {
		$style = (string) ( $background['style'] ?? '' );
		if ( 'gradient' === $style ) {
			return (string) ( $background['gradient'] ?? '' );
		}
		if ( 'solid' === $style || ( '' === $style && ! empty( $background['solid'] ) ) ) {
			return (string) ( $background['solid'] ?? '' );
		}
		if ( '' === $style && ! empty( $background['gradient'] ) ) {
			return (string) ( $background['gradient'] ?? '' );
		}
		return '';
	}

	/**
	 * Resolve a BoxShadow bundle into a CSS `box-shadow` value.
	 *
	 * The shared BoxShadow control's shape (see app/components/boxShadow):
	 * `{ value: { top, right, bottom, left }, unit: 'inset'|'outset', color, hoverColor }`
	 * where `top` = X offset, `right` = Y offset, `bottom` = blur, `left` = spread —
	 * all in px — and `unit` selects the shadow's inset/outset keyword rather than a
	 * length unit. Empty offsets render as `0`. Returns '' when no colour is set, so
	 * an enabled-but-uncoloured shadow contributes no CSS instead of a black default.
	 *
	 * @param array<string,mixed> $shadow    Shadow bundle.
	 * @param string              $color_key Colour key to read ('color'|'hoverColor').
	 * @return string CSS box-shadow value, or ''.
	 */
	public static function box_shadow_value( array $shadow, string $color_key = 'color' ): string {
		$select_default = (string) ( $shadow['selectDefault'] ?? '' );

		if ( '' !== $select_default && 'custom' !== $select_default && str_starts_with( $select_default, 'preset-' ) ) {
			/*
			 * The six tiles the picker offers (Figma node 7:32541), then the five
			 * retired ids that preceded them. `selectDefault` lives in post content,
			 * so dropping a retired id would not merely remove a tile — the saved
			 * gallery would fall through to its own `value`/`color`, which for a
			 * preset-selected bundle is whatever was last typed in Custom mode.
			 * Mirrors `BOX_SHADOW_PRESETS` / `LEGACY_BOX_SHADOW_PRESETS` in
			 * app/lib/box-shadow.js — the two must resolve identically (§18).
			 */
			$presets = array(
				'preset-xs'       => array( 'value' => array( 'top' => '0', 'right' => '1', 'bottom' => '2', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.12)' ),
				'preset-s'        => array( 'value' => array( 'top' => '0', 'right' => '2', 'bottom' => '4', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.14)' ),
				'preset-m'        => array( 'value' => array( 'top' => '0', 'right' => '4', 'bottom' => '6', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.16)' ),
				'preset-l'        => array( 'value' => array( 'top' => '0', 'right' => '8', 'bottom' => '10', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.18)' ),
				'preset-xl'       => array( 'value' => array( 'top' => '0', 'right' => '12', 'bottom' => '17', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.2)' ),
				'preset-sharp'    => array( 'value' => array( 'top' => '6', 'right' => '6', 'bottom' => '0', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.25)' ),

				// Retired — resolvable for stored content, no longer offered.
				'preset-soft'     => array( 'value' => array( 'top' => '0', 'right' => '1', 'bottom' => '3', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.12)' ),
				'preset-medium'   => array( 'value' => array( 'top' => '0', 'right' => '3', 'bottom' => '6', 'left' => '0' ), 'unit' => 'outset', 'color' => '#949494' ),
				'preset-large'    => array( 'value' => array( 'top' => '0', 'right' => '6', 'bottom' => '12', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.18)' ),
				'preset-floating' => array( 'value' => array( 'top' => '0', 'right' => '12', 'bottom' => '20', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.22)' ),
				'preset-outset'   => array( 'value' => array( 'top' => '4', 'right' => '4', 'bottom' => '0', 'left' => '0' ), 'unit' => 'outset', 'color' => 'rgba(0, 0, 0, 0.25)' ),
			);

			if ( isset( $presets[ $select_default ] ) ) {
				return self::box_shadow_value( $presets[ $select_default ], $color_key );
			}
		}

		$color = (string) ( $shadow[ $color_key ] ?? '' );
		if ( '' === trim( $color ) ) {
			return '';
		}

		$sides = is_array( $shadow['value'] ?? null ) ? $shadow['value'] : array();
		$px    = static function ( $v ) {
			return ( '' !== $v && null !== $v ? $v : '0' ) . 'px';
		};

		$offsets = $px( $sides['top'] ?? '' ) . ' ' . $px( $sides['right'] ?? '' )
			. ' ' . $px( $sides['bottom'] ?? '' ) . ' ' . $px( $sides['left'] ?? '' );

		$inset = 'inset' === ( $shadow['unit'] ?? 'outset' ) ? 'inset ' : '';

		return $inset . $offsets . ' ' . $color;
	}

	/**
	 * Resolve a flat responsive scalar (`{ desktop, tablet, mobile }`) to a value
	 * for the given device, with an appended unit. Falls back to the desktop
	 * value. Returns '' when unset.
	 *
	 * @param array<string,mixed> $attr   Responsive scalar bundle.
	 * @param string              $device desktop|tablet|mobile.
	 * @param string              $unit   Unit to append (e.g. 'px'); '' for none.
	 * @return string Value+unit, or ''.
	 */
	public static function responsive_length( array $attr, string $device = 'desktop', string $unit = 'px' ): string {
		$value = $attr[ $device ] ?? ( $attr['desktop'] ?? '' );
		if ( '' === $value || null === $value ) {
			return '';
		}
		return $value . $unit;
	}

	/*
	 * Var-set builders.
	 *
	 * The three shapes every contributor repeats — a responsive scalar across the
	 * device slots, a responsive box model across the device slots, and a
	 * typography bundle — plus the per-state button/chip appearance shared by the
	 * pagination button and the filter items. Extracted so a fourth panel adds a
	 * call, not another copy of the same loop (CLAUDE.md §18).
	 *
	 * PHP emits the FULL responsive set (base + `-t` + `-m`) and lets the
	 * stylesheet's media queries choose; the editor mirrors (app/lib/style/*)
	 * resolve one device and write it into every slot. Only the base var is
	 * suffix-less, so `$var` is always the complete desktop custom-property name.
	 */

	/**
	 * Device slot => var suffix map used by every responsive var set.
	 *
	 * @return array<string,string>
	 */
	public static function device_suffixes(): array {
		return array(
			'desktop' => '',
			'tablet'  => '-t',
			'mobile'  => '-m',
		);
	}

	/**
	 * Emit a responsive scalar across the three device slots.
	 *
	 * @param string              $var    Base custom property (e.g. `--sp-shaped-gallery-fl-fs`).
	 * @param array<string,mixed> $bundle Responsive scalar bundle.
	 * @param string              $unit   Unit to append; '' for unitless.
	 * @return array<string,string> Custom-property => value map (unset slots omitted).
	 */
	public static function length_vars( string $var, array $bundle, string $unit = 'px' ): array {
		$vars = array();
		foreach ( self::device_suffixes() as $device => $suffix ) {
			$value = self::responsive_length( $bundle, $device, $unit );
			if ( '' !== $value ) {
				$vars[ $var . $suffix ] = $value;
			}
		}
		return $vars;
	}

	/**
	 * Emit a responsive four-side box model across the three device slots.
	 *
	 * @param string              $var    Base custom property (e.g. `--sp-shaped-gallery-fl-pad`).
	 * @param array<string,mixed> $bundle Spacing bundle.
	 * @return array<string,string> Custom-property => value map (unset slots omitted).
	 */
	public static function spacing_vars( string $var, array $bundle ): array {
		$vars = array();
		foreach ( self::device_suffixes() as $device => $suffix ) {
			$value = self::spacing_value( $bundle, $device );
			if ( '' !== $value ) {
				$vars[ $var . $suffix ] = $value;
			}
		}
		return $vars;
	}

	/**
	 * Emit the font face properties of a typography bundle.
	 *
	 * Family / weight / style / transform / decoration — none of which is
	 * per-device in any panel, so each emits once.
	 *
	 * Split from {@see font_scale_vars()} so a contributor that interleaves another
	 * property (ContentStyle's text colour) can keep its historic emission order and
	 * therefore its byte-identical CSS. Most callers want {@see typography_vars()}.
	 *
	 * @param string              $prefix Var prefix WITHOUT the trailing property
	 *                                    (e.g. `--sp-shaped-gallery-fl`).
	 * @param array<string,mixed> $typo   Typography bundle ({ family, fontWeight, … }).
	 * @return array<string,string> Custom-property => value map.
	 */
	public static function font_vars( string $prefix, array $typo ): array {
		$vars = array();

		$once = array(
			'ff'  => $typo['family'] ?? '',
			'fw'  => $typo['fontWeight'] ?? '',
			'fst' => ( ! empty( $typo['style'] ) && 'normal' !== $typo['style'] ) ? $typo['style'] : '',
			'tt'  => ( ! empty( $typo['transform'] ) && 'none' !== $typo['transform'] ) ? $typo['transform'] : '',
			'td'  => $typo['decoration'] ?? '',
		);
		foreach ( $once as $suffix => $value ) {
			if ( ! empty( $value ) ) {
				$vars[ "$prefix-$suffix" ] = $value;
			}
		}

		return $vars;
	}

	/**
	 * Emit the measured properties of a typography bundle.
	 *
	 * Font size is responsive (base + `-t`/`-m`); line height (unitless), letter
	 * spacing and word spacing emit desktop-only — the sibling-plugin rule every
	 * contributor follows, so tablet and mobile inherit them.
	 *
	 * @param string              $prefix  Var prefix WITHOUT the trailing property.
	 * @param array<string,mixed> $scalars Responsive scalar bundles, keyed
	 *                                     `fs`|`lh`|`ls`|`ws`.
	 * @return array<string,string> Custom-property => value map.
	 */
	public static function font_scale_vars( string $prefix, array $scalars ): array {
		$vars = self::length_vars( "$prefix-fs", (array) ( $scalars['fs'] ?? array() ), 'px' );

		foreach ( array(
			'lh' => '',
			'ls' => 'px',
			'ws' => 'px',
		) as $suffix => $unit ) {
			$value = self::responsive_length( (array) ( $scalars[ $suffix ] ?? array() ), 'desktop', $unit );
			if ( '' !== $value ) {
				$vars[ "$prefix-$suffix" ] = $value;
			}
		}

		return $vars;
	}

	/**
	 * Emit a complete typography bundle — {@see font_vars()} then
	 * {@see font_scale_vars()}.
	 *
	 * @param string              $prefix  Var prefix WITHOUT the trailing property
	 *                                     (e.g. `--sp-shaped-gallery-fl`).
	 * @param array<string,mixed> $typo    Typography bundle ({ family, fontWeight, … }).
	 * @param array<string,mixed> $scalars Responsive scalar bundles, keyed
	 *                                     `fs`|`lh`|`ls`|`ws`.
	 * @return array<string,string> Custom-property => value map.
	 */
	public static function typography_vars( string $prefix, array $typo, array $scalars = array() ): array {
		return self::font_vars( $prefix, $typo ) + self::font_scale_vars( $prefix, $scalars );
	}

	/**
	 * Emit one state of a button/chip appearance bundle ({@see AttributeGenerators::button_state()}).
	 *
	 * Text colour, background and — only when a border style is actually chosen —
	 * the border style / colour / width. Shared by the Ajax pagination button and
	 * the filter items, which use the same attribute shape.
	 *
	 * @param string              $prefix Var prefix (e.g. `--sp-shaped-gallery-fl`).
	 * @param array<string,mixed> $state  State bundle ({ textColor, background, border, borderWidth }).
	 * @param string              $suffix State suffix ('' for normal, '-hover').
	 * @return array<string,string> Custom-property => value map.
	 */
	public static function button_state_vars( string $prefix, array $state, string $suffix = '' ): array {
		$vars = array();

		$color = $state['textColor'] ?? '';
		if ( '' !== $color ) {
			$vars[ "$prefix-color$suffix" ] = $color;
		}

		$bg = self::background_value( (array) ( $state['background'] ?? array() ) );
		if ( '' !== $bg ) {
			$vars[ "$prefix-bg$suffix" ] = $bg;
		}

		$border = (array) ( $state['border'] ?? array() );
		$style  = $border['style'] ?? 'none';
		if ( 'none' !== $style && '' !== $style ) {
			$vars[ "$prefix-bd-style$suffix" ] = $style;
			if ( ! empty( $border['color'] ) ) {
				$vars[ "$prefix-bd-color$suffix" ] = $border['color'];
			}
			$width = self::spacing_value( (array) ( $state['borderWidth'] ?? array() ) );
			if ( '' !== $width ) {
				$vars[ "$prefix-bd-width$suffix" ] = $width;
			}
		}

		return $vars;
	}
}

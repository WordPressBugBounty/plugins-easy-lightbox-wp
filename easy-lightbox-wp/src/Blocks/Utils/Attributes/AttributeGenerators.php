<?php
/**
 * Attribute generators.
 *
 * Static helpers that build standardized block-attribute schema fragments so
 * the attribute definitions stay modular and DRY. Mirrors the sibling plugins'
 * utility classes (Easy Accordion Pro `EAB_Utils`, Woo Product Slider Pro
 * `AttributeGenerators`), adapted to this plugin's architecture.
 *
 * Two families of helpers:
 *
 *  - Attribute builders return a full `{ type, default }` definition — assign
 *    straight to an attribute key, no wrapping. `string()`, `number()`,
 *    `boolean()`, `arr()`, `object()`, plus the one-call responsive builders
 *    {@see single_responsive()} and {@see responsive_spacing()} (Woo parity).
 *  - Fragment builders return a bare default bundle for nesting inside a grouped
 *    attribute's default map: {@see responsive()}, {@see box_model()},
 *    {@see spacing()}, {@see border()}, {@see background()}, {@see overlay()},
 *    {@see filter()}, {@see typography()}, and the per-state composites.
 *
 * Grouping is why fragment builders exist: unlike the siblings' flat schemas,
 * this block nests responsive values inside grouped object attributes
 * (`imageVideo`, `content`, …), so those inner values must be bare.
 *
 * @package ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes
 */

namespace ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Builds standardized attribute-schema fragments.
 *
 * Params are intentionally untyped: schema defaults are heterogeneous
 * (int / float / string / array) and these builders forward them verbatim.
 * Every method returns an array.
 *
 * > Decision (2026-07-08) — responsive shape is the plugin's flat lowercase
 * > `{ desktop, tablet, mobile[, unit] }` (CLAUDE.md §6.7), NOT the siblings'
 * > capitalized `{ device: { Desktop, … } }`. The `@shaped-gallery/components`
 * > controls read/write the flat shape, so these helpers must emit it.
 */
class AttributeGenerators {

	/**
	 * String attribute definition.
	 *
	 * @param string $value Default value.
	 *
	 * @return array
	 */
	public static function string( $value = '' ): array {
		return array(
			'type'    => 'string',
			'default' => $value,
		);
	}

	/**
	 * Number attribute definition.
	 *
	 * @param int|float $value Default value.
	 *
	 * @return array
	 */
	public static function number( $value = 0 ): array {
		return array(
			'type'    => 'number',
			'default' => $value,
		);
	}

	/**
	 * Boolean attribute definition.
	 *
	 * @param bool $value Default value.
	 *
	 * @return array
	 */
	public static function boolean( $value = false ): array {
		return array(
			'type'    => 'boolean',
			'default' => $value,
		);
	}

	/**
	 * Array attribute definition.
	 *
	 * @param array $value Default value.
	 *
	 * @return array
	 */
	public static function arr( $value = array() ): array {
		return array(
			'type'    => 'array',
			'default' => $value,
		);
	}

	/**
	 * Object attribute definition.
	 *
	 * For grouped attributes whose default is a custom map (imageVideo, content,
	 * content, …). Top-level responsive scalars and box models have their
	 * own one-call builders — {@see single_responsive()} / {@see responsive_spacing()}.
	 *
	 * @param array $value Default value bundle.
	 *
	 * @return array
	 */
	public static function object( $value = array() ): array {
		return array(
			'type'    => 'object',
			'default' => $value,
		);
	}

	/**
	 * Responsive scalar *attribute* definition — `{ type, default }`.
	 *
	 * The one-call top-level builder (mirrors Woo Product Slider Pro's
	 * `single_responsive`): assign it straight to an attribute key, no `object()`
	 * wrap. Pass `''`/`null` as `$unit` for unit-less values (e.g. columns).
	 *
	 * @param mixed       $desktop Desktop value.
	 * @param mixed       $tablet  Tablet value.
	 * @param mixed       $mobile  Mobile value.
	 * @param string|null $unit    CSS unit; falsy omits the `unit` key.
	 *
	 * @return array
	 */
	public static function single_responsive( $desktop = '', $tablet = '', $mobile = '', $unit = 'px' ): array {
		return self::object( self::responsive( $desktop, $tablet, $mobile, $unit ? $unit : null ) );
	}

	/**
	 * Responsive box-model *attribute* definition — `{ type, default }`.
	 *
	 * The one-call top-level builder for margin / padding attributes (Woo parity:
	 * `responsive_spacing` returns a wrapped definition). Assign straight to an
	 * attribute key, no `object()` wrap. Inner shape is this plugin's flat
	 * box model; see {@see box_model()}.
	 *
	 * @param string $unit CSS unit.
	 *
	 * @return array
	 */
	public static function responsive_spacing( $unit = 'px' ): array {
		return self::object( self::box_model( $unit ) );
	}

	/**
	 * Responsive value *fragment* — bare `{ desktop, tablet, mobile[, unit] }`.
	 *
	 * For nesting inside a grouped attribute's default map (opacity, gaps inside
	 * a `style` group, typography scalars). For a top-level attribute use
	 * {@see single_responsive()} instead. Omit `$unit` for unit-less values.
	 *
	 * @param mixed       $desktop Desktop value.
	 * @param mixed       $tablet  Tablet value.
	 * @param mixed       $mobile  Mobile value.
	 * @param string|null $unit    CSS unit, or null to omit the `unit` key.
	 *
	 * @return array
	 */
	public static function responsive( $desktop = '', $tablet = '', $mobile = '', $unit = null ): array {
		$bundle = array(
			'desktop' => $desktop,
			'tablet'  => $tablet,
			'mobile'  => $mobile,
		);

		if ( null !== $unit ) {
			$bundle['unit'] = $unit;
		}

		return $bundle;
	}

	/**
	 * Responsive four-side box-model *fragment* — bare bundle.
	 *
	 * For nesting inside a grouped default (padding / margin inside a `style`
	 * group). For a top-level attribute use {@see responsive_spacing()}. Per-device
	 * sides start empty; the Spacing control fills them on edit.
	 *
	 * @param string $unit CSS unit.
	 *
	 * @return array
	 */
	public static function box_model( $unit = 'px' ): array {
		return array(
			'desktop' => array(),
			'tablet'  => array(),
			'mobile'  => array(),
			'unit'    => $unit,
		);
	}

	/**
	 * Minimal Spacing-shaped bundle carrying only a unit.
	 *
	 * Used for controls whose per-side values are supplied on edit
	 * (border width, border radius).
	 *
	 * @param string $unit CSS unit (e.g. `px`, `outset`).
	 *
	 * @return array
	 */
	public static function spacing( $unit = 'px' ): array {
		return array(
			'unit' => $unit,
		);
	}

	/**
	 * Box-shadow bundle consumed by the shared BoxShadow control.
	 *
	 * Spacing-shaped like {@see spacing()}, but this one ships a DRAWABLE default
	 * rather than a bare unit — and that is the whole point of it existing.
	 * `CssHelpers::box_shadow_value()` returns '' without a colour (deliberately: an
	 * uncoloured shadow must not fall back to black), and `Spacing`'s / `ColorPicker`'s
	 * `defaultValue` / `defaultColor` props only drive their RESET buttons, they never
	 * seed a value. So a `{ unit: 'outset' }` default meant switching "Enable Box
	 * Shadow" on produced `color: ''` and `value: undefined` — no custom property at
	 * all — and the control did nothing until the user also opened the colour picker
	 * AND typed four offsets. It read as broken because, end to end, it was.
	 *
	 * Seeding the shape here rather than in the React control keeps ONE source of
	 * truth: WordPress hydrates registered attribute defaults before both
	 * `render_callback` and the editor, so the panel opens on the same values the
	 * renderer would emit. Matches the reference (Woo Product Slider Pro), where
	 * enabling the toggle selects a visible preset shadow immediately; its global
	 * shadow-preset library needs a site-wide settings store this plugin does not
	 * have, so the single sensible default is the part that ports.
	 *
	 * `top`/`right`/`bottom`/`left` are X offset / Y offset / blur / spread (the
	 * control's labelled mode), all px; `unit` carries `outset|inset`.
	 *
	 * @param string $color Default shadow colour.
	 *
	 * @return array
	 */
	public static function box_shadow( $color = '#949494' ): array {
		return array(
			'value' => array(
				'top'    => '0',
				'right'  => '3',
				'bottom' => '6',
				'left'   => '0',
			),
			'unit'  => 'outset',
			'color' => $color,
		);
	}

	/**
	 * Border bundle consumed by the Border control (`border` attribute half).
	 *
	 * @param string      $style       Border style.
	 * @param string      $color       Normal color.
	 * @param string|null $hover_color Optional hover color (key omitted when null).
	 *
	 * @return array
	 */
	public static function border( $style = 'none', $color = '', $hover_color = null ): array {
		$bundle = array(
			'style' => $style,
			'color' => $color,
		);

		if ( null !== $hover_color ) {
			$bundle['hoverColor'] = $hover_color;
		}

		return $bundle;
	}

	/**
	 * Background bundle: `{ style, solid, gradient }`.
	 *
	 * @param string $style    Background style (`solid` | `gradient`).
	 * @param string $solid    Solid color.
	 * @param string $gradient Gradient value.
	 *
	 * @return array
	 */
	public static function background( $style = 'solid', $solid = '', $gradient = '' ): array {
		return array(
			'style'    => $style,
			'solid'    => $solid,
			'gradient' => $gradient,
		);
	}

	/**
	 * Typography bundle consumed by the Typography control.
	 *
	 * Defaults empty — the control supplies its own internal defaults; a
	 * populated default here would override the user's theme/font choices.
	 *
	 * @param array $value Default typography values.
	 *
	 * @return array
	 */
	public static function typography( $value = array() ): array {
		return $value;
	}

	/*
	 * Per-state composite bundles.
	 *
	 * Higher-order fragments assembled from the atomic builders above, one per
	 * Normal / Hover state. Mirrors Woo Product Slider Pro's composite helpers
	 * (`bg`, `color`) — the generator, not the factory, owns reusable shapes.
	 */

	/**
	 * Per-state image / video appearance bundle (Normal or Hover).
	 *
	 * @return array
	 */
	public static function image_style_state(): array {
		return array(
			'border'          => self::border(),
			'borderWidth'     => self::spacing(),
			'borderRadius'    => self::spacing(),
			'boxShadowEnable' => false,
			'boxShadow'       => self::box_shadow(),
		);
	}

	/**
	 * Per-state button / filter-item appearance bundle (Normal or Hover).
	 *
	 * Text color plus background, border, and border-width bundles — used by the
	 * AJAX pagination button.
	 *
	 * @param string $text_color Default text color.
	 *
	 * @return array
	 */
	public static function button_state( $text_color = '' ): array {
		return array(
			'textColor'   => $text_color,
			'background'  => self::background(),
			'border'      => self::border(),
			'borderWidth' => self::spacing(),
		);
	}
}

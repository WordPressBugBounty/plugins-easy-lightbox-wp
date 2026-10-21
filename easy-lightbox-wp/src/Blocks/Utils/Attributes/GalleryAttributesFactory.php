<?php
/**
 * Factory class for dynamic attribute generation.
 *
 * @package ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes
 */

namespace ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes;

use ShapedPlugin\ShapedGallery\Blocks\Utils\Attributes\AttributeGenerators as Attributes;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Assembles the gallery block's attribute schema.
 *
 * Composition only — the reusable schema fragments come from
 * {@see AttributeGenerators}. This class groups those fragments into the
 * inspector-shaped attribute map and stays the single source of defaults
 * (CLAUDE.md §7). Keep every default here identical to what
 * `GalleryOptions::normalize()` expects.
 */
class GalleryAttributesFactory {

	/**
	 * Shared Core Attributes.
	 *
	 * `categories` is DECLARED but never read or written by this build, and that is
	 * deliberate rather than an oversight. The per-gallery category vocabulary
	 * belongs to the premium build's Image Filter & Search feature; the free build
	 * ships no UI for it and no renderer that consumes it.
	 *
	 * It stays in the schema because WordPress drops any attribute a block does not
	 * declare the moment the block is re-saved. A site whose premium build lapses
	 * falls back to this one over the SAME galleries — and the first edit of one
	 * would silently discard the vocabulary while the per-item memberships (which
	 * live inside `items`, an opaque array) survived, leaving every image tagged
	 * with ids that name nothing. One declared key is a cheaper price than that.
	 *
	 * @return array
	 */
	public static function get_core_attributes(): array {
		return array(
			'uniqueId'    => Attributes::string(),
			'galleryId'   => Attributes::number(),
			'layout'      => Attributes::string( 'justified' ),
			'items'       => Attributes::arr(),
			'categories'  => Attributes::arr(),
			'provider'    => Attributes::string( 'media_library' ),
			'order'       => Attributes::string( 'default' ),
			'clickAction' => Attributes::string( 'lightbox' ),
		);
	}

	/**
	 * Shared Layout settings (Gap, Columns).
	 *
	 * @return array
	 */
	public static function get_shared_layout_settings(): array {
		return array(
			'columns'       => Attributes::single_responsive( 4, 3, 2, '' ),
			'horizontalGap' => Attributes::single_responsive( 20, 20, 20, 'px' ),
			'verticalGap'   => Attributes::single_responsive( 20, 20, 20, 'px' ),
			'margin'        => Attributes::responsive_spacing(),
		);
	}

	/**
	 * Justified layout specific settings.
	 *
	 * @return array
	 */
	public static function get_justified_settings(): array {
		return array(
			'rowHeightMode' => Attributes::string( 'auto' ),
			'maxRowHeight'  => Attributes::number( 280 ),
		);
	}

	/**
	 * Image and Video Settings.
	 *
	 * @return array
	 */
	public static function get_image_video_settings(): array {
		return array(
			'imageVideo' => Attributes::object(
				array(
					'resolution'         => 'large',
					/*
					 * Deferred loading has no control of its own: it is on, always. The
					 * key stays in the schema because `LayoutRenderer` reads it to pick
					 * the `loading` attribute, and because a gallery that later opens in
					 * the premium build — where a Lazy Load module owns the switch —
					 * finds the value it expects rather than a missing one.
					 */
					'lazyLoad'           => true,
					'imagePreloader'     => false,
					'videoPlayMode'      => 'inline',
					'autoplay'           => true,
					'playIconSize'       => 48,
					'displayIconOnHover' => false,
					'style'              => array(
						'normal' => Attributes::image_style_state(),
						'hover'  => Attributes::image_style_state(),
					),
				)
			),
		);
	}

	/**
	 * Content Settings (image title & description behaviour + content layout).
	 *
	 * Grouped `content` object, following the block's grouped-attribute
	 * convention (imageVideo, ajaxPagination, …). Editor UI + persistence only —
	 * rendering consumes these later. Responsive scalars keep the flat
	 * `{ desktop, tablet, mobile, unit }` shape.
	 *
	 * @return array
	 */
	public static function get_content_settings(): array {
		return array(
			'content' => Attributes::object(
				array(
					'imageTitle'             => false,
					'imageTitleSource'       => 'caption',
					'imageTitleTag'          => 'h4',
					'imageDescription'       => false,
					'imageDescriptionSource' => 'description',
					'descriptionLimit'       => Attributes::responsive( 4, 4, 4, 'lines' ),
					'displayStyle'           => 'classic',
					'position'               => 'bottom',
					'alignment'              => 'left',
					'titleToDescGap'         => Attributes::responsive( 16, 16, 16, 'px' ),
					// Style tab — title / description text styling + content box.
					'titleTypography'        => Attributes::typography(),
					'titleFontSize'          => Attributes::responsive(),
					'titleLineHeight'        => Attributes::responsive(),
					'titleLetterSpacing'     => Attributes::responsive(),
					'titleWordSpacing'       => Attributes::responsive(),
					'titleColor'             => '',
					'descTypography'         => Attributes::typography(),
					'descFontSize'           => Attributes::responsive(),
					'descLineHeight'         => Attributes::responsive(),
					'descLetterSpacing'      => Attributes::responsive(),
					'descWordSpacing'        => Attributes::responsive(),
					'descColor'              => '',
					'background'             => Attributes::background(),
					'border'                 => Attributes::border(),
					'borderWidth'            => Attributes::spacing(),
					'borderRadius'           => Attributes::spacing(),
					'padding'                => Attributes::box_model(),
				)
			),
		);
	}

	/**
	 * Feature Settings (Ajax Pagination, Advanced).
	 *
	 * @return array
	 */
	public static function get_feature_settings(): array {
		return array(
			'ajaxPagination' => Attributes::object(
				array(
					'enable'        => false,
					// One count governs both the initial view AND each Load More page
					// (the former "Show Per Click" was merged into this).
					'showPerView'   => Attributes::responsive( 15, 15, 15 ),
					'buttonLabel'   => 'Load More',
					'endingMessage' => 'No more images available',
					'alignment'     => 'center',
					// Style tab — button typography, per-state colours, box model.
					'style'         => array(
						'typography'    => Attributes::typography(),
						'fontSize'      => Attributes::responsive(),
						'lineHeight'    => Attributes::responsive(),
						'letterSpacing' => Attributes::responsive(),
						'wordSpacing'   => Attributes::responsive(),
						'normal'        => Attributes::button_state(),
						'hover'         => Attributes::button_state(),
						'borderRadius'  => Attributes::spacing(),
						'padding'       => Attributes::box_model(),
						'margin'        => Attributes::box_model(),
					),
				)
			),
			'advanced'       => Attributes::object(
				array(
					// General sub-tab — block-wrapper styling.
					'background'     => Attributes::background(),
					'padding'        => Attributes::box_model(),
					'margin'         => Attributes::box_model(),
					// Visibility sub-tab — responsive show / hide.
					'visibility'     => array(
						'mode'                => 'public',
						'password'            => '',
						'hideDesktop'         => false,
						'hideTablet'          => false,
						'hideMobilePortrait'  => false,
						'hideMobileLandscape' => false,
					),
					// Advanced sub-tab — styling hooks on the block wrapper.
					'customCssClass' => '',
					'customCssId'    => '',
				)
			),
		);
	}

	/**
	 * Core's `align` attribute, declared here so the block can default to WIDE.
	 *
	 * `supports.align` alone makes core declare this attribute itself, with no
	 * default — and a block whose attribute core declared cannot be given one
	 * afterwards. Declaring it here instead wins: core's `addAttribute()` filter
	 * returns early as soon as the attribute already has a `type`, so this
	 * definition (default included) is the one that survives registration.
	 *
	 * A default is normally a trap for `align`, because "None" stores `undefined`,
	 * the serializer omits undefined values and the parser then hands the default
	 * straight back — leaving the block stuck at its default for good. Core carries
	 * the escape hatch for exactly this case: its `updateAlignment()` checks the
	 * block type for an `align` default and, when there is one, stores the empty
	 * string rather than `undefined` for "None". That is why `''` is in the enum
	 * below, and it is also why this has to be an enum at all — the value has to
	 * validate on the way back in.
	 *
	 * Wide, because the canvas's content width (around 645px on a default theme) is
	 * narrower than the layout picker's card row, which paints the moment an empty
	 * gallery is opened. The alignment is still the author's to change from the
	 * toolbar once the gallery has images in it.
	 *
	 * It reaches the FRONT END as well, and deliberately: `get_block_wrapper_attributes()`
	 * reads the align support while the block renders, so the wrapper ships
	 * `alignwide`. A gallery stored without an explicit alignment — one embedded in a
	 * page before this default existed — therefore widens on the front end too, which
	 * is what a default alignment means. An author who wants the old width picks
	 * "None", and that choice is stored (see the empty string above).
	 *
	 * @return array
	 */
	public static function get_alignment_attribute(): array {
		return array(
			'align' => array(
				'type'    => 'string',
				'enum'    => array( 'left', 'center', 'right', 'wide', 'full', '' ),
				'default' => 'wide',
			),
		);
	}

	/**
	 * Get all block attributes merged.
	 *
	 * @return array
	 */
	public static function get_all_attributes(): array {
		return array_merge(
			self::get_alignment_attribute(),
			self::get_core_attributes(),
			self::get_shared_layout_settings(),
			self::get_justified_settings(),
			self::get_image_video_settings(),
			self::get_content_settings(),
			self::get_feature_settings()
		);
	}

	/**
	 * Flat map of attribute key => default value.
	 *
	 * The single source of defaults for server-side normalization
	 * ({@see GalleryOptions::normalize()}), so a default lives in exactly one
	 * place instead of being re-declared at render time (CLAUDE.md §7).
	 *
	 * @return array<string,mixed>
	 */
	public static function defaults(): array {
		$defaults = array();
		foreach ( self::get_all_attributes() as $key => $definition ) {
			$defaults[ $key ] = $definition['default'] ?? null;
		}
		return $defaults;
	}
}

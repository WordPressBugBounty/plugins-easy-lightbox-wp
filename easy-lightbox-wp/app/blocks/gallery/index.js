/**
 * Register the ShapedGallery block.
 *
 * `blockOptions` is the single source of truth for the block metadata — the
 * build step (generate-json.js) extracts it into dist/block/gallery/block.json
 * for the PHP server registration, and we reuse it here for registerBlockType.
 */

// Ensure WP ajax settings are correctly bridged inside Gutenberg iframes.
if ( typeof window !== 'undefined' ) {
	const wpAjax = window.wp?.ajax;
	if ( wpAjax && ( ! wpAjax.settings || ! wpAjax.settings.url ) ) {
		const parentAjax = window.parent?.wp?.ajax;
		if ( parentAjax?.settings?.url ) {
			wpAjax.settings = { ...wpAjax.settings, ...parentAjax.settings };
		} else if ( window.parent?._wpUtilSettings ) {
			wpAjax.settings = { ...wpAjax.settings, url: window.parent._wpUtilSettings.ajaxurl };
		} else if ( window.parent?.ajaxurl ) {
			wpAjax.settings = { ...wpAjax.settings, url: window.parent.ajaxurl };
		}
	}
	if ( ! window.ajaxurl && window.parent?.ajaxurl ) {
		window.ajaxurl = window.parent.ajaxurl;
	}
	if ( ! window._wpUtilSettings && window.parent?._wpUtilSettings ) {
		window._wpUtilSettings = window.parent._wpUtilSettings;
	}
}

import { registerBlockType, updateCategory } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import edit from './edit';
import save from './save';
import icon from './icon';
import categoryIcon from './category-icon';
// Registers the "Gallery Information" panel in the Post tab (gallery CPT only).
import './document-panel';
// Renders the Content Settings block inside each editable core/image inner block.
import './item-content-filter';
// Takes the native image controls the gallery cannot honour off its own tiles.
import './tile-controls';
// Registers the Ready Patterns library: the editor-header button and its modal.
// The gallery block's own toolbar entry imports from the same module.
import '../../ready-patterns';
import './style.scss';
import './editor.scss';

const blockOptions = {
	apiVersion: 3,
	name: 'shaped-gallery/gallery',
	// The block's name is the brand name, spelled as one word.
	title: __( 'ShapedGallery', 'easy-lightbox-wp' ),
	category: 'shaped-gallery',
	description: __(
		'Showcase your Images, Videos beautifully and keep visitors engaged.',
		'easy-lightbox-wp'
	),
	keywords: [ 'gallery', 'images', 'photos', 'masonry', 'justified' ],
	textdomain: 'easy-lightbox-wp',
	supports: {
		align: [ 'wide', 'full' ],
		anchor: false,
		customClassName: false,
		html: false,
		/*
		 * Turn OFF Gutenberg's click-blocking block overlay.
		 *
		 * `__unstableHasActiveBlockOverlayActive()` switches the overlay on for any
		 * block with CONTROLLED inner blocks that is not itself selected and has no
		 * selected descendant — and the editable preview's inner blocks are controlled
		 * (`useInnerBlocksProps` with `value` + `onChange`, see
		 * EditableGalleryPreview). With it on, the gallery renders
		 * `.has-block-overlay`, whose `::after` covers the whole block and swallows
		 * every pointer event aimed at a tile. So the natural gesture — grab a tile and
		 * drag it — did nothing: you had to click the gallery once to select it, click a
		 * tile to select the image, and only then could you drag. That is what "drag and
		 * drop is not working seamlessly" was.
		 *
		 * Core's own comment says the overlay exists for "reusable block, template part,
		 * navigation" — blocks whose children are a SEPARATELY STORED entity you should
		 * not edit through by accident. Ours are the opposite: an editor-only projection
		 * of this block's own `items` attribute (§6.4), with nothing behind them to
		 * protect. `supports.__experimentalDisableBlockOverlay` is the documented opt-out
		 * for exactly that case.
		 *
		 * Experimental prefix, so it is a real dependency on a private-ish flag: if a
		 * future Gutenberg renames it the overlay comes back and tiles stop being
		 * directly draggable. That is a visible regression, not a silent one.
		 */
		__experimentalDisableBlockOverlay: true,
	},
};

registerBlockType( blockOptions.name, {
	...blockOptions,
	icon,
	edit,
	save,
} );

/*
 * The inserter's "ShapedGallery" category heading carries the brand mark too, at
 * its own 16px rather than the block icon's 24 ({@see ./category-icon}).
 * PHP registers the category (`BlocksInit::register_category()`) but can only name a
 * dashicon there, so the SVG is attached here. Order is safe: core prints
 * `wp.blocks.setCategories()` inline right after `wp-blocks`, which this bundle
 * depends on, so the category already exists when this runs.
 */
updateCategory( blockOptions.category, { icon: categoryIcon } );

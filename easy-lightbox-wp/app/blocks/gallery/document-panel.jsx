/**
 * "Gallery Information" panel in the editor's Post tab.
 *
 * The block's own sidebar section ({@see ./panels/GalleryInfo.jsx}) already shows the
 * shortcode, but only while the block is selected. A reusable gallery's id and
 * shortcode are properties of the *post*, so they also belong in the document sidebar,
 * where they are readable the moment the editor opens.
 *
 * Registered from the block bundle rather than a bundle of its own: the panel needs the
 * same shortcode/post helpers the block section uses, and shipping a second script for
 * one panel would mean a second place to keep the shortcode format in step.
 *
 * `PluginDocumentSettingPanel` is read off `window.wp` instead of imported. It moved
 * from `@wordpress/edit-post` to `@wordpress/editor` in WP 6.6, and this plugin
 * supports 5.8+ — reading whichever exists keeps one code path and avoids declaring a
 * hard dependency on the post editor for a bundle that also loads in the site editor.
 */
import { registerPlugin } from '@wordpress/plugins';
import { __, sprintf } from '@wordpress/i18n';
import { ShortcodeField } from '@shaped-gallery/components';
import { useCurrentPost, shortcodeFor, isGalleryPostType } from './panels/GalleryInfo';

const PLUGIN_NAME = 'shaped-gallery-gallery-info';

/**
 * The document-settings panel slot component, when the running editor has one.
 *
 * @return {Function|null} Component or null.
 */
function panelSlot() {
	const wp = typeof window !== 'undefined' ? window.wp : null;

	return wp?.editor?.PluginDocumentSettingPanel || wp?.editPost?.PluginDocumentSettingPanel || null;
}

/**
 * @return {JSX.Element|null} Panel, or null outside a gallery post.
 */
function GalleryDocumentPanel() {
	const { postId, postType } = useCurrentPost();
	const Panel = panelSlot();

	if ( ! Panel || ! postId || ! isGalleryPostType( postType ) ) {
		return null;
	}

	return (
		<Panel
			name="shaped-gallery-info"
			title={ __( 'Gallery Information', 'easy-lightbox-wp' ) }
			className="sp-shaped-gallery-doc-panel"
		>
			<div className="sp-shaped-gallery-doc-panel__row">
				<span className="sp-shaped-gallery-doc-panel__label">
					{ __( 'Gallery ID', 'easy-lightbox-wp' ) }
				</span>
				<span className="sp-shaped-gallery-doc-panel__value">{ postId }</span>
			</div>

			<div className="sp-shaped-gallery-doc-panel__row sp-shaped-gallery-doc-panel__row--stacked">
				<span className="sp-shaped-gallery-doc-panel__label">
					{ __( 'Shortcode', 'easy-lightbox-wp' ) }
				</span>
				<ShortcodeField
					value={ shortcodeFor( postId ) }
					label={ sprintf(
						/* translators: %d: gallery id. */
						__( 'Shortcode for gallery %d', 'easy-lightbox-wp' ),
						postId
					) }
					copyLabel={ __( 'Copy shortcode', 'easy-lightbox-wp' ) }
					copiedLabel={ __( 'Copied', 'easy-lightbox-wp' ) }
				/>
			</div>

			<p className="sp-shaped-gallery-doc-panel__hint">
				{ __(
					'Paste this shortcode into any page, post or page-builder widget. Editing this gallery updates every place it appears.',
					'easy-lightbox-wp'
				) }
			</p>
		</Panel>
	);
}

// The bundle can be evaluated twice in a session (editor iframe + parent frame);
// registering the same plugin name twice logs a console error, so guard it.
if ( typeof window !== 'undefined' && ! window.wp?.plugins?.getPlugin?.( PLUGIN_NAME ) ) {
	registerPlugin( PLUGIN_NAME, { render: GalleryDocumentPanel } );
}

export default GalleryDocumentPanel;

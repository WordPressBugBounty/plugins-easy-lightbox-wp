/**
 * Gallery Information — the top of the block's Settings sidebar.
 *
 * Sits directly under Gutenberg's own block card (icon, title, description), which is
 * why this section deliberately does NOT reprint any of those: the design's header is
 * the native card plus the two things core cannot know — where the docs are and the
 * gallery's permanent shortcode.
 *
 * The shortcode row appears only while editing a `shaped_gallery` post, because that is
 * the only context in which one exists: a gallery block dropped straight into a page
 * is rendered inline and has nothing to reference. The id is the post id and never
 * changes, so the string here is the same one the Manage Galleries table shows.
 */
import { useSelect } from '@wordpress/data';
import { createInterpolateElement } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { ShortcodeField } from '@shaped-gallery/components';

/**
 * Localized editor payload (see Core\Assets::localize_data()).
 *
 * @return {Object} Payload, or an empty object outside WordPress.
 */
function payload() {
	return ( typeof window !== 'undefined' && window.shaped_gallery_data ) || {};
}

/**
 * The post currently open in the editor.
 *
 * `core/editor` is absent outside the post editor (the site editor, a widget screen),
 * so the store is read defensively rather than imported as a hard dependency.
 *
 * @return {{postId: number, postType: string}} Current post.
 */
export function useCurrentPost() {
	return useSelect( ( select ) => {
		const editor = select( 'core/editor' );

		return {
			postId: Number( editor?.getCurrentPostId?.() || 0 ),
			postType: String( editor?.getCurrentPostType?.() || '' ),
		};
	}, [] );
}

/**
 * The permanent shortcode for a gallery post.
 *
 * The tag comes from PHP (`Frontend::TAG`) so the string a user copies cannot drift
 * from the tag actually registered.
 *
 * @param {number} postId Gallery post id.
 * @return {string} Shortcode, or '' without an id.
 */
export function shortcodeFor( postId ) {
	if ( ! postId ) {
		return '';
	}
	const tag = payload().shortcodeTag || 'shaped_gallery';

	return `[${ tag } id="${ postId }"]`;
}

/**
 * Whether the given post type is the gallery CPT.
 *
 * @param {string} postType Post type name.
 * @return {boolean} True for the gallery CPT.
 */
export function isGalleryPostType( postType ) {
	return postType === ( payload().postType || 'shaped_gallery' );
}

/**
 * @return {JSX.Element} Section.
 */
export default function GalleryInfo() {
	const { postId, postType } = useCurrentPost();
	const { docsUrl, manageUrl } = payload();
	const shortcode = isGalleryPostType( postType ) ? shortcodeFor( postId ) : '';

	return (
		<div className="sp-shaped-gallery-info">
			{ docsUrl && (
				<a
					className="sp-shaped-gallery-info__docs"
					href={ docsUrl }
					target="_blank"
					rel="noreferrer noopener"
				>
					{ __( 'Documentation', 'easy-lightbox-wp' ) }
				</a>
			) }

			{ shortcode && (
				<>
					<p className="sp-shaped-gallery-info__hint">
						{ manageUrl
							? createInterpolateElement(
									__(
										'You can use this shortcode anywhere and manage it from <a>Saved Galleries</a>.',
										'easy-lightbox-wp'
									),
									{
										// eslint-disable-next-line jsx-a11y/anchor-has-content
										a: <a href={ manageUrl } />,
									}
							  )
							: __( 'You can use this shortcode anywhere.', 'easy-lightbox-wp' ) }
					</p>
					<ShortcodeField
						value={ shortcode }
						label={ sprintf(
							/* translators: %d: gallery id. */
							__( 'Shortcode for gallery %d', 'easy-lightbox-wp' ),
							postId
						) }
						copyLabel={ __( 'Copy shortcode', 'easy-lightbox-wp' ) }
						copiedLabel={ __( 'Copied', 'easy-lightbox-wp' ) }
					/>
				</>
			) }
		</div>
	);
}

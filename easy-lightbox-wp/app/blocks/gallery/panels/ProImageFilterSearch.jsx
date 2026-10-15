/**
 * Image Filter & Search — ShapedGallery Pro's panel, shown here as a locked teaser.
 *
 * Pro mounts its working panel at this spot, just above Advanced, so the Free
 * inspector keeps the same shape and the panel is found where a Pro user would
 * look for it. It is WP Carousel Free's locked-panel treatment (`ProPanel`): closed
 * by default, a crown after the title, a feature card for its body. It reads and
 * writes no attribute — this build declares no `filterSearch`, has no filter or
 * search runtime, and `GalleryOptions::normalize()` discards the key outright.
 *
 * The bullets are what Pro's panel actually does
 * (`shaped-gallery-pro/app/blocks/gallery/panels/ImageFilterSearch.jsx`), not a
 * wish list: a teaser that promises more than the upgrade delivers is a refund.
 */
import { __ } from '@wordpress/i18n';
import { ProPanel } from '@shaped-gallery/components';

/**
 * @return {JSX.Element} Panel.
 */
export default function ProImageFilterSearch() {
	return (
		<ProPanel
			title={ __( 'Image Filter & Search', 'easy-lightbox-wp' ) }
			subtitle={ __( 'Help visitors find the right image in large galleries:', 'easy-lightbox-wp' ) }
			features={ [
				__( 'Category Filter', 'easy-lightbox-wp' ),
				__( 'Live Image Search', 'easy-lightbox-wp' ),
				__( 'Filter Item Count', 'easy-lightbox-wp' ),
				__( 'Filter & Search Styling', 'easy-lightbox-wp' ),
			] }
		/>
	);
}

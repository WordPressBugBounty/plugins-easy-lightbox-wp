/**
 * ProPanel — a whole Pro feature as an inspector panel.
 *
 * Keeps the panel in the sidebar, closed, so the Free inspector has the same shape
 * as Pro's, and fills it with a feature card instead of controls (WP Carousel
 * Free's locked-panel treatment). The crown after the title is CSS
 * (`.sp-shaped-gallery-panel-pro`). It reads no attributes and calls no setter, so
 * opening it can never change the block — this build has no renderer for the
 * feature, and `GalleryOptions::normalize()` would drop its attribute anyway.
 *
 * Inspector-only by construction, so its card always names the current offer
 * (`showOffer`), like the closing notes in the working panels.
 */
import { __ } from '@wordpress/i18n';
import ChildPanelBody from '../childPanelBody';
import ProNotice from './ProNotice';
import './editor.scss';

/**
 * @param {Object}        props
 * @param {string}        props.title      Panel title (the Pro panel's own name).
 * @param {string}        [props.subtitle] Card lead-in.
 * @param {Array<string>} props.features   What the panel does in Pro.
 * @return {JSX.Element} Panel.
 */
export default function ProPanel( { title, subtitle = '', features } ) {
	return (
		<ChildPanelBody title={ title } className="sp-shaped-gallery-panel-pro">
			<ProNotice
				title={ __( 'Unlock Pro Features!', 'easy-lightbox-wp' ) }
				subtitle={ subtitle }
				features={ features }
				showOffer
			/>
		</ChildPanelBody>
	);
}

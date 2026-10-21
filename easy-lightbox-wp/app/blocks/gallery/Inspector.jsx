/**
 * Gallery block InspectorControls — the side options panel.
 *
 * Panel structure mirrors the Figma design (single source of truth):
 *   1. Layout Settings   — LAYOUT-AWARE. Its layout-specific controls swap with
 *      the active layout via the `layoutControls()` seam (columns vs. row
 *      height, …); the rest (gaps, order, click action, ajax toggle) are
 *      universal and shared across every layout.
 *   2. Ajax Pagination  — only while Layout Settings' "Ajax Pagination" toggle
 *      is on, and directly under it, next to the toggle that revealed it.
 *   3..N Universal panels — Image & Video, Content, Image Click Action,
 *      Advanced. These work across all layouts; the seam keeps them
 *      extensible so any could take layout-specific controls later.
 *   +  Image Filter & Search — a locked Pro teaser (`ProPanel`), mounted where
 *      Pro mounts its working panel so both inspectors share one shape.
 *
 * Built from the shared `@shaped-gallery/components` control library — the
 * responsive controls own per-device read/write internally, so this panel stays
 * declarative. Each universal panel is a self-contained module under ./panels/.
 *
 * Every panel sits in one `PanelAccordion`, so only one is open at a time:
 * opening a panel closes the one that was open.
 */
import { InspectorControls } from '@wordpress/block-editor';
import { Suspense } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	ChildPanelBody,
	PanelAccordion,
	SPRangeControl,
	SelectField,
	Toggle,
} from '@shaped-gallery/components';
import { layoutControls } from '@shaped-gallery/layouts/controls';
import LayoutSource from './LayoutSource';
import GalleryInfo from './panels/GalleryInfo';
import ImageVideoSettings from './panels/ImageVideoSettings';
import ContentSettings from './panels/ContentSettings';
import ClickActionSettings from './panels/ClickActionSettings';
import AjaxPaginationSettings from './panels/AjaxPaginationSettings';
import AdvancedSettings from './panels/AdvancedSettings';
import ProImageFilterSearch from './panels/ProImageFilterSearch';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Inspector.
 */
export default function Inspector( { attributes, setAttributes } ) {
	const {
		layout,
		horizontalGap,
		verticalGap,
		order,
		ajaxPagination,
	} = attributes;

	// The active layout's own inline controls (rendered inside Layout Settings).
	const LayoutControls = layoutControls( layout );

	return (
		<InspectorControls>
			<PanelAccordion>
				{ /* Renders directly under Gutenberg's block card: docs link and the
				   gallery's permanent shortcode (gallery CPT only). */ }
				<GalleryInfo />

				<ChildPanelBody
					title={ __( 'Layout Settings', 'easy-lightbox-wp' ) }
					initialOpen={ true }
				>
					<LayoutSource layout={ layout } />

					<Suspense fallback={ null }>
						<LayoutControls attributes={ attributes } setAttributes={ setAttributes } />
					</Suspense>

					<SPRangeControl
						label={ __( 'Horizontal Gap', 'easy-lightbox-wp' ) }
						attributesKey="horizontalGap"
						attributes={ horizontalGap }
						setAttributes={ setAttributes }
						responsive
						units={ [ 'px', '%', 'em' ] }
						globalSteps
						sideAxisIcon="horizontal"
						min={ 0 }
						max={ 60 }
						defaultValue={ { desktop: 15, tablet: 15, mobile: 15 } }
					/>
					<SPRangeControl
						label={ __( 'Vertical Gap', 'easy-lightbox-wp' ) }
						attributesKey="verticalGap"
						attributes={ verticalGap }
						setAttributes={ setAttributes }
						responsive
						units={ [ 'px', '%', 'em' ] }
						globalSteps
						sideAxisIcon="vertical"
						min={ 0 }
						max={ 60 }
						defaultValue={ { desktop: 15, tablet: 15, mobile: 15 } }
					/>

					<SelectField
						label={ __( 'Order', 'easy-lightbox-wp' ) }
						attributesKey="order"
						attributes={ order }
						setAttributes={ setAttributes }
						items={ [
							{ label: __( 'Default', 'easy-lightbox-wp' ), value: 'default' },
							{ label: __( 'Random', 'easy-lightbox-wp' ), value: 'random' },
						] }
						flexStyle={ true }
					/>

					<Toggle
						label={ __( 'Ajax Pagination', 'easy-lightbox-wp' ) }
						checked={ !! ajaxPagination?.enable }
						onChange={ ( v ) =>
							setAttributes( { ajaxPagination: { ...ajaxPagination, enable: v } } )
						}
					/>
				</ChildPanelBody>

				{ /* Ajax Pagination panel — shown only when the Layout Settings
				   "Ajax Pagination" toggle is enabled, and mounted straight under that
				   panel so it opens next to the toggle that revealed it rather than
				   four panels further down. */ }
				{ ajaxPagination?.enable && (
					<AjaxPaginationSettings attributes={ attributes } setAttributes={ setAttributes } />
				) }

				{ /* Universal panels — shared across every layout; each owns editor UI
				   + attribute writes only. Where a panel's rendering has landed, the
				   consumers are named in that panel's own header (see ./panels/*). */ }
				<ImageVideoSettings attributes={ attributes } setAttributes={ setAttributes } />

				<ContentSettings attributes={ attributes } setAttributes={ setAttributes } />

				{ /* Image Click Action — always mounted. It owns the Click Action Type
				   control itself, so gating it on that value would make "None" a
				   one-way door; it reveals the Lightbox note when relevant. */ }
				<ClickActionSettings attributes={ attributes } setAttributes={ setAttributes } />

				{ /* Locked Pro teaser — where Pro mounts its working panel. Writes nothing
				   (see the panel's own header). */ }
				<ProImageFilterSearch />

				<AdvancedSettings attributes={ attributes } setAttributes={ setAttributes } />
			</PanelAccordion>
		</InspectorControls>
	);
}

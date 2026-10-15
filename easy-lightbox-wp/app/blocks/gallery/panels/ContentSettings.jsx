/**
 * Content Settings — a universal inspector panel (shared across every layout).
 * Built from the Figma design (the single source of truth): the panel splits
 * into "Settings" and "Style" tabs. The Settings tab holds the image title /
 * description behaviour and the content-layout controls (display style,
 * position, alignment); the Style tab holds the title / description text
 * styling (typography + colour) and the content box (background, border, border
 * radius, padding).
 *
 * This module owns editor UI + attribute writes only. Every field is written into
 * the grouped `content` attribute object, following the block's grouped-object
 * convention (imageVideo, ajaxPagination, …). Responsive scalars (Description Limit,
 * Title to Desc. Gap, font metrics, padding) keep the flat `{ desktop, tablet,
 * mobile [, unit] }` shape. Built entirely from the shared
 * `@shaped-gallery/components` control library.
 *
 * Everything here is consumed downstream: the behaviour fields become markup in
 * `LayoutRenderer::content_markup()` (mirrored in the canvas by
 * `blocks/gallery/item-content.js` + `ItemContent.jsx`), and the styling becomes
 * the `ContentStyle` contributor's `--sp-shaped-gallery-ct-*` custom properties
 * (editor mirror: `app/lib/style/content-vars.js`). The word Description Limit
 * truncates server-side; the lines limit is a CSS clamp.
 */
import { __ } from '@wordpress/i18n';
import {
	ChildPanelBody,
	TabControls,
	Toggle,
	SelectField,
	ButtonGroup,
	SPRangeControl,
	Divider,
	Typography,
	ColorPicker,
	Background,
	Border,
	Spacing,
} from '@shaped-gallery/components';
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from '@shaped-gallery/icons';
import { TITLE_TYPE_DEFAULTS, DESC_TYPE_DEFAULTS } from '../type-defaults';

/** Heading-tag options for the Image Title (Figma: H1–H6 + Span, default H4). */
const TITLE_TAG_ITEMS = [
	{ value: 'h1', label: __( 'H1', 'easy-lightbox-wp' ) },
	{ value: 'h2', label: __( 'H2', 'easy-lightbox-wp' ) },
	{ value: 'h3', label: __( 'H3', 'easy-lightbox-wp' ) },
	{ value: 'h4', label: __( 'H4', 'easy-lightbox-wp' ) },
	{ value: 'h5', label: __( 'H5', 'easy-lightbox-wp' ) },
	{ value: 'h6', label: __( 'H6', 'easy-lightbox-wp' ) },
	{ value: 'span', label: __( 'Span', 'easy-lightbox-wp' ) },
];

/** Content Alignment options — icon segments (Figma: left / center / right). */
const ALIGNMENT_ITEMS = [
	{ value: 'left', label: __( 'Left', 'easy-lightbox-wp' ), icon: AlignLeftIcon },
	{ value: 'center', label: __( 'Center', 'easy-lightbox-wp' ), icon: AlignCenterIcon },
	{ value: 'right', label: __( 'Right', 'easy-lightbox-wp' ), icon: AlignRightIcon },
];

/**
 * Settings tab — content behaviour + layout controls, in Figma order.
 *
 * Conditional visibility mirrors the design: the title source + tag show only
 * when Image Title is on; the description source + limit show only when Image
 * Description is on; the Title-to-Desc. gap shows only when both are on. The
 * layout controls (Display Style, Position, Alignment) style the rendered
 * title/description content itself, so they show only when at least one of
 * the two is on — with both off there is no content box left to lay out.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Settings tab body.
 */
function SettingsTab( { attributes, setAttributes } ) {
	const { content = {} } = attributes;

	// Grouped write: patch a single key on the content object.
	const update = ( key, value ) =>
		setAttributes( { content: { ...content, [ key ]: value } } );

	// Grouped write shaped like `setAttributes` so the responsive SPRangeControl
	// (which calls `setAttributes({ [key]: value })`) patches the content object
	// instead of a top-level attribute.
	const setContentAttr = ( patch ) =>
		setAttributes( { content: { ...content, ...patch } } );

	const hasTitle = !! content.imageTitle;
	const hasDescription = !! content.imageDescription;

	return (
		<>
			<Toggle
				label={ __( 'Image Title', 'easy-lightbox-wp' ) }
				checked={ hasTitle }
				onChange={ ( value ) => update( 'imageTitle', value ) }
			/>
			{ hasTitle && (
				<>
					<SelectField
						label={ __( 'Image Title Source', 'easy-lightbox-wp' ) }
						value={ content.imageTitleSource ?? 'caption' }
						onChange={ ( value ) => update( 'imageTitleSource', value ) }
						items={ [
							{ label: __( 'Attachment Title', 'easy-lightbox-wp' ), value: 'title' },
							{ label: __( 'Attachment Caption', 'easy-lightbox-wp' ), value: 'caption' },
						] }
					/>
					<ButtonGroup
						label={ __( 'HTML Tag', 'easy-lightbox-wp' ) }
						value={ content.imageTitleTag ?? 'h4' }
						onChange={ ( value ) => update( 'imageTitleTag', value ) }
						items={ TITLE_TAG_ITEMS }
					/>
				</>
			) }

			<Divider />

			<Toggle
				label={ __( 'Image Description', 'easy-lightbox-wp' ) }
				checked={ hasDescription }
				onChange={ ( value ) => update( 'imageDescription', value ) }
			/>
			{ hasDescription && (
				<>
					<SelectField
						label={ __( 'Image Description Source', 'easy-lightbox-wp' ) }
						value={ content.imageDescriptionSource ?? 'caption' }
						onChange={ ( value ) => update( 'imageDescriptionSource', value ) }
						items={ [
							{ label: __( 'Attachment Caption', 'easy-lightbox-wp' ), value: 'caption' },
							{
								label: __( 'Attachment Description', 'easy-lightbox-wp' ),
								value: 'description',
							},
						] }
					/>
					<SPRangeControl
						label={ __( 'Description Limit', 'easy-lightbox-wp' ) }
						attributesKey="descriptionLimit"
						attributes={ content.descriptionLimit }
						setAttributes={ setContentAttr }
						responsive
						units={ [ 'word', 'lines' ] }
						min={ 1 }
						max={ 100 }
						defaultValue={ { desktop: 8, tablet: 8, mobile: 8 } }
					/>
				</>
			) }

			{ ( hasTitle || hasDescription ) && (
				<>
					<Divider />

					<SelectField
						label={ __( 'Content Display Style', 'easy-lightbox-wp' ) }
						value={ content.displayStyle ?? 'classic' }
						onChange={ ( value ) => update( 'displayStyle', value ) }
						items={ [
							{ label: __( 'Classic', 'easy-lightbox-wp' ), value: 'classic' },
							{ label: __( 'Overlay', 'easy-lightbox-wp' ), value: 'overlay' },
						] }
					/>

					<SelectField
						label={ __( 'Content Positions', 'easy-lightbox-wp' ) }
						value={ content.position ?? 'bottom' }
						onChange={ ( value ) => update( 'position', value ) }
						items={ [
							{ label: __( 'Top', 'easy-lightbox-wp' ), value: 'top' },
							{ label: __( 'Bottom', 'easy-lightbox-wp' ), value: 'bottom' },
						] }
					/>

					<ButtonGroup
						label={ __( 'Content Alignment', 'easy-lightbox-wp' ) }
						value={ content.alignment ?? 'left' }
						onChange={ ( value ) => update( 'alignment', value ) }
						items={ ALIGNMENT_ITEMS }
					/>
				</>
			) }

			{ hasTitle && hasDescription && (
				<SPRangeControl
					label={ __( 'Title to Desc. Gap', 'easy-lightbox-wp' ) }
					attributesKey="titleToDescGap"
					attributes={ content.titleToDescGap }
					setAttributes={ setContentAttr }
					responsive
					units={ [ 'px', 'em', '%' ] }
					min={ 0 }
					max={ 100 }
					defaultValue={ { desktop: 16, tablet: 16, mobile: 16 } }
				/>
			) }
		</>
	);
}

/**
 * Style tab — title / description text styling + content box, in Figma order:
 * title typography + colour, description typography + colour, then (after the
 * divider) the content background, border, border radius, and padding. The
 * typography controls open in a popover; the composite box controls write their
 * own grouped keys via the same content shim.
 *
 * The title and description halves are gated on the SAME two toggles the Settings
 * tab owns (`content.imageTitle` / `content.imageDescription`), mirroring the
 * conditional visibility that tab already applies to the title source / tag and
 * the description source / limit. Styling controls for text the gallery does not
 * render are not a lesser version of the control, they are a control for
 * something that does not exist — the same hide-not-disable rule §6.9 settled on
 * for a module's per-gallery settings. Dropping the row never rewrites the stored
 * value, so re-enabling a toggle restores the styling untouched.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Style tab body.
 */
function StyleTab( { attributes, setAttributes } ) {
	const { content = {} } = attributes;

	const update = ( key, value ) =>
		setAttributes( { content: { ...content, [ key ]: value } } );

	// setAttributes-shaped shim so the composite controls (Typography, Background,
	// Border, Spacing) patch the content object instead of a top-level attribute.
	const setContentAttr = ( patch ) =>
		setAttributes( { content: { ...content, ...patch } } );

	// The Settings tab's two toggles decide whether either text is rendered at all.
	const hasTitle = !! content.imageTitle;
	const hasDescription = !! content.imageDescription;

	return (
		<>
			{ hasTitle && (
				<>
					<Typography
						label={ __( 'Title Typography', 'easy-lightbox-wp' ) }
						attributes={ content }
						setAttributes={ setContentAttr }
						typographyKey="titleTypography"
						fontSizeKey="titleFontSize"
						lineHeightKey="titleLineHeight"
						letterSpacingKey="titleLetterSpacing"
						wordSpacingKey="titleWordSpacing"
						defaults={ TITLE_TYPE_DEFAULTS }
					/>

					<ColorPicker
						label={ __( 'Title Color', 'easy-lightbox-wp' ) }
						value={ content.titleColor ?? '' }
						onChange={ ( color ) => update( 'titleColor', color ) }
						defaultColor=""
					/>
				</>
			) }

			{ hasDescription && (
				<>
					<Typography
						label={ __( 'Description Typography', 'easy-lightbox-wp' ) }
						attributes={ content }
						setAttributes={ setContentAttr }
						typographyKey="descTypography"
						fontSizeKey="descFontSize"
						lineHeightKey="descLineHeight"
						letterSpacingKey="descLetterSpacing"
						wordSpacingKey="descWordSpacing"
						defaults={ DESC_TYPE_DEFAULTS }
					/>

					<ColorPicker
						label={ __( 'Description Color', 'easy-lightbox-wp' ) }
						value={ content.descColor ?? '' }
						onChange={ ( color ) => update( 'descColor', color ) }
						defaultColor=""
					/>
				</>
			) }

			{ /* The box below styles the content REGION, which the Settings tab's
			   Display Style / Position / Alignment controls own — it is not title or
			   description text, so it stays put whichever toggle is off. The divider
			   only earns its keep when something precedes it. */ }
			{ ( hasTitle || hasDescription ) && <Divider /> }

			<Background
				label={ __( 'Content Background Style', 'easy-lightbox-wp' ) }
				colorLabel={ __( 'Background Color', 'easy-lightbox-wp' ) }
				attributes={ content.background }
				attributesKey="background"
				setAttributes={ setContentAttr }
				items={ [ 'solid', 'gradient' ] }
				defaultColor=""
			/>

			<Border
				label={ __( 'Border', 'easy-lightbox-wp' ) }
				attributes={ { border: content.border, borderWidth: content.borderWidth } }
				attributesKey={ { border: 'border', borderWidth: 'borderWidth' } }
				setAttributes={ setContentAttr }
				defaultColor=""
			/>

			<Spacing
				label={ __( 'Border Radius', 'easy-lightbox-wp' ) }
				attributes={ content.borderRadius }
				attributesKey="borderRadius"
				setAttributes={ setContentAttr }
				units={ [ 'px', '%', 'em' ] }
				defaultValue={ { top: '0', right: '0', bottom: '0', left: '0' } }
				indicator="radius"
			/>

			<Spacing
				label={ __( 'Padding', 'easy-lightbox-wp' ) }
				attributes={ content.padding }
				attributesKey="padding"
				setAttributes={ setContentAttr }
				units={ [ 'px', '%', 'em' ] }
			/>
		</>
	);
}

/**
 * Content Settings panel.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @return {JSX.Element} Panel.
 */
export default function ContentSettings( { attributes, setAttributes } ) {
	return (
		<ChildPanelBody title={ __( 'Content Settings', 'easy-lightbox-wp' ) }>
			<TabControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				labels={ { general: __( 'Settings', 'easy-lightbox-wp' ) } }
				GeneralTab={ SettingsTab }
				StyleTab={ StyleTab }
			/>
		</ChildPanelBody>
	);
}

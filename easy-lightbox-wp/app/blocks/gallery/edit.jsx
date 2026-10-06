/**
 * Gallery block editor component.
 *
 * Flow mirrors the prototype: insert → LayoutPicker (first paint) → Apply →
 * MediaModal → live GalleryPreview with a toolbar (Change Layout / Edit
 * Gallery) and the InspectorControls side panel. The picker + media manager are
 * the SAME components the standalone admin "Add New Gallery" page mounts.
 */
import { BlockControls, useBlockProps } from '@wordpress/block-editor';
import { Placeholder, ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, layout as layoutIcon, unseen } from '@wordpress/icons';
import { EditGalleryIcon, ShapedMark } from '@shaped-gallery/icons';
import { editorClassNames, hiddenFlags, isHiddenOnDevice } from '@shaped-gallery/lib/visibility';
import LayoutPicker from '@shaped-gallery/picker';
import MediaModal from '@shaped-gallery/media-manager';
import EditGalleryModal from '@shaped-gallery/media-manager/edit-gallery';
import { useUniqueId } from '@shaped-gallery/hooks';
import Inspector from './Inspector';
import GalleryPreview from './GalleryPreview';
import EditableGalleryPreview from './EditableGalleryPreview';
import ChangeLayoutPopover from './ChangeLayoutPopover';
import { INNER_BLOCK_LAYOUTS } from './image-blocks';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes setAttributes.
 * @param {string}   props.clientId      Block client id.
 * @return {JSX.Element} Editor UI.
 */
export default function Edit( { attributes, setAttributes, clientId } ) {
	const { uniqueId, layout, items = [] } = attributes;
	useUniqueId( { uniqueId, clientId, setAttr: setAttributes } );

	// Picker is the first paint when the gallery is empty.
	const [ showPicker, setShowPicker ] = useState( items.length === 0 );
	const [ mediaOpen, setMediaOpen ] = useState( false );
	// Why the media picker was opened — drives the confirm-button label/action and
	// where "Done" returns to. `null` = the initial "Create a New Gallery" flow;
	// `{ type: 'add' }` = "Add to Gallery" from Edit Gallery.
	const [ mediaOrigin, setMediaOrigin ] = useState( null );
	// Redesigned Edit Gallery modal — reads the block's real gallery items.
	const [ editGalleryOpen, setEditGalleryOpen ] = useState( false );

	/*
	 * Advanced → Visibility feedback. Four toggles that hide the gallery on the
	 * frontend used to leave the canvas byte-identical, so the only way to find out
	 * whether "Hide on Mobile Portrait" had taken was to save and open a phone.
	 *
	 * The frontend class cannot be reused for this. The block's `style` stylesheet is
	 * loaded in the editor iframe as well, so putting `sp-shaped-gallery-hide-desktop`
	 * on the wrapper would `display:none !important` the block in the canvas — and a
	 * block that is not rendered cannot be selected, which leaves no way to switch
	 * the option back off. The editor gets its own marker classes and stays visible;
	 * `editor.scss` dims it and draws the badge below.
	 */
	const visibility = attributes.advanced?.visibility;
	const hiddenOn = hiddenFlags( visibility );

	// Which device the canvas is previewing, so "hidden here" can be stronger than
	// "hidden somewhere". `core/editor` owns this from WP 6.5; the `core/edit-post`
	// experimental selector is the fallback for the versions before it, and both are
	// optional-chained because a page builder can mount this block with neither.
	const deviceType = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		if ( editor?.getDeviceType ) {
			return editor.getDeviceType();
		}
		return select( 'core/edit-post' )?.__experimentalGetPreviewDeviceType?.() ?? 'Desktop';
	}, [] );

	const blockProps = useBlockProps( {
		className: [
			'shaped-gallery-block-editor',
			...editorClassNames( visibility ),
			isHiddenOnDevice( visibility, deviceType ) ? 'is-shaped-hidden-here' : '',
		]
			.filter( Boolean )
			.join( ' ' ),
	} );

	// Panel order, so the badge reads in the order the toggles are listed. Written
	// out rather than derived from the flag key because a text domain rule cannot
	// see through a lookup, and these four strings have to be extractable (§15).
	const hiddenLabels = {
		hideDesktop: __( 'Desktop', 'easy-lightbox-wp' ),
		hideTablet: __( 'Tablet', 'easy-lightbox-wp' ),
		hideMobilePortrait: __( 'Mobile Portrait', 'easy-lightbox-wp' ),
		hideMobileLandscape: __( 'Mobile Landscape', 'easy-lightbox-wp' ),
	};

	// Open the picker for the initial create flow (no Edit-Gallery origin).
	const openMediaCreate = () => {
		setMediaOrigin( null );
		setMediaOpen( true );
	};

	const applyLayout = ( layoutId ) => {
		setAttributes( { layout: layoutId } );
		setShowPicker( false );
		if ( items.length === 0 ) {
			openMediaCreate();
		}
	};

	const updateItems = ( next ) => setAttributes( { items: next } );

	// The two modals cross-launch: MediaModal's "Edit Gallery" opens the redesigned
	// modal; its "Add to Gallery" / "Add from Media" jump back to the media picker,
	// remembering the origin so the confirm button reads correctly and "Done"
	// returns here.
	const openEditGallery = () => {
		setMediaOpen( false );
		setMediaOrigin( null );
		setEditGalleryOpen( true );
	};
	// Toolbar entry point.
	const openEditGalleryFresh = () => setEditGalleryOpen( true );
	const openMediaModal = ( origin ) => {
		setMediaOrigin( origin || null );
		setEditGalleryOpen( false );
		setMediaOpen( true );
	};

	// Confirm-button label mirrors the origin (native-media-library style).
	const mediaConfirmLabel = mediaOrigin
		? __( 'Add to Gallery', 'easy-lightbox-wp' )
		: __( 'Create a New Gallery', 'easy-lightbox-wp' );

	// Closing the picker (confirm, Cancel, or ✕) returns to Edit Gallery when it was
	// launched from there; the initial create flow just dismisses.
	const closeMedia = () => {
		setMediaOpen( false );
		if ( mediaOrigin ) {
			setEditGalleryOpen( true );
		}
		setMediaOrigin( null );
	};

	// Edits persist live via setAttributes as the user works, so closing the modal
	// (via Insert Gallery, Cancel, or the ✕) simply dismisses it — nothing to commit.
	const closeEditGallery = () => setEditGalleryOpen( false );

	const renderMain = () => {
		if ( showPicker ) {
			return <LayoutPicker value={ layout } onApply={ applyLayout } />;
		}
		if ( items.length === 0 ) {
			return (
				<Placeholder
					icon={ <ShapedMark size={ 24 } /> }
					label={ __( 'ShapedGallery', 'easy-lightbox-wp' ) }
					instructions={ __( 'Add images or videos to build your gallery.', 'easy-lightbox-wp' ) }
				>
					<button type="button" className="sp-shaped-gallery-btn sp-shaped-gallery-btn--primary" onClick={ openMediaCreate }>
						{ __( 'Add Media', 'easy-lightbox-wp' ) }
					</button>
				</Placeholder>
			);
		}
		// Grid-family layouts render editable core/image inner blocks (native
		// per-image toolbar + drag reorder); anything else keeps the static preview.
		if ( INNER_BLOCK_LAYOUTS.includes( layout ) ) {
			return <EditableGalleryPreview attributes={ attributes } setAttributes={ setAttributes } />;
		}
		return <GalleryPreview attributes={ attributes } />;
	};

	// Quick-actions live in the native block toolbar two
	// text buttons in the "other" group, after the default block controls and
	// before the block-settings menu. Using BlockControls keeps Gutenberg's native
	// positioning, keyboard navigation, and toolbar semantics — no custom bar.
	// Shown only while a gallery is being previewed (not the picker/empty states);
	// Gutenberg itself only renders the toolbar for the selected block.
	const hasGallery = ! showPicker && items.length > 0;

	return (
		<div { ...blockProps }>
			{ /* Align, OFF while the layout picker owns the canvas.
			     Core renders the alignment dropdown from `supports.align`, and there
			     is no per-instance way to switch that off — the support is read from
			     the block TYPE. Dropping the support is not an option either: the
			     wide alignment is what gives the picker its width in the first place.
			     So the control is hidden rather than removed, and this marker is how
			     the rule finds it: core's align fill and this span land in the SAME
			     `group="block"` toolbar group, so `:has()` on the marker selects
			     exactly that group and nothing else in the toolbar (see editor.scss).
			     It is rendered only while the picker is up, so the rule cannot
			     outlive the state it belongs to. */ }
			{ showPicker && (
				<BlockControls group="block">
					<span className="sp-shaped-gallery-align-suppressor" />
				</BlockControls>
			) }

			{ hasGallery && (
				<BlockControls group="other">
					<ToolbarGroup>
						<ChangeLayoutPopover value={ layout } onApply={ applyLayout }>
							{ ( { isOpen, toggleRef, toggleClassName, onToggle } ) => (
								<ToolbarButton
									ref={ toggleRef }
									className={ `sp-shaped-gallery-toolbar-action ${ toggleClassName }` }
									icon={ layoutIcon }
									text={ __( 'Change Layout', 'easy-lightbox-wp' ) }
									aria-expanded={ isOpen }
									onClick={ onToggle }
								/>
							) }
						</ChangeLayoutPopover>
						<ToolbarButton
							className="sp-shaped-gallery-toolbar-action"
							icon={ EditGalleryIcon }
							text={ __( 'Edit Gallery', 'easy-lightbox-wp' ) }
							onClick={ openEditGalleryFresh }
						/>
					</ToolbarGroup>
				</BlockControls>
			) }

			<Inspector attributes={ attributes } setAttributes={ setAttributes } />

			{ /* Reports the setting; it never hides anything here. Rendered above the
			     gallery rather than over it so it cannot cover a tile the author is
			     trying to click, and outside `renderMain()` so it shows on the picker
			     and empty states too — the option is settable from all of them. */ }
			{ hiddenOn.length > 0 && (
				<div className="sp-shaped-gallery-visibility-badge">
					<Icon icon={ unseen } size={ 18 } />
					<span>
						{ sprintf(
							/* translators: %s: comma-separated device list, e.g. "Desktop, Mobile Portrait". */
							__( 'Hidden on %s', 'easy-lightbox-wp' ),
							hiddenOn.map( ( flag ) => hiddenLabels[ flag.key ] ).join( ', ' )
						) }
					</span>
				</div>
			) }

			{ renderMain() }

			{ mediaOpen && (
				<MediaModal
					items={ items }
					onChange={ updateItems }
					onClose={ closeMedia }
					onEditGallery={ openEditGallery }
					confirmLabel={ mediaConfirmLabel }
				/>
			) }

			{ editGalleryOpen && (
				<EditGalleryModal
					items={ items }
					onChange={ updateItems }
					onInsert={ closeEditGallery }
					onClose={ closeEditGallery }
					onAddToGallery={ () => openMediaModal( { type: 'add' } ) }
				/>
			) }
		</div>
	);
}

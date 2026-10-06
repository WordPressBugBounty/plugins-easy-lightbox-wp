/**
 * SpPopover — a compound popover control. A labelled toggle button opens a
 * floating panel (the core `Popover`) that closes on an outside click. Composed
 * from `SpPopover.Header` (sticky title row) and `SpPopover.Content` (body), it
 * hosts richer controls (Border, colour palettes) without crowding the panel.
 *
 * The panel is anchored to the TOGGLE, not to this component's root. Without an
 * `anchor`, core anchors to the parent node — here the whole label + trigger row —
 * so the panel opened below the row's left edge, up to a sidebar's width away from
 * the glyph that opened it. `bottom-end` + a small offset puts it directly under the
 * trigger, which is where the design draws every one of these panels.
 *
 * @param {Object} props
 * @param {Node}   props.children Panel contents (typically SpPopover.Header/Content).
 * @param {string} [props.label]  Toggle label; hides the toggle row when falsy.
 * @param {Node}   [props.icon]   Toggle glyph; defaults to the plus-box glyph.
 * @return {JSX.Element} Popover.
 */
import { __ } from '@wordpress/i18n';
import { Popover } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { getRandomId } from '@shaped-gallery/controls';
import { PopOverToggleIcon } from '@shaped-gallery/icons';
import './editor.scss';

function SpPopover( {
	children,
	label = __( 'Popover', 'easy-lightbox-wp' ),
	icon = <PopOverToggleIcon />,
} ) {
	const [ open, setOpen ] = useState( false );
	const [ uniqueId ] = useState( () => `sp-shaped-gallery-popover-${ getRandomId() }` );
	// State, not a ref: core `Popover` needs a re-render once the anchor node exists.
	const [ toggleNode, setToggleNode ] = useState( null );

	useEffect( () => {
		const clickOutside = ( event ) => {
			const inContent = event.target.closest( '.sp-shaped-gallery-popover__content-visible' );
			const inColorPicker = event.target.closest( '.components-popover' );
			const onToggle = event.target.closest( `.sp-shaped-gallery-popover__toggle.${ uniqueId }` );
			const inSelectMenu = event.target.closest( '.css-1nmdiq5-menu' );

			if ( open && ! inContent && ! onToggle && ! inSelectMenu && ! inColorPicker ) {
				setOpen( false );
			}
		};

		window.addEventListener( 'click', clickOutside );
		return () => window.removeEventListener( 'click', clickOutside );
	}, [ open, uniqueId ] );

	return (
		<div className="sp-shaped-gallery-popover sp-shaped-gallery-cmp-mb">
			{ label && (
				<div className="sp-shaped-gallery-popover__toggle-row">
					<span className="sp-shaped-gallery-control__title">{ label }</span>
					<button
						type="button"
						ref={ setToggleNode }
						aria-expanded={ open }
						aria-label={ label }
						onClick={ () => setOpen( ( prev ) => ! prev ) }
						className={ `sp-shaped-gallery-popover__toggle ${ uniqueId }${ open ? ' is-active' : '' }` }
					>
						{ icon }
					</button>
				</div>
			) }
			{ open && (
				<Popover anchor={ toggleNode } placement="bottom-end" offset={ 4 } shift flip>
					{ /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */ }
					<div
						className="sp-shaped-gallery-popover__content-visible"
						onClick={ ( event ) => event.stopPropagation() }
					>
						<div className="sp-shaped-gallery-popover__content-visible-inner">{ children }</div>
					</div>
				</Popover>
			) }
		</div>
	);
}

/**
 * Sticky title row for the popover panel.
 *
 * @param {Object} props
 * @param {Node}   props.children Header contents.
 * @return {JSX.Element} Header.
 */
SpPopover.Header = ( { children } ) => (
	<div className="sp-shaped-gallery-popover__header">{ children }</div>
);

/**
 * Body wrapper for the popover panel.
 *
 * @param {Object} props
 * @param {Node}   props.children Body contents.
 * @return {JSX.Element} Content.
 */
SpPopover.Content = ( { children } ) => (
	<div className="sp-shaped-gallery-popover__content">{ children }</div>
);

export default SpPopover;

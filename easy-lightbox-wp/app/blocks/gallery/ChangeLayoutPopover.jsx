/**
 * ChangeLayoutPopover — the compact "Change Layout" panel from the Figma design
 * (node 3011:54473). Picking a card applies the layout immediately and closes
 * the panel — no search, no category tabs, no Apply step, unlike the full-page
 * `LayoutPicker` used for the empty-gallery first paint (see edit.jsx).
 *
 * Open/anchor/click-outside handling mirrors `SpPopover`
 * (app/components/popover): a new component exists because that one always
 * renders its own toggle button, and this one instead wraps the block
 * toolbar's `ToolbarButton` via a render-prop so the trigger keeps its own
 * markup and styling.
 *
 * @param {Object}   props
 * @param {string}   props.value    Active layout id.
 * @param {Function} props.onApply  Called with the chosen layout id.
 * @param {Function} props.children Render prop, `( { isOpen, toggleRef, toggleClassName, onToggle } ) => Node`.
 * @return {JSX.Element} Popover.
 */
import { Popover } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { getRandomId } from '@shaped-gallery/controls';
import { LAYOUTS, PRO_LAYOUTS } from '@shaped-gallery/picker';
import LayoutCard from '@shaped-gallery/picker/LayoutCard';

export default function ChangeLayoutPopover( { value, onApply, children } ) {
	const [ open, setOpen ] = useState( false );
	const [ toggleNode, setToggleNode ] = useState( null );
	// Unique per instance so this popover's toggle click is never mistaken
	// for an outside click by another instance on the page.
	const [ uniqueId ] = useState( () => `sp-shaped-gallery-layout-popover-${ getRandomId() }` );

	useEffect( () => {
		if ( ! open ) {
			return;
		}
		const clickOutside = ( event ) => {
			const inContent = event.target.closest( '.sp-shaped-gallery-layout-popover__content' );
			const onToggleEl = event.target.closest( `.sp-shaped-gallery-layout-popover__toggle.${ uniqueId }` );
			if ( ! inContent && ! onToggleEl ) {
				setOpen( false );
			}
		};
		window.addEventListener( 'click', clickOutside );
		return () => window.removeEventListener( 'click', clickOutside );
	}, [ open, uniqueId ] );

	const select = ( layoutId ) => {
		onApply( layoutId );
		setOpen( false );
	};

	return (
		<>
			{ children( {
				isOpen: open,
				toggleRef: setToggleNode,
				toggleClassName: `sp-shaped-gallery-layout-popover__toggle ${ uniqueId }`,
				onToggle: () => setOpen( ( prev ) => ! prev ),
			} ) }
			{ open && (
				<Popover anchor={ toggleNode } placement="bottom-start" offset={ 8 } shift flip>
					{ /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */ }
					<div className="sp-shaped-gallery-layout-popover__content" onClick={ ( event ) => event.stopPropagation() }>
						<div className="sp-shaped-gallery-layout-popover__grid">
							{ LAYOUTS.map( ( layout ) => (
								<LayoutCard
									key={ layout.id }
									layout={ layout }
									selected={ value === layout.id }
									compact
									onSelect={ select }
								/>
							) ) }
							{ PRO_LAYOUTS.map( ( layout ) => (
								<LayoutCard key={ layout.id } layout={ layout } compact />
							) ) }
						</div>
					</div>
				</Popover>
			) }
		</>
	);
}

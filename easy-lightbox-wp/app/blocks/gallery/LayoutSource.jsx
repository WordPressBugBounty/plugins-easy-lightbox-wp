/**
 * Layout Settings source row — the mosaic preview of the active layout with its
 * label. Sits at the top of the Layout Settings panel (see the Figma design).
 * "Change Layout" / "Edit Gallery" live only in the block toolbar (edit.jsx) —
 * this row used to duplicate them underneath the preview, since removed.
 *
 * The preview reuses the picker's `LayoutPreview` so it never drifts from the
 * layout cards.
 *
 * @param {Object} props
 * @param {string} props.layout Active layout id.
 * @return {JSX.Element} Source row.
 */
import { LAYOUTS } from '@shaped-gallery/picker';
import { LayoutPreview } from '@shaped-gallery/picker/LayoutCard';

export default function LayoutSource( { layout } ) {
	const active = LAYOUTS.find( ( item ) => item.id === layout ) || LAYOUTS[ 0 ];

	return (
		<div className="sp-shaped-gallery-layout-source">
			<span className="sp-shaped-gallery-layout-source__label">{ active.label }</span>
			<div className="sp-shaped-gallery-layout-source__preview" aria-hidden="true">
				<LayoutPreview layout={ active } />
			</div>
		</div>
	);
}

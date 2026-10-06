/**
 * A single layout card with its SVG thumbnail preview and a selected state.
 */
import { CheckCircleIcon } from '@shaped-gallery/icons';

/**
 * Render a layout's design thumbnail (the self-contained SVG icon carried on the
 * registry entry). Shared with `LayoutSource` so the picker card and the Layout
 * Settings source row never drift.
 *
 * @param {{layout:Object}} props Layout definition (`icon` is the SVG element).
 * @return {JSX.Element} Thumbnail.
 */
export function LayoutPreview( { layout } ) {
	return (
		<span className="sp-shaped-gallery-card__figure" aria-hidden="true">
			{ layout.icon }
		</span>
	);
}

/**
 * Layout card.
 *
 * @param {Object}   props
 * @param {Object}   props.layout    Layout definition.
 * @param {boolean}  props.selected  Whether the card is selected.
 * @param {Function} props.onSelect  Selection handler.
 * @param {boolean}  [props.compact] Smaller variant for `ChangeLayoutPopover`
 *                                   (Figma node 3011:54473) — selection reads
 *                                   from the border + tint alone, no check badge.
 * @return {JSX.Element} Card.
 */
export default function LayoutCard( { layout, selected, onSelect, compact = false } ) {
	const classes = [ 'sp-shaped-gallery-card' ];
	if ( selected ) {
		classes.push( 'is-selected' );
	}
	if ( compact ) {
		classes.push( 'is-compact' );
	}

	return (
		<button
			type="button"
			className={ classes.join( ' ' ) }
			data-layout={ layout.id }
			aria-pressed={ selected }
			onClick={ () => onSelect( layout.id ) }
		>
			<span className="sp-shaped-gallery-card__preview">
				<LayoutPreview layout={ layout } />
				{ selected && ! compact && (
					<span className="sp-shaped-gallery-card__check">
						<CheckCircleIcon />
					</span>
				) }
			</span>
			<span className="sp-shaped-gallery-card__label">{ layout.label }</span>
		</button>
	);
}

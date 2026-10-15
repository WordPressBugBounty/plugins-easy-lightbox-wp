/**
 * A single layout card with its SVG thumbnail preview and a selected state.
 *
 * A `pro` layout (`PRO_LAYOUTS`) is drawn as WP Carousel Free draws its locked
 * cards, and opens the upgrade page in a new tab instead of selecting. It never
 * calls `onSelect`, carries no pressed state (it is not a choice) and is never
 * shown as selected, even if a stored layout happens to share its id.
 *
 * Two treatments, by size. The full-size picker card is marked at REST — dimmed,
 * with a small "PRO" pill in its corner — and on hover the pill gives way to an
 * overlay over the whole card with a centred "Upgrade to Pro" button
 * (`ProCardBadge`). Marked at
 * rest because the picker is where a user scans every layout at once, and a badge
 * that only appears under the pointer hides which cards are locked. The compact
 * Change Layout swatch is 96px wide with its label in a footer band, so it keeps
 * the centred "PRO" pill that rises on hover (`ProBadge`).
 */
import { __, sprintf } from '@wordpress/i18n';
import { CheckCircleIcon } from '@shaped-gallery/icons';
import { ProBadge, ProCardBadge, openUpgrade } from '@shaped-gallery/components';

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
	if ( layout.pro ) {
		return <LockedLayoutCard layout={ layout } compact={ compact } />;
	}

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

/**
 * A Pro layout's card: same frame and artwork as a real one, but it upgrades
 * rather than selects.
 *
 * @param {Object}  props
 * @param {Object}  props.layout    Layout definition (`pro: true`).
 * @param {boolean} [props.compact] Change Layout popover variant.
 * @return {JSX.Element} Card.
 */
function LockedLayoutCard( { layout, compact = false } ) {
	return (
		<button
			type="button"
			className={ `sp-shaped-gallery-card sp-shaped-gallery-pro-locked ${
				compact ? 'is-compact' : 'has-corner-badge'
			}` }
			data-layout={ layout.id }
			aria-label={ sprintf(
				/* translators: %s: layout name, e.g. "Metro". */
				__( '%s — available in Pro (opens the upgrade page in a new tab)', 'easy-lightbox-wp' ),
				layout.label
			) }
			onClick={ openUpgrade }
		>
			<span className="sp-shaped-gallery-card__preview">
				<LayoutPreview layout={ layout } />
				{ compact && <ProBadge /> }
			</span>
			<span className="sp-shaped-gallery-card__label">{ layout.label }</span>
			{ ! compact && <ProCardBadge /> }
		</button>
	);
}

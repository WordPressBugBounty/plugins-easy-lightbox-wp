/**
 * One gallery row: select, title, shortcode, date, actions.
 *
 * The title links to the native block editor (`editUrl` comes from the REST payload,
 * built by GalleryEditor::edit_url()), so there is no second URL format in JS to keep
 * in step with the PHP one.
 */
import { Tooltip } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { ShortcodeField } from '@shaped-gallery/components';
import { PencilIcon, DuplicateIcon, TrashIcon } from '@shaped-gallery/icons';

/** Hover delay before an action tooltip opens, matching the sibling plugin's table. */
const TOOLTIP_DELAY = 300;

/**
 * @param {Object}   props
 * @param {Object}   props.gallery     Gallery row from REST.
 * @param {Object}   props.copy        Localized manage-screen copy.
 * @param {boolean}  props.selected    Whether the row is checked.
 * @param {Function} props.onSelect    Select handler, called with (id, checked).
 * @param {Function} props.onDuplicate Duplicate handler, called with the gallery.
 * @param {Function} props.onDelete    Delete handler, called with the gallery.
 * @param {boolean}  props.busy        Whether a request is in flight.
 * @return {JSX.Element} Row.
 */
export default function GalleryRow( {
	gallery,
	copy,
	selected,
	onSelect,
	onDuplicate,
	onDelete,
	busy,
} ) {
	const title = gallery.title || copy.untitledLabel || __( '(no title)', 'easy-lightbox-wp' );
	const rowLabel = sprintf(
		/* translators: %s: title of the item being selected. */
		__( 'Select %s', 'easy-lightbox-wp' ),
		title
	);
	const actions = copy.actions || {};

	return (
		<tr className="sp-shaped-gallery-manage__row">
			<td className="sp-shaped-gallery-manage__cell sp-shaped-gallery-manage__cell--check">
				<input
					type="checkbox"
					checked={ selected }
					aria-label={ rowLabel }
					onChange={ ( event ) => onSelect( gallery.id, event.target.checked ) }
				/>
			</td>

			<td className="sp-shaped-gallery-manage__cell sp-shaped-gallery-manage__cell--title">
				<a className="sp-shaped-gallery-manage__title" href={ gallery.editUrl }>
					{ title }
				</a>
				{ /* Layout + item count are what distinguish two similarly named
				   galleries; the design has no column for them, so they ride
				   under the title. */ }
				<span className="sp-shaped-gallery-manage__meta">
					{ gallery.layoutLabel }
					{ ' · ' }
					{ sprintf(
						/* translators: %d: number of images in the gallery. */
						__( '%d items', 'easy-lightbox-wp' ),
						Number( gallery.count || 0 )
					) }
				</span>
			</td>

			<td className="sp-shaped-gallery-manage__cell sp-shaped-gallery-manage__cell--shortcode">
				<ShortcodeField
					value={ gallery.shortcode }
					label={ sprintf(
						/* translators: %s: gallery title. */
						__( 'Shortcode for %s', 'easy-lightbox-wp' ),
						title
					) }
					copyLabel={ copy.copyLabel }
					copiedLabel={ copy.copiedLabel }
				/>
			</td>

			<td className="sp-shaped-gallery-manage__cell sp-shaped-gallery-manage__cell--date">
				<span className="sp-shaped-gallery-manage__status">{ gallery.statusLabel }</span>
				<span className="sp-shaped-gallery-manage__date">{ gallery.date }</span>
			</td>

			<td className="sp-shaped-gallery-manage__cell sp-shaped-gallery-manage__cell--actions">
				{ /*
				 * Tooltips, not `title`: the native attribute is styled by the browser
				 * (so it cannot follow the design), opens after a fixed ~1s delay, and
				 * never appears on keyboard focus. Core's Tooltip does all three, and
				 * the label it shows is the short verb — the row's own name stays on
				 * `aria-label`, where it disambiguates one row's Delete from another's
				 * without repeating the title in a bubble on every hover.
				 */ }
				<div className="sp-shaped-gallery-manage__actions">
					<Tooltip
						text={ actions.edit || __( 'Edit', 'easy-lightbox-wp' ) }
						delay={ TOOLTIP_DELAY }
						placement="top"
					>
						<a
							className="sp-shaped-gallery-manage__action"
							href={ gallery.editUrl }
							aria-label={ `${ actions.edit || __( 'Edit', 'easy-lightbox-wp' ) }: ${ title }` }
						>
							<PencilIcon />
						</a>
					</Tooltip>
					<Tooltip
						text={ actions.duplicate || __( 'Duplicate', 'easy-lightbox-wp' ) }
						delay={ TOOLTIP_DELAY }
						placement="top"
					>
						<button
							type="button"
							className="sp-shaped-gallery-manage__action"
							onClick={ () => onDuplicate( gallery ) }
							disabled={ busy }
							aria-label={ `${ actions.duplicate || __( 'Duplicate', 'easy-lightbox-wp' ) }: ${ title }` }
						>
							<DuplicateIcon />
						</button>
					</Tooltip>
					<Tooltip
						text={ actions.delete || __( 'Delete', 'easy-lightbox-wp' ) }
						delay={ TOOLTIP_DELAY }
						placement="top"
					>
						<button
							type="button"
							className="sp-shaped-gallery-manage__action sp-shaped-gallery-manage__action--danger"
							onClick={ () => onDelete( gallery ) }
							disabled={ busy }
							aria-label={ `${ actions.delete || __( 'Delete', 'easy-lightbox-wp' ) }: ${ title }` }
						>
							<TrashIcon />
						</button>
					</Tooltip>
				</div>
			</td>
		</tr>
	);
}

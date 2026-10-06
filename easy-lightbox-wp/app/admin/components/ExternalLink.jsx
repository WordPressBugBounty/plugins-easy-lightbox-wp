/**
 * ExternalLink — an outbound anchor that cannot forget its affordances.
 *
 * Every link out of the dashboard goes through this component so `target`, `rel`,
 * the arrow glyph and the screen-reader "opens in a new tab" hint stay consistent
 * across the ~20 outbound links on the screen.
 */
import { __ } from '@wordpress/i18n';
import { ExternalLinkIcon } from '@shaped-gallery/icons';

/**
 * @param {Object}   props
 * @param {string}   props.href        Destination.
 * @param {Node}     props.children    Link text.
 * @param {string}   [props.className] Extra class.
 * @param {boolean}  [props.showIcon]  Whether to append the trailing glyph.
 * @param {Function} [props.icon]      Glyph component, when the default box-arrow is
 *                                     not the one the design uses (section headings
 *                                     take a bare diagonal arrow).
 * @return {(JSX.Element|null)} Link, or null when there is no destination.
 */
export default function ExternalLink( {
	href,
	children,
	className = '',
	showIcon = true,
	icon: Icon = ExternalLinkIcon,
} ) {
	if ( ! href ) {
		return null;
	}

	return (
		<a
			className={ `sp-shaped-gallery-dash-extlink ${ className }`.trim() }
			href={ href }
			target="_blank"
			rel="noreferrer"
		>
			{ children }
			{ showIcon && (
				<span className="sp-shaped-gallery-dash-extlink__icon" aria-hidden="true">
					<Icon />
				</span>
			) }
			<span className="sp-shaped-gallery-dash-sr">
				{ __( '(opens in a new tab)', 'easy-lightbox-wp' ) }
			</span>
		</a>
	);
}

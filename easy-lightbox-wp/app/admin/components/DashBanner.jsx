/**
 * DashBanner — the dashboard's one full-width introduction card.
 *
 * The design draws this card TWICE with identical geometry and two sets of copy:
 * the Dashboard's "Build Beautiful Galleries in Minutes" and Saved Galleries'
 * "Create Reusable Saved Galleries". Same 14px-radius surface, same 40/44 padding,
 * same two equal columns — only the words and the artwork photo differ. So it is
 * one component with an image prop rather than two components that would drift the
 * moment one padding value changes (§18).
 *
 * The artwork carries no information the copy does not — it stands in for "your
 * photos go here" — so the whole figure is `aria-hidden` and the card is named by
 * its heading.
 */
import { useInstanceId } from '@wordpress/compose';

/**
 * @param {Object} props
 * @param {string} props.heading       Card heading.
 * @param {string} [props.description] Supporting sentence.
 * @param {string} [props.artUrl]      Artwork image src; the figure is skipped without one.
 * @param {string} [props.artAlt]      Alt text (the figure is `aria-hidden`, so this is belt-and-braces).
 * @param {Node}   props.children      The action buttons.
 * @return {JSX.Element} Banner card.
 */
export default function DashBanner( { heading, description, artUrl, artAlt = '', children } ) {
	const headingId = `sp-shaped-gallery-dash-banner-${ useInstanceId( DashBanner ) }`;

	return (
		<section className="sp-shaped-gallery-dash-banner" aria-labelledby={ headingId }>
			<div className="sp-shaped-gallery-dash-banner__text">
				<h2 id={ headingId } className="sp-shaped-gallery-dash-banner__title">
					{ heading }
				</h2>

				{ description && (
					<p className="sp-shaped-gallery-dash-banner__desc">{ description }</p>
				) }

				<div className="sp-shaped-gallery-dash-banner__actions">{ children }</div>
			</div>

			{ artUrl && (
				<div className="sp-shaped-gallery-dash-banner__art" aria-hidden="true">
					<img className="sp-shaped-gallery-dash-banner__art-image" src={ artUrl } alt={ artAlt } />
				</div>
			) }
		</section>
	);
}

/**
 * FooterBar — the dashboard's own footer: credit, social links.
 *
 * Rendered inside the SPA and paired with a rule that hides `#wpfooter` on this
 * screen, because the design is a bar with SVG social glyphs — more than
 * WordPress's two footer slots (`admin_footer_text` / `update_footer`) can express
 * without printing markup from PHP.
 *
 * A `footer` element rather than a `div`, but NOT `role="contentinfo"`: the WordPress
 * admin page already has one, and a second would make the landmark ambiguous. It sits
 * outside `<main>` so route changes never move focus into it.
 */
import {
	HeartIcon,
	LinkedInIcon,
	XIcon,
	WordPressIcon,
	FacebookIcon,
	YouTubeIcon,
} from '@shaped-gallery/icons';
import { useConfig } from '../ConfigContext';

/**
 * `socials[].id` ⇒ glyph. An unknown id renders no icon rather than a broken one, so
 * a filtered-in network degrades to a text link.
 *
 * @type {Object}
 */
const SOCIAL_ICONS = {
	linkedin: LinkedInIcon,
	x: XIcon,
	wordpress: WordPressIcon,
	facebook: FacebookIcon,
	youtube: YouTubeIcon,
};

/**
 * @return {(JSX.Element|null)} Footer, or null when nothing is configured.
 */
export default function FooterBar() {
	const { footer } = useConfig();
	const socials = footer?.socials || [];

	if ( ! footer?.creditLinkLabel && ! socials.length ) {
		return null;
	}

	return (
		<footer className="sp-shaped-gallery-dash__footer">
			<div className="sp-shaped-gallery-dash-footer">
				<p className="sp-shaped-gallery-dash-footer__credit">
					{ footer.creditPrefix }{ ' ' }
					<span className="sp-shaped-gallery-dash-footer__heart" aria-hidden="true">
						<HeartIcon />
					</span>{ ' ' }
					{ footer.creditMiddle }{ ' ' }
					<a href={ footer.creditLinkUrl } target="_blank" rel="noreferrer">
						{ footer.creditLinkLabel }
					</a>
				</p>

				{ !! socials.length && (
					<div className="sp-shaped-gallery-dash-footer__social">
						<span className="sp-shaped-gallery-dash-footer__sociallabel">
							{ footer.socialLabel }
						</span>
						<ul className="sp-shaped-gallery-dash-footer__sociallist">
							{ socials.map( ( social ) => {
								const Icon = SOCIAL_ICONS[ social.id ];

								return (
									<li key={ social.id }>
										<a
											className="sp-shaped-gallery-dash-footer__sociallink"
											href={ social.url }
											target="_blank"
											rel="noreferrer"
											aria-label={ social.label }
										>
											{ Icon ? <Icon /> : social.label }
										</a>
									</li>
								);
							} ) }
						</ul>
					</div>
				) }
			</div>
		</footer>
	);
}

/**
 * SupportBubble — the floating support affordance in the corner of the dashboard.
 *
 * With a Crisp website id configured, Crisp is loaded and draws its own launcher,
 * so this component renders nothing (two bubbles would be worse than one). With no
 * id — chat switched off via an empty `SHAPED_GALLERY_CRISP_WEBSITE_ID` — it falls
 * back to a link to the support page, so the affordance exists either way.
 */
import { useEffect } from '@wordpress/element';
import { ChatBubbleIcon } from '@shaped-gallery/icons';
import { useConfig } from '../ConfigContext';
import { initCrisp } from '../live-chat';

/**
 * @return {(JSX.Element|null)} Fallback bubble, or null when Crisp owns it.
 */
export default function SupportBubble() {
	const { liveChat } = useConfig();
	const websiteId = liveChat?.websiteId || '';

	useEffect( () => {
		initCrisp( websiteId );
	}, [ websiteId ] );

	if ( websiteId ) {
		return null;
	}

	if ( ! liveChat?.fallbackUrl ) {
		return null;
	}

	return (
		<a
			className="sp-shaped-gallery-dash-support"
			href={ liveChat.fallbackUrl }
			target="_blank"
			rel="noreferrer"
			title={ liveChat.label }
		>
			<span aria-hidden="true">
				<ChatBubbleIcon />
			</span>
			<span className="sp-shaped-gallery-dash-sr">{ liveChat.openLabel }</span>
		</a>
	);
}

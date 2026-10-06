/**
 * HelpCenter — the header's outbound help menu.
 *
 * A disclosure button plus a list of external links, opened instantly on
 * hover/focus but closed on a short debounce rather than a raw CSS
 * `:hover`/`:focus-within` toggle. Pure CSS hover looks equivalent but is
 * brittle in exactly the way this menu used to fail: the moment the pointer
 * is over ANY pixel outside the wrapper-plus-list chain — one frame of a fast
 * or diagonal move, an automation tool's synthetic jump, a sub-pixel rounding
 * gap — `:hover` drops, the list's `pointer-events` snap back to `none`
 * instantly (unlike opacity, that isn't transitioned), and it can no longer be
 * re-entered from where the pointer already is; only going back to the button
 * reopens it. A short grace period before actually closing (cancelled the
 * instant the pointer/focus returns) is how real nav menus solve this — it is
 * forgiving of exactly the mouse paths that broke the CSS-only version.
 *
 * The list stays mounted at all times; only the `is-open` class changes, so
 * there is no remount race either.
 */
import { useState, useRef, useEffect } from '@wordpress/element';
import {
	HelpCenterIcon,
	DocsIcon,
	SupportIcon,
	VideoTutorialIcon,
	FeatureRequestIcon,
	WhatsNewIcon,
	BlogIcon,
	CommunityIcon,
	ArrowUpRightIcon,
} from '@shaped-gallery/icons';
import ExternalLink from './ExternalLink';

const ITEM_ICONS = {
	whatsnew: WhatsNewIcon,
	docs: DocsIcon,
	support: SupportIcon,
	video: VideoTutorialIcon,
	request: FeatureRequestIcon,
	blog: BlogIcon,
	community: CommunityIcon,
};

const CLOSE_DELAY_MS = 300;

/**
 * @param {Object} props
 * @param {Object} props.helpCenter Localized `{ label, items }`.
 * @return {(JSX.Element|null)} Menu, or null with no items.
 */
export default function HelpCenter( { helpCenter } ) {
	const [ open, setOpen ] = useState( false );
	const wrapperRef = useRef( null );
	const closeTimer = useRef( null );

	const items = helpCenter?.items || [];

	const clearCloseTimer = () => {
		if ( closeTimer.current ) {
			clearTimeout( closeTimer.current );
			closeTimer.current = null;
		}
	};

	useEffect( () => clearCloseTimer, [] );

	if ( ! items.length ) {
		return null;
	}

	const openNow = () => {
		clearCloseTimer();
		setOpen( true );
	};

	const scheduleClose = () => {
		clearCloseTimer();
		closeTimer.current = setTimeout( () => setOpen( false ), CLOSE_DELAY_MS );
	};

	const onBlur = ( event ) => {
		if ( ! wrapperRef.current?.contains( event.relatedTarget ) ) {
			scheduleClose();
		}
	};

	const onKeyDown = ( event ) => {
		if ( 'Escape' !== event.key ) {
			return;
		}
		clearCloseTimer();
		setOpen( false );
		wrapperRef.current?.querySelector( ':focus' )?.blur();
	};

	return (
		<div
			ref={ wrapperRef }
			className={ `sp-shaped-gallery-dash-help${ open ? ' is-open' : '' }` }
			onMouseEnter={ openNow }
			onMouseLeave={ scheduleClose }
			onFocus={ openNow }
			onBlur={ onBlur }
			onKeyDown={ onKeyDown }
		>
			<button
				type="button"
				className="sp-shaped-gallery-dash-help__toggle"
				aria-haspopup="menu"
				aria-expanded={ open }
			>
				<span className="sp-shaped-gallery-dash-help__icon" aria-hidden="true">
					<HelpCenterIcon />
				</span>
				{ helpCenter.label }
			</button>

			<ul className="sp-shaped-gallery-dash-help__list" role="menu">
				{ items.map( ( item ) => {
					const Icon = ITEM_ICONS[ item.id ];
					return (
						<li key={ item.url || item.id }>
							<ExternalLink
								className="sp-shaped-gallery-dash-help__link"
								href={ item.url }
								showIcon={ false }
							>
								{ Icon && (
									<span className="sp-shaped-gallery-dash-help__itemicon" aria-hidden="true">
										<Icon />
									</span>
								) }
								<span className="sp-shaped-gallery-dash-help__itemlabel">{ item.label }</span>
								<span className="sp-shaped-gallery-dash-help__arrow" aria-hidden="true">
									<ArrowUpRightIcon />
								</span>
							</ExternalLink>
						</li>
					);
				} ) }
			</ul>
		</div>
	);
}

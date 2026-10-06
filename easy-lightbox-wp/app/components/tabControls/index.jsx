/**
 * TabControls — a wrapper over the core `TabPanel` that renders up to four
 * inspector tab bodies (General / Style / Visibility / Advanced) passed as
 * component props. Only tabs whose body prop is provided are shown; the active
 * body receives `attributes` + `setAttributes`. Tab order is fixed (Advanced
 * last, the conventional page-builder order); it does not follow prop order.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes      Block attributes, forwarded to each tab body.
 * @param {Function} props.setAttributes   setAttributes, forwarded to each tab body.
 * @param {Function} [props.GeneralTab]    General tab body component.
 * @param {Function} [props.StyleTab]      Style tab body component.
 * @param {Function} [props.AdvancedTab]   Advanced tab body component.
 * @param {Function} [props.VisibilityTab] Visibility tab body component.
 * @param {Object}   [props.labels]        Optional per-tab title overrides,
 *                                         keyed by tab name (e.g. `{ general: 'Settings' }`).
 *                                         Defaults keep the standard tab titles.
 * @param {boolean}  [props.showIcons]     Whether the General/Style/Advanced tabs show their
 *                                         leading icon. Defaults to `true`; Advanced Settings
 *                                         turns it off to match its icon-less Visibility tab.
 * @param {string}   [props.initialTab]    Initially active tab name.
 * @param {Function} [props.onSelect]      Called with the newly selected tab name.
 * @return {JSX.Element} Tab panel.
 */
import { TabPanel } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { GeneralIcon, StyleIcon, AdvancedIcon } from '@shaped-gallery/icons';
import './editor.scss';

function TabControls( {
	attributes,
	setAttributes,
	GeneralTab,
	StyleTab,
	AdvancedTab,
	VisibilityTab,
	labels = {},
	showIcons = true,
	initialTab = 'general',
	onSelect = () => {},
} ) {
	const tabs = [];

	if ( GeneralTab ) {
		tabs.push( {
			name: 'general',
			title: (
				<span className="sp-shaped-gallery-tab-panel__title">
					{ showIcons && <GeneralIcon /> } { labels.general || __( 'General', 'easy-lightbox-wp' ) }
				</span>
			),
			className: 'sp-shaped-gallery-tab--general',
		} );
	}
	if ( StyleTab ) {
		tabs.push( {
			name: 'style',
			title: (
				<span className="sp-shaped-gallery-tab-panel__title">
					<StyleIcon /> { labels.style || __( 'Style', 'easy-lightbox-wp' ) }
				</span>
			),
			className: 'sp-shaped-gallery-tab--style',
		} );
	}
	if ( VisibilityTab ) {
		tabs.push( {
			name: 'visibility',
			title: (
				<span className="sp-shaped-gallery-tab-panel__title">
					{ labels.visibility || __( 'Visibility', 'easy-lightbox-wp' ) }
				</span>
			),
			className: 'sp-shaped-gallery-tab--visibility',
		} );
	}
	if ( AdvancedTab ) {
		tabs.push( {
			name: 'advanced',
			title: (
				<span className="sp-shaped-gallery-tab-panel__title">
					{ showIcons && <AdvancedIcon /> } { labels.advanced || __( 'Advanced', 'easy-lightbox-wp' ) }
				</span>
			),
			className: 'sp-shaped-gallery-tab--advanced',
		} );
	}

	const bodies = {
		general: GeneralTab,
		style: StyleTab,
		advanced: AdvancedTab,
		visibility: VisibilityTab,
	};

	return (
		<TabPanel
			className="sp-shaped-gallery-tab-panel"
			activeClass="is-active"
			initialTabName={ initialTab }
			onSelect={ onSelect }
			tabs={ tabs }
		>
			{ ( tab ) => {
				const Body = bodies[ tab.name ];
				return Body ? (
					<Body attributes={ attributes } setAttributes={ setAttributes } />
				) : null;
			} }
		</TabPanel>
	);
}

export default TabControls;

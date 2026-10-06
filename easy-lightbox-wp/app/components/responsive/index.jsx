/**
 * Responsive — inline device switcher (Desktop / Tablet / Mobile) rendered
 * beside responsive controls. Reads the active device from the shared
 * `useDeviceType` hook (lowercase) and dispatches the editor's preview device
 * type back (capitalized, as WordPress stores it), so per-device editing works
 * from within any control header without a separate toolbar.
 *
 * @return {JSX.Element} Switcher.
 */
import { dispatch } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useDeviceType } from '@shaped-gallery/hooks';
import { DesktopIcon, TabletIcon, MobileIcon } from '@shaped-gallery/icons';
import '../shared.scss';

/** Device rows: [ lowercase key (host), WP-stored value, glyph, label ]. */
const DEVICES = [
	{ key: 'desktop', wp: 'Desktop', Icon: DesktopIcon, label: __( 'Desktop', 'easy-lightbox-wp' ) },
	{ key: 'tablet', wp: 'Tablet', Icon: TabletIcon, label: __( 'Tablet', 'easy-lightbox-wp' ) },
	{ key: 'mobile', wp: 'Mobile', Icon: MobileIcon, label: __( 'Mobile', 'easy-lightbox-wp' ) },
];

/**
 * Push the preview device type to whichever editor store is active.
 *
 * @param {string} wpDevice Capitalized device value ('Desktop'|'Tablet'|'Mobile').
 */
function setPreviewDevice( wpDevice ) {
	const inSiteEditor =
		document.getElementsByClassName( 'edit-site-visual-editor__editor-canvas' ).length > 0;
	const store = inSiteEditor ? 'core/edit-site' : 'core/edit-post';
	dispatch( store )?.__experimentalSetPreviewDeviceType?.( wpDevice );
}

export default function Responsive() {
	const device = useDeviceType();
	const Active = ( DEVICES.find( ( d ) => d.key === device ) || DEVICES[ 0 ] ).Icon;

	return (
		<div className="sp-shaped-gallery-responsive">
			<span className="sp-shaped-gallery-responsive__current">
				<Active />
			</span>
			<div className="sp-shaped-gallery-responsive__menu">
				{ DEVICES.map( ( { key, wp, Icon, label } ) => (
					<Button
						key={ key }
						label={ label }
						showTooltip
						className={ device === key ? 'is-active' : '' }
						onClick={ () => setPreviewDevice( wp ) }
					>
						<Icon />
					</Button>
				) ) }
			</div>
		</div>
	);
}

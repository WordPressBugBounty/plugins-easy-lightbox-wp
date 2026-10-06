/**
 * Left sidebar of the media modal: gallery actions + the data-driven media-source
 * list ("Add media from"). Every source in the registry is wired and actionable —
 * there are no locked teasers. New source groups (e.g. a future Connect & Import)
 * appear automatically from the registry — no change here.
 */
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { SOURCE_ICONS } from '@shaped-gallery/icons';
import { MEDIA_SOURCE_GROUPS } from './media-sources.data';

/**
 * Top "Actions" group — the two modes this modal exposes.
 */
const MODAL_ACTIONS = [
	{ id: 'edit', label: __( 'Edit Gallery', 'easy-lightbox-wp' ) },
	{ id: 'add', label: __( 'Add to Gallery', 'easy-lightbox-wp' ) },
];

/**
 * @param {Object}   props
 * @param {string}   props.mode           Active modal mode ('add' | 'edit').
 * @param {Function} props.onSelectMode   Switch mode.
 * @param {string}   props.activeSource   Active source id.
 * @param {Function} props.onSelectSource Pick a source.
 * @return {JSX.Element} Sidebar.
 */
export default function MediaSidebar( { mode, onSelectMode, activeSource, onSelectSource } ) {
	const renderSource = ( item ) => {
		const active = 'add' === mode && activeSource === item.id;
		return (
			<li key={ item.id }>
				<button
					type="button"
					className={ `sp-shaped-gallery-source__item${ active ? ' is-active' : '' }` }
					aria-current={ active ? 'true' : undefined }
					onClick={ () => onSelectSource( item.id ) }
				>
					<span className="sp-shaped-gallery-source__icon">
						<Icon icon={ SOURCE_ICONS[ item.icon ] } size={ 20 } />
					</span>
					<span className="sp-shaped-gallery-source__label">{ item.label }</span>
				</button>
			</li>
		);
	};

	return (
		<nav className="sp-shaped-gallery-media-modal__sidebar" aria-label={ __( 'Media sources', 'easy-lightbox-wp' ) }>
			<div className="sp-shaped-gallery-source__group">
				<h3 className="sp-shaped-gallery-source__heading">{ __( 'Actions', 'easy-lightbox-wp' ) }</h3>
				<ul className="sp-shaped-gallery-source__list">
					{ MODAL_ACTIONS.map( ( action ) => (
						<li key={ action.id }>
							<button
								type="button"
								className={ `sp-shaped-gallery-source__item sp-shaped-gallery-source__item--action${ mode === action.id ? ' is-active' : '' }` }
								aria-current={ mode === action.id ? 'true' : undefined }
								onClick={ () => onSelectMode( action.id ) }
							>
								<span className="sp-shaped-gallery-source__label">{ action.label }</span>
							</button>
						</li>
					) ) }
				</ul>
			</div>

			{ MEDIA_SOURCE_GROUPS.map( ( group ) => (
				<div className="sp-shaped-gallery-source__group" key={ group.id }>
					<h3 className="sp-shaped-gallery-source__heading">{ group.label }</h3>
					<ul className="sp-shaped-gallery-source__list">{ group.items.map( renderSource ) }</ul>
				</div>
			) ) }
		</nav>
	);
}

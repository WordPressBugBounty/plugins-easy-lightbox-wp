/**
 * Shared React hooks.
 */
import { useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { getRandomId } from '@shaped-gallery/controls';

/**
 * Ensure the block has a stable unique id attribute.
 *
 * @param {Object}   props
 * @param {string}   props.uniqueId Current uniqueId attribute.
 * @param {string}   props.clientId Block client id.
 * @param {Function} props.setAttr  setAttributes.
 * @return {string} The unique id.
 */
export function useUniqueId( { uniqueId, clientId, setAttr } ) {
	useEffect( () => {
		if ( ! uniqueId ) {
			setAttr( { uniqueId: 'sp-shaped-gallery-' + getRandomId() + '-' + ( clientId || '' ).slice( 0, 6 ) } );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );
	return uniqueId;
}

/**
 * Current editor device preview ('Desktop' | 'Tablet' | 'Mobile' → lowercased).
 *
 * @return {('desktop'|'tablet'|'mobile')} Active device.
 */
export function useDeviceType() {
	const device = useSelect( ( select ) => {
		const editPost = select( 'core/edit-post' );
		const editSite = select( 'core/edit-site' );
		const fromPost = editPost?.__experimentalGetPreviewDeviceType?.();
		const fromSite = editSite?.__experimentalGetPreviewDeviceType?.();
		return fromPost || fromSite || 'Desktop';
	}, [] );
	return ( device || 'Desktop' ).toLowerCase();
}

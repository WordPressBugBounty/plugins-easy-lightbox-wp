/**
 * Resolves the gallery's attachments to the rendition its Image Resolution setting
 * delivers, for the editor canvas — see `lib/image-source` for why the stored URL
 * cannot be trusted to be that.
 *
 * One batched `/wp/v2/media?include=…` read per 100 ids, served from core-data's
 * cache, so a gallery costs the same requests core's own Gallery block does and a
 * re-render re-reads nothing. Items without a numeric id (External Images) have no
 * attachment to ask about and keep their stored URL.
 */
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { useMemo } from '@wordpress/element';
import { sizeUrl } from '@shaped-gallery/lib/image-source';

/** The REST collection's own `per_page` ceiling. */
const CHUNK = 100;

/** Only what `sizeUrl()` reads — the full record carries every size's metadata and more. */
const FIELDS = 'id,source_url,media_details';

/**
 * @param {Array}  items      MediaItem[].
 * @param {string} resolution Registered size name from Image & Video Settings.
 * @return {Object} Map of attachment id => URL at that size (empty until loaded).
 */
export function useImageSources( items, resolution ) {
	// A stable string key: the id list as a whole is what the query depends on, and a
	// fresh array every render would re-run the selector for nothing.
	const idKey = ( items || [] )
		.filter( ( item ) => 'number' === typeof item.id && 'video' !== item.type )
		.map( ( item ) => item.id )
		.join( ',' );

	const records = useSelect(
		( select ) => {
			if ( ! idKey ) {
				return [];
			}
			const ids = idKey.split( ',' ).map( Number );
			const { getEntityRecords } = select( coreStore );
			const out = [];
			for ( let i = 0; i < ids.length; i += CHUNK ) {
				const page = getEntityRecords( 'postType', 'attachment', {
					include: ids.slice( i, i + CHUNK ),
					per_page: CHUNK,
					_fields: FIELDS,
				} );
				if ( page ) {
					out.push( ...page );
				}
			}
			return out;
		},
		[ idKey ]
	);

	return useMemo( () => {
		const map = {};
		( records || [] ).forEach( ( media ) => {
			const url = sizeUrl( media, resolution );
			if ( url ) {
				map[ media.id ] = url;
			}
		} );
		return map;
	}, [ records, resolution ] );
}

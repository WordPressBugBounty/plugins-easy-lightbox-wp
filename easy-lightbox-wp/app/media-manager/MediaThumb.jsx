/**
 * Thumbnail media for a MediaItem inside the media manager (browse grid, reorder
 * tiles, details preview).
 *
 * Images — and videos that have a poster image — render an `<img>`. A poster-less
 * video has no image thumbnail; its `url`/`full` point at the raw video file, so
 * feeding that to an `<img>` would show a broken-image icon (the Videos-tab bug).
 * Instead render a muted `<video>` first frame, mirroring how the frontend
 * LayoutRenderer draws a poster-less video. No className is set — the parent grid's
 * `img, video` selector styles it.
 */
import { __ } from '@wordpress/i18n';
import { firstFrameSrc } from '@shaped-gallery/lib/video-poster';

/**
 * @param {Object} props
 * @param {Object} props.item MediaItem.
 * @return {JSX.Element} An <img> or <video> preview element.
 */
export default function MediaThumb( { item } ) {
	const isVideo = 'video' === item.type;
	const hasPoster = !! item.poster;

	if ( isVideo && ! hasPoster ) {
		return (
			<video
				src={ firstFrameSrc( item.full || item.url || '' ) }
				muted
				preload="metadata"
				playsInline
				aria-label={ item.title || __( 'Video', 'easy-lightbox-wp' ) }
			/>
		);
	}

	return (
		<img
			src={ item.thumb || item.url }
			alt={ item.alt || '' }
			width={ item.width || undefined }
			height={ item.height || undefined }
			loading="lazy"
			decoding="async"
		/>
	);
}

/**
 * Editor-canvas preview of the gallery. Emits the same markup the PHP renderer
 * produces and runs the SAME layout-math (justify / masonry) so the editor
 * matches the frontend pixel-for-pixel.
 *
 * Each tile carries the Content Settings block (`<ItemContent>` — the mirror of
 * LayoutRenderer::content_markup()) and each container the panel's
 * `--sp-shaped-gallery-ct-*` properties, because every layout's figures go through
 * `render_item()` on the front end.
 */
import { useRef } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { resolveResponsive } from "@shaped-gallery/lib/layout-math";
import { resolveResponsiveNumber } from "@shaped-gallery/lib/responsive";
import {
	geometryStyle,
	effectiveRowHeight,
	imageVideoStyle,
	imageVideoClasses,
	contentStyle,
} from "@shaped-gallery/lib/style";
import { firstFrameSrc, showsFirstFrame } from "@shaped-gallery/lib/video-poster";
import { useDeviceType } from "@shaped-gallery/hooks";
import { useMeasuredLayout } from "./useMeasuredLayout";
import { useImageSources } from "./useImageSources";
import { editorImageSrc } from "@shaped-gallery/lib/image-source";
import ItemContent from "./ItemContent";

/**
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @return {JSX.Element} Preview.
 */
export default function GalleryPreview({ attributes }) {
	const { layout, items = [], rowHeightMode, maxRowHeight, columns, horizontalGap, verticalGap } = attributes;
	const containerRef = useRef(null);
	const device = useDeviceType();

	// Resolved exactly as the frontend runtime resolves them, so a 0 gap stays 0
	// rather than falling through to the default (§18).
	const gh = resolveResponsiveNumber(horizontalGap, device, 20);
	const gv = resolveResponsiveNumber(verticalGap, device, 20);
	const cols = resolveResponsive(columns, device) || 4;

	// Draw each attachment at the gallery's Image Resolution, as the renderer does.
	const sources = useImageSources(items, attributes.imageVideo?.resolution ?? "large");

	useMeasuredLayout(containerRef, {
		layout,
		items,
		rowHeightMode,
		maxRowHeight,
		gh,
		gv,
		cols,
		// Watched only — see the hook's doc: a Margin edit changes the box it writes.
		margin: attributes.margin,
		// Watched only, and for the same reason: both decide how tall a Classic
		// content block comes out, which is a height masonry packs its columns from.
		content: attributes.content,
		device,
	});

	if (!items.length) {
		return <p className="sp-shaped-gallery-preview__empty">{__("No images yet.", "easy-lightbox-wp")}</p>;
	}

	const style = {
		...geometryStyle({
			cols,
			gh,
			gv,
			row: effectiveRowHeight(rowHeightMode, maxRowHeight),
			unit: horizontalGap?.unit || "px",
			advanced: attributes.advanced,
			device,
		}),
		// Per-item image / video styling (border, radius, shadow, margin) for the
		// active device.
		...imageVideoStyle(attributes, device),
		// Image title / description styling for the active device.
		...contentStyle(attributes, device),
	};

	return (
		<div
			ref={containerRef}
			className={`sp-shaped-gallery sp-shaped-gallery--${layout} ${imageVideoClasses(attributes)}`.trim()}
			style={style}
			data-layout={layout}
		>
			{items.map((item, index) => {
				const isVideo = item.type === "video";
				// Poster-less FILE video shows its own first frame; everything else an
				// <img>. Same split LayoutRenderer::render_item() makes (§18).
				const posterless = showsFirstFrame(item);
				return (
					<figure
						key={`${item.id}-${index}`}
						className={`sp-shaped-gallery__item ${isVideo ? "sp-shaped-gallery__item--video" : ""}`}
						data-w={item.width || 4}
						data-h={item.height || 3}
					>
						{/* The media frame, exactly as LayoutRenderer::render_item() emits it: the
						 * box the measured layouts size, so a Classic content block gets its own
						 * flow height instead of being squeezed out of the tile. */}
						<div className="sp-shaped-gallery__frame">
							{posterless ? (
								<video
									className="sp-shaped-gallery__img"
									src={firstFrameSrc(item.full || item.url || "")}
									muted
									preload="metadata"
									playsInline
								/>
							) : (
								<img
									className="sp-shaped-gallery__img"
									src={editorImageSrc(item, sources)}
									alt={item.alt || ""}
								/>
							)}
							{isVideo && <span className="sp-shaped-gallery__playicon" aria-hidden="true" />}
						</div>
						<ItemContent item={item} content={attributes.content} />
					</figure>
				);
			})}
		</div>
	);
}

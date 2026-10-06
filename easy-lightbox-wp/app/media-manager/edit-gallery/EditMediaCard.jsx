/**
 * A single media tile in the Edit Gallery grid.
 *
 * Affordances:
 *   - thumbnail (background image, or a tone stand-in)
 *   - remove button (top-right) — removes the image from the gallery on click
 *   - video play indicator (centered, for `type: 'video'`)
 *   - hover state + selected/active state (CSS-driven)
 *
 * Clicking the thumbnail both *activates* the tile (drives the details panel) and
 * toggles its bulk selection, with Shift extending a range — the same gesture the
 * native Media Library grid uses.
 */
import { __, sprintf } from "@wordpress/i18n";
import { Icon, closeSmall } from "@wordpress/icons";

/**
 * Centered play glyph for video tiles.
 *
 * @return {JSX.Element} Icon.
 */
const PlayIcon = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
		<circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.55)" />
		<path d="M9.5 8.5v7l6-3.5-6-3.5z" fill="#fff" />
	</svg>
);

/**
 * @param {Object}   props
 * @param {Object}   props.item           MediaItem.
 * @param {boolean}  props.selected       Is the tile selected.
 * @param {boolean}  props.active         Is the tile the active details target.
 * @param {Function} props.onToggleSelect Toggle selection — receives ( id, { range } );
 *                                        `range` is true when Shift was held.
 * @param {Function} props.onActivate     Activate the tile for the details panel (id).
 * @param {Function} props.onRemove       Remove the tile from the gallery (id).
 * @return {JSX.Element} Figure.
 */
export default function EditMediaCard({
	item,
	selected,
	active,
	onToggleSelect,
	onActivate,
	onRemove,
}) {
	const isVideo = "video" === item.type;

	const className = [
		"sp-shaped-gallery-eg-card",
		selected ? "is-selected" : "",
		active ? "is-active" : "",
		isVideo ? "is-video" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<figure className={className}>
			<button
				type="button"
				className="sp-shaped-gallery-eg-card__thumb"
				aria-pressed={active}
				/* translators: %s: media title. */
				aria-label={sprintf(__("View details for %s", "easy-lightbox-wp"), item.title)}
				onClick={(event) => {
					// One gesture, two effects: activate the details panel AND toggle the
					// tile's bulk selection (Shift → range), mirroring the WP media grid.
					onActivate(item.id);
					onToggleSelect(item.id, { range: event.shiftKey });
				}}
			>
				<span
					className="sp-shaped-gallery-eg-card__img"
					style={item.thumb ? { backgroundImage: `url(${item.thumb})` } : { backgroundImage: item.tone }}
				/>
				<span className="sp-shaped-gallery-eg-card__scrim" aria-hidden="true" />

				{isVideo && (
					<span className="sp-shaped-gallery-eg-card__play">
						<PlayIcon />
					</span>
				)}

			</button>

			<button
				type="button"
				className="sp-shaped-gallery-eg-card__remove"
				aria-label={sprintf(
					/* translators: %s: media title. */
					__("Remove %s from the gallery", "easy-lightbox-wp"),
					item.title
				)}
				onClick={() => onRemove(item.id)}
			>
				<Icon icon={closeSmall} size={20} />
			</button>

			<figcaption className="sp-shaped-gallery-eg-card__caption" title={item.title}>
				{item.title}
			</figcaption>
		</figure>
	);
}

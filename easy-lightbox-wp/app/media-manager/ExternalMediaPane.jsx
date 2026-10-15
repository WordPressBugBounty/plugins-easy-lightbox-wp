/**
 * External-source pane: paste media URLs to stage them into the gallery without
 * uploading to the Media Library. Mirrors the Figma "Add Images" screen — an icon
 * header, the URL field + add action first, then a responsive preview grid of
 * the items staged from this source (each with a remove button).
 *
 * One component serves every paste-URL source. A `variant` ('image' | 'video' |
 * 'youtube') selects the copy, the resolve step (async DOM probe for direct media
 * URLs, a parsed id plus a best-effort oEmbed orientation lookup for YouTube) and
 * the preview element. Staged items live in the modal's selection; they are
 * committed to the block only when the modal's primary action fires.
 */
import { useState, useRef } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";
import { Icon, link, closeSmall } from "@wordpress/icons";
import {
	isValidUrl,
	makeExternalItem,
	loadImage,
	loadVideo,
	resolveYouTubeItem,
} from "./external";
import { isSelected } from "./selection";

/**
 * Per-variant copy + resolve step. Each `resolve(url)` returns a Promise for a
 * normalized MediaItem, rejecting with `Error('invalid')` for a syntactically
 * fine URL that is not a valid source (e.g. a non-YouTube link), else a probe
 * failure. Keeping resolve here removes the per-type branch from `add()`. Static
 * `__()` literals keep strings translatable (no concatenation).
 */
const COPY = {
	image: {
		title: __("Add Images", "easy-lightbox-wp"),
		desc: __("Paste image URLs to embed them in your gallery. You can add several at once.", "easy-lightbox-wp"),
		label: __("Image Link", "easy-lightbox-wp"),
		placeholder: __("Ex. https://example.com/image1234.jpeg", "easy-lightbox-wp"),
		add: __("Add Image", "easy-lightbox-wp"),
		invalid: __("Enter a valid image URL (http or https).", "easy-lightbox-wp"),
		duplicate: __("That image has already been added.", "easy-lightbox-wp"),
		failed: __("That URL could not be loaded as an image.", "easy-lightbox-wp"),
		remove: __("Remove image", "easy-lightbox-wp"),
		resolve: (url) => loadImage(url).then((dimensions) => makeExternalItem(url, { ...dimensions, type: "image" })),
	},
	video: {
		title: __("Add Videos", "easy-lightbox-wp"),
		desc: __("Paste video URLs to embed them in your gallery. You can add several at once.", "easy-lightbox-wp"),
		label: __("Video Link", "easy-lightbox-wp"),
		placeholder: __("Ex. https://example.com/video1234.mp4", "easy-lightbox-wp"),
		add: __("Add Video", "easy-lightbox-wp"),
		invalid: __("Enter a valid video URL (http or https).", "easy-lightbox-wp"),
		duplicate: __("That video has already been added.", "easy-lightbox-wp"),
		failed: __("That URL could not be loaded as a video.", "easy-lightbox-wp"),
		remove: __("Remove video", "easy-lightbox-wp"),
		resolve: (url) => loadVideo(url).then((dimensions) => makeExternalItem(url, { ...dimensions, type: "video" })),
	},
	youtube: {
		title: __("Add YouTube Videos", "easy-lightbox-wp"),
		desc: __("Paste YouTube links to embed them in your gallery. You can add several at once.", "easy-lightbox-wp"),
		label: __("YouTube Link", "easy-lightbox-wp"),
		placeholder: __("Ex. https://www.youtube.com/watch?v=dQw4w9WgXcQ", "easy-lightbox-wp"),
		add: __("Add Video", "easy-lightbox-wp"),
		invalid: __("Enter a valid YouTube URL.", "easy-lightbox-wp"),
		duplicate: __("That video has already been added.", "easy-lightbox-wp"),
		failed: __("That YouTube URL could not be added.", "easy-lightbox-wp"),
		remove: __("Remove video", "easy-lightbox-wp"),
		resolve: resolveYouTubeItem,
	},
};

/**
 * Failure copy shared by every variant — it describes the request, not the source.
 */
const SHARED_ERRORS = {
	timeout: __("That link took too long to respond. Check it and try again.", "easy-lightbox-wp"),
};

/**
 * Pick the message for a rejected `resolve`: `invalid` is variant copy, `timeout` is
 * shared, and anything else (a failed probe, an odd status) falls back to the
 * variant's `failed`.
 *
 * @param {Object} copy Variant copy.
 * @param {string} code Rejection code (`Error#message`).
 * @return {string} Message to show.
 */
const errorFor = (copy, code) => {
	const messages = { invalid: copy.invalid, ...SHARED_ERRORS };
	return messages[code] || copy.failed;
};

/**
 * @param {Object}           props
 * @param {string}           [props.variant]    Source variant — 'image' (default), 'video' or 'youtube'.
 * @param {Array}            props.items        Staged MediaItem[] for this source (preview grid).
 * @param {?(number|string)} [props.activeId]   Id of the item whose details are open (marks its card).
 * @param {Function}         [props.onActivate] Receives the item when its card is picked, to open its details.
 * @param {Function}         props.onAdd        Commit a validated MediaItem.
 * @param {Function}         props.onRemove     Remove a staged item by id.
 * @return {JSX.Element} Pane.
 */
export default function ExternalMediaPane({ variant = "image", items, activeId, onActivate, onAdd, onRemove }) {
	const copy = COPY[variant] || COPY.image;
	// Only a raw external video shows a <video> first-frame; image and the YouTube
	// variant render an <img> from a provider thumb. Every variant except plain
	// image carries a play overlay.
	const usesVideoTile = "video" === variant;
	const showsPlay = "image" !== variant;

	const [value, setValue] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const inputRef = useRef(null);

	const focusInput = () => inputRef.current?.focus();

	const add = () => {
		// The field stays focusable while a probe runs, so Enter can arrive mid-add.
		if (busy) {
			return;
		}
		const url = value.trim();

		if (!isValidUrl(url)) {
			setError(copy.invalid);
			return;
		}

		setBusy(true);
		setError("");
		// Dedup happens AFTER build: a YouTube item's id is the video id, not the
		// raw URL, so two paste-forms of the same video collapse to one.
		copy.resolve(url)
			.then((item) => {
				if (isSelected(items, item.id)) {
					setError(copy.duplicate);
					setBusy(false);
					return;
				}
				onAdd(item);
				setValue("");
				setBusy(false);
				focusInput();
			})
			.catch((err) => {
				setError(errorFor(copy, err.message));
				setBusy(false);
			});
	};

	const onKeyDown = (event) => {
		if ("Enter" === event.key) {
			event.preventDefault();
			add();
		}
	};

	return (
		<>
			<header className="sp-shaped-gallery-media-modal__header sp-shaped-gallery-external__header">
				<span className="sp-shaped-gallery-external__icon" aria-hidden="true">
					<Icon icon={link} size={24} />
				</span>
				<div className="sp-shaped-gallery-external__intro">
					<h1 className="sp-shaped-gallery-external__title">{copy.title}</h1>
					<p className="sp-shaped-gallery-external__desc">{copy.desc}</p>
				</div>
			</header>

			<div className="sp-shaped-gallery-media-modal__workspace sp-shaped-gallery-external">
				<div className="sp-shaped-gallery-external__form">
					<label className="sp-shaped-gallery-external__label" htmlFor="sp-shaped-gallery-external-url">
						{copy.label}
					</label>
					<div className="sp-shaped-gallery-external__row">
						<input
							ref={inputRef}
							id="sp-shaped-gallery-external-url"
							type="url"
							className="sp-shaped-gallery-external__input"
							placeholder={copy.placeholder}
							value={value}
							// readOnly, not disabled: disabling blurs the field, so focus
							// fell to <body> after every add and the next paste went nowhere.
							readOnly={busy}
							aria-busy={busy ? "true" : undefined}
							aria-invalid={error ? "true" : undefined}
							aria-describedby={error ? "sp-shaped-gallery-external-error" : undefined}
							onChange={(event) => {
								setValue(event.target.value);
								if (error) {
									setError("");
								}
							}}
							onKeyDown={onKeyDown}
						/>
						<button
							type="button"
							className="sp-shaped-gallery-btn sp-shaped-gallery-btn--primary sp-shaped-gallery-external__add"
							disabled={busy || "" === value.trim()}
							onClick={add}
						>
							{busy ? __("Adding…", "easy-lightbox-wp") : copy.add}
						</button>
					</div>
					{error && (
						<p id="sp-shaped-gallery-external-error" className="sp-shaped-gallery-external__error" role="alert">
							{error}
						</p>
					)}
				</div>
				{items.length > 0 && (
					<ul className="sp-shaped-gallery-external__grid">
						{items.map((item) => (
							<li
								key={item.id}
								className={`sp-shaped-gallery-external__card${showsPlay ? " is-video" : ""}${
									activeId === item.id ? " is-active" : ""
								}`}
							>
								{/* A sibling of the remove button, not its parent: nested buttons are invalid. */}
								<button
									type="button"
									className="sp-shaped-gallery-external__select"
									aria-pressed={activeId === item.id}
									aria-label={sprintf(
										/* translators: %s: title or URL of the staged item. */
										__("Show details for %s", "easy-lightbox-wp"),
										item.title || item.url
									)}
									onClick={() => onActivate?.(item)}
								>
									{usesVideoTile ? (
										<video src={item.url} muted preload="metadata" playsInline />
									) : (
										<img
											src={item.thumb || item.url}
											alt=""
											loading="lazy"
											decoding="async"
										/>
									)}
									{showsPlay && <span className="sp-shaped-gallery-external__play" aria-hidden="true" />}
								</button>
								<button
									type="button"
									className="sp-shaped-gallery-external__remove"
									aria-label={copy.remove}
									onClick={() => onRemove(item.id)}
								>
									<Icon icon={closeSmall} size={18} />
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</>
	);
}

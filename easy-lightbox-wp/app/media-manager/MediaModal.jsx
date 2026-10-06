/**
 * MediaModal — the Gallery Manager.
 *
 * Layout mirrors the Figma "Add to Gallery" screen: a source sidebar, an
 * Upload/Media-Library tab area with a date+search filter bar over a custom
 * REST-backed browsing grid, and an editable Attachment Details panel. The
 * sidebar's "Edit Gallery" action swaps the grid for the drag-reorder view of
 * the current selection (the existing MediaGrid).
 *
 * Selection is local and committed on confirm (Cancel/Escape discards), so the
 * gallery only changes when the user accepts — with one deliberate exception: a
 * permanent delete persists immediately (the attachment is irreversibly gone, so
 * keeping a dangling reference in the saved gallery would break it).
 */
import { Modal } from "@wordpress/components";
import { Icon, close } from "@wordpress/icons";
import { useState, useEffect, useRef } from "@wordpress/element";
import { __, sprintf, _n } from "@wordpress/i18n";
import MediaSidebar from "./MediaSidebar";
import MediaLibraryBrowser from "./MediaLibraryBrowser";
import FilterBar from "./FilterBar";
import AttachmentDetails from "./AttachmentDetails";
import UploadPane from "./UploadPane";
import MediaGrid from "./MediaGrid";
import ExternalMediaPane from "./ExternalMediaPane";
import { DEFAULT_SOURCE_ID, getSource } from "./media-sources.data";
import { mergeSelection, patchItem, isSelected } from "./selection";

const TABS = [
	{ id: "upload", label: __("Upload Files", "easy-lightbox-wp") },
	{ id: "library", label: __("Media Library", "easy-lightbox-wp") },
];

/**
 * Providers that get their own paste-a-page-URL + iframe-playback pane variant
 * (variant name === provider). Listed as data so adding an embed source stays a
 * one-line change here — no growing branch ladder.
 *
 * @type {string[]}
 */
const EMBED_VARIANTS = ["youtube"];

/**
 * Resolve the ExternalMediaPane variant for a source. Embed providers each map to
 * their own variant; other external sources split on media type.
 *
 * @param {Object} [source] Active source registry entry.
 * @return {string} 'youtube' | 'video' | 'image'.
 */
const externalVariantFor = (source) => {
	if (EMBED_VARIANTS.includes(source?.provider)) {
		return source.provider;
	}
	return "video" === source?.type ? "video" : "image";
};

/**
 * @param {Object}   props
 * @param {Array}    props.items           Current MediaItem[].
 * @param {Function} props.onChange        Persist updated MediaItem[].
 * @param {Function} props.onClose         Close handler (discards local changes).
 * @param {Function} [props.onEditGallery] Open the redesigned Edit Gallery modal
 *                                         instead of the internal edit mode.
 * @param {string}   [props.confirmLabel]  Footer confirm button label.
 * @return {JSX.Element} Modal.
 */
export default function MediaModal({
	items,
	onChange,
	onClose,
	onEditGallery,
	confirmLabel = __("Create a New Gallery", "easy-lightbox-wp"),
}) {
	const localize = window.shaped_gallery_data || window.shaped_gallery_admin || {};
	const months = localize.mediaMonths || [];

	const [mode, setMode] = useState("add");
	const [activeTab, setActiveTab] = useState("library");
	const [activeSource, setActiveSource] = useState(DEFAULT_SOURCE_ID);
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [month, setMonth] = useState("");
	const [selected, setSelected] = useState(items);
	// Range-select anchor: the last plainly-clicked tile a Shift-click ranges from.
	const [anchorId, setAnchorId] = useState(items[0]?.id ?? null);
	const [detail, setDetail] = useState(items[0] || null);

	// Keep onChange ref fresh to avoid stale closures inside event listeners
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	// Debounce the search field before it hits the REST query.
	useEffect(() => {
		const timer = window.setTimeout(() => setSearch(searchInput), 300);
		return () => window.clearTimeout(timer);
	}, [searchInput]);

	const source = getSource(activeSource);
	const isExternal = "add" === mode && "external" === source?.kind;
	// The pane's variant drives its copy/validation; each embed provider gets its
	// own variant.
	const externalVariant = externalVariantFor(source);
	// Match by the source's own provider + type so each paste-URL pane shows only
	// its own staged items (external-video and youtube are both type:'video').
	const externalItems = selected.filter(
		(item) => item.provider === source?.provider && item.type === source?.type
	);

	// A completed upload merges straight into the selection, mirroring the
	// native Media Library's "newly uploaded items are selected" behavior.
	const onUploaded = (item) => {
		setSelected((prev) => mergeSelection(prev, [item]));
		setDetail(item);
	};

	// The browser resolves modifier-aware selection against its visible list and
	// hands back the full next selection + anchor.
	const onSelectionChange = (nextSelected, nextAnchorId) => {
		setSelected(nextSelected);
		setAnchorId(nextAnchorId);
	};

	// External-images staging: add a pasted URL (deduped by url-as-id) / remove one.
	const addExternalItem = (item) => setSelected((prev) => mergeSelection(prev, [item]));

	const removeItem = (id) => {
		setSelected((prev) => prev.filter((item) => item.id !== id));
		setDetail((prev) => (prev && prev.id === id ? null : prev));
	};

	// A permanent delete (from AttachmentDetails) removes the item from the
	// selection + details immediately AND persists to the gallery right away —
	// the attachment is irreversibly gone, so a dangling reference would render a
	// broken image. This runs off the delete's own success callback rather than a
	// global wp.media 'destroy' listener, which can miss the event when wp.media
	// loads after the modal mounts (e.g. the standalone admin editor).
	const onDeleteItem = (id) => {
		setSelected((prev) => {
			const next = prev.filter((item) => item.id !== id);
			if (onChangeRef.current) {
				onChangeRef.current(next);
			}
			return next;
		});
		setDetail((prev) => (prev && prev.id === id ? null : prev));
	};

	// `id` defaults to the active detail item; the Edit-Image merge-back passes an
	// explicit id so a late-resolving edit patches the item it was opened for, even
	// if the active detail has since changed. Functional setters keep this correct
	// regardless of stale closures.
	const onUpdateDetail = (patch, id = detail?.id) => {
		if (!id) {
			return;
		}
		setSelected((prev) => patchItem(prev, id, patch));
		setDetail((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
	};

	const onSelectSource = (id) => {
		setActiveSource(id);
		setMode("add");
		setActiveTab("library");
	};

	// The sidebar's "Edit Gallery" action opens the redesigned modal when a handler
	// is provided; otherwise it falls back to the internal drag-reorder edit mode.
	const onSelectMode = (id) => {
		if ("edit" === id && onEditGallery) {
			onEditGallery();
			return;
		}
		setMode(id);
	};

	const onTabKeyDown = (event) => {
		if ("ArrowRight" !== event.key && "ArrowLeft" !== event.key) {
			return;
		}
		event.preventDefault();
		const index = TABS.findIndex((tab) => tab.id === activeTab);
		const nextIndex =
			"ArrowRight" === event.key ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
		setActiveTab(TABS[nextIndex].id);
	};

	const confirm = () => {
		onChange(selected);
		onClose();
	};

	// The left workspace content depends on mode/tab; the details panel is shared.
	const renderWorkspace = () => {
		if (isExternal) {
			return (
				<div className="sp-shaped-gallery-media-modal__workspace">
					{/*
					 * Keyed by source so each paste-URL source gets its own field: one
					 * shared instance carried the typed URL and its error (e.g. "could
					 * not be loaded as an image") into the next source's pane.
					 */}
					<ExternalMediaPane
						key={activeSource}
						variant={externalVariant}
						items={externalItems}
						onAdd={addExternalItem}
						onRemove={removeItem}
					/>
				</div>
			);
		}
		if ("edit" === mode) {
			return (
				<div className="sp-shaped-gallery-media-modal__workspace sp-shaped-gallery-media-modal__edit">
					<MediaGrid items={selected} onChange={setSelected} />
				</div>
			);
		}
		if ("library" === activeTab) {
			return (
				<div className="sp-shaped-gallery-media-modal__workspace" role="tabpanel">
					<FilterBar
						month={month}
						onMonthChange={setMonth}
						search={searchInput}
						onSearchChange={setSearchInput}
						months={months}
					/>
					<MediaLibraryBrowser
						source={source}
						month={month}
						search={search}
						selected={selected}
						anchorId={anchorId}
						onSelectionChange={onSelectionChange}
						activeId={detail?.id}
						onActivate={setDetail}
					/>
				</div>
			);
		}
		return (
			<div className="sp-shaped-gallery-media-modal__workspace" role="tabpanel">
				<UploadPane onUploaded={onUploaded} />
			</div>
		);
	};

	return (
		<Modal
			title={__("Add to Gallery", "easy-lightbox-wp")}
			onRequestClose={onClose}
			className="sp-shaped-gallery-media-modal"
			overlayClassName="sp-shaped-gallery-media-modal__overlay"
			__experimentalHideHeader
		>
			<div className="sp-shaped-gallery-media-modal__layout">
				<MediaSidebar
					mode={mode}
					onSelectMode={onSelectMode}
					activeSource={activeSource}
					onSelectSource={onSelectSource}
				/>

				{/*
				 * Everything right of the sidebar. The header (title + close) and the
				 * Upload/Media-Library tabs are shared across the full width here; only
				 * the split below the tabs divides into the media workspace + details
				 * panel, so the panel lines up with the tabs' bottom border (per Figma).
				 */}
				<div className="sp-shaped-gallery-media-modal__content-wrap">
					<header className="sp-shaped-gallery-media-modal__topbar">
						<h1 className="sp-shaped-gallery-media-modal__heading">
							{"edit" === mode
								? __("Edit Gallery", "easy-lightbox-wp")
								: __("Add to Gallery", "easy-lightbox-wp")}
						</h1>
						<button
							type="button"
							className="sp-shaped-gallery-media-modal__close"
							aria-label={__("Close dialog", "easy-lightbox-wp")}
							onClick={onClose}
						>
							<Icon icon={close} size={28} />
						</button>
					</header>

					{"add" === mode && !isExternal && (
						<div
							className="sp-shaped-gallery-media-modal__tabs"
							role="tablist"
							aria-label={__("Media source tabs", "easy-lightbox-wp")}
						>
							{TABS.map((tab) => (
								<button
									key={tab.id}
									type="button"
									role="tab"
									id={`sp-shaped-gallery-tab-${tab.id}`}
									aria-selected={activeTab === tab.id}
									tabIndex={activeTab === tab.id ? 0 : -1}
									className={`sp-shaped-gallery-tab${activeTab === tab.id ? " is-active" : ""}`}
									onClick={() => setActiveTab(tab.id)}
									onKeyDown={onTabKeyDown}
								>
									{tab.label}
								</button>
							))}
						</div>
					)}

					<div className="sp-shaped-gallery-media-modal__split">
						<section className="sp-shaped-gallery-media-modal__main">{renderWorkspace()}</section>

						{/*
						 * Match the native Media Library: the details panel only appears
						 * once an item is active. With nothing selected there is no panel,
						 * and the workspace spans the full width.
						 */}
						{detail && (
							<AttachmentDetails
								item={detail}
								selected={isSelected(selected, detail.id)}
								onUpdate={onUpdateDetail}
								onDelete={onDeleteItem}
							/>
						)}
					</div>
				</div>
			</div>

			<footer className="sp-shaped-gallery-media-modal__footer">
				<span className="sp-shaped-gallery-media-modal__count">
					{sprintf(
						/* translators: %d: selected item count. */
						_n("%d item selected", "%d items selected", selected.length, "easy-lightbox-wp"),
						selected.length
					)}
				</span>
				<div className="sp-shaped-gallery-media-modal__actions">
					<button
						type="button"
						className="sp-shaped-gallery-btn sp-shaped-gallery-btn--primary"
						disabled={!selected.length}
						onClick={confirm}
					>
						{confirmLabel}
					</button>
				</div>
			</footer>
		</Modal>
	);
}

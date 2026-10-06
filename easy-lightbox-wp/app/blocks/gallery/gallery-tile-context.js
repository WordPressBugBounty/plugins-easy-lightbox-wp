/**
 * The channel from the gallery block to its editable image tiles.
 *
 * `EditableGalleryPreview` renders the `core/image` inner blocks inside its own
 * JSX, so anything it provides here reaches the tile wrapper that
 * ./item-content-filter renders around each of them — and, critically, a context
 * update crosses `memo` boundaries, which a prop change does not:
 * `BlockListBlockProvider` is `memo`'d on its own props, so a change to the PARENT
 * gallery's attributes re-renders neither it nor anything the filter wraps it in.
 *
 * That is not a theoretical concern — it was the first implementation's bug. A
 * `useSelect` inside the filtered component subscribed but never re-rendered: with
 * Content's Position switched to "top", only the SELECTED tile's caption moved (its
 * props had changed) while the other five stayed at the bottom. Reading from context
 * instead means the value arrives as a re-render, from the one component that
 * already re-renders on every attribute change.
 *
 * A null value (the default) means "this image is not a gallery tile" — the filter
 * uses that as its gate, which is exact by construction: only images rendered
 * inside the preview see a provider.
 */
import { createContext } from '@wordpress/element';

/**
 * @typedef {Object} GalleryTileValue
 * @property {Object} content The gallery's grouped `content` attribute.
 * @property {Object} tiles   Map of inner-block clientId => { item, index }.
 * @property {Object} sources Map of attachment id => URL at the gallery's Image
 *                            Resolution (see ./useImageSources); empty until loaded.
 */

/** @type {import('react').Context<?GalleryTileValue>} */
export const GalleryTileContext = createContext( null );

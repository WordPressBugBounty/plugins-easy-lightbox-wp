/**
 * Editor-side dynamic-style builders — the JS mirror of the PHP StyleEngine /
 * StyleContributor set (src/Render/Css). Each concern gets a module here; import
 * from the barrel: `import { geometryStyle } from '@shaped-gallery/lib/style'`.
 *
 * `./helpers` is deliberately absent: it holds the shared primitives (the mirror
 * of PHP's CssHelpers var-set builders) that these modules build on, not a panel
 * style builder, so it stays internal to this folder.
 *
 * NOTE: ajax-vars derives its rules from `./helpers`; the geometry and
 * image-video mirrors still carry their own local copies of `len`/`spacing` and
 * should be migrated onto the shared helpers as each is next touched.
 */

export * from './geometry-vars';
export * from './image-video-vars';
export * from './content-vars';
export * from './ajax-vars';

/**
 * Pro teaser kit — the upgrade prompts, after WP Carousel Free's.
 *
 * Presentation only. This build never checks a licence or a "pro active" flag: when
 * ShapedGallery Pro is active this plugin does not boot at all (§1b), so anything
 * drawn from here is, by construction, drawn on a Free-only site. What makes a
 * teaser safe is that it never WRITES — locked controls return before calling a
 * setter — and that the server has no code for the feature to reach.
 */
export { default as ProBadge } from './ProBadge';
export { default as ProCardBadge } from './ProCardBadge';
export { default as ProTag } from './ProTag';
export { default as ProNotice } from './ProNotice';
export { default as ProPanel } from './ProPanel';
export { upgradeUrl, openUpgrade } from './upgrade';

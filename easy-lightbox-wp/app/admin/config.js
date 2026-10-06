/**
 * Dashboard config resolution — pure functions, no DOM, no React.
 *
 * PHP ships `shaped_gallery_admin.dashboard` (see src/Admin/DashboardConfig.php).
 * Everything here exists so the SPA still renders when a key is missing: the
 * localized payload is merged OVER a complete default shape, never read raw.
 */

/**
 * The full shape every consumer can rely on. Copy is intentionally absent — it
 * lives in PHP so `npm run makepot` picks it up — but the keys are not.
 *
 * @type {Object}
 */
export const DEFAULT_CONFIG = {
	brand: '',
	version: '',
	displayName: '',
	defaultRoute: 'getting-started',
	tabs: [],
	urls: {
		createGallery: '',
		manage: '',
		docs: '',
		support: '',
		community: '',
		youtube: '',
		review: '',
	},
	sidebarMenu: { menuId: '', pageSlugs: {} },
	manage: {
		title: '',
		banner: { heading: '', description: '', ctaLabel: '', artUrl: '', artAlt: '' },
		searchPlaceholder: '',
		searchLabel: '',
		bulkLabel: '',
		applyLabel: '',
		bulkActions: [],
		addNewLabel: '',
		columns: { title: '', shortcode: '', date: '', actions: '' },
		actions: { edit: '', duplicate: '', delete: '' },
		selectAllLabel: '',
		untitledLabel: '',
		copyLabel: '',
		copiedLabel: '',
		emptyTitle: '',
		emptyText: '',
		noResultsLabel: '',
		loadingLabel: '',
		errorLabel: '',
		confirmDeleteTitle: '',
		confirmDelete: '',
		confirmBulkDelete: '',
		noSelection: '',
		deletedLabel: '',
		duplicatedLabel: '',
	},
	settingsPage: {
		title: '',
		navLabel: '',
		sections: [],
		advanced: { rows: [], resetLabel: '', confirm: {} },
		integrations: { title: '', description: '', docsLabel: '', items: [] },
		// `panels` is keyed by module, so it stays an object (a module without a
		// panel has no key); the module-panel registry decides what can open.
		modules: { title: '', description: '', docsLabel: '', items: [], panels: {} },
	},
	/*
	 * The Dashboard banner. Both URLs default to '' and the page must not invent
	 * either: empty is how PHP says the destination is unavailable, and each empty
	 * value hides its own button. `patternsUrl` is empty when the Ready Patterns
	 * module is off (§4b — the routes behind it 403 too); `ctaUrl` is empty when the
	 * user cannot create the target post type.
	 *
	 * Neither falls back to `urls.createGallery`. That URL is the `shaped_gallery`
	 * editor — the SHORTCODE flow — and this banner's copy promises the opposite.
	 */
	hero: {
		heading: '',
		description: '',
		ctaLabel: '',
		ctaUrl: '',
		patternsLabel: '',
		patternsUrl: '',
		artUrl: '',
		artAlt: '',
	},
	helpCenter: { label: '', items: [] },
	about: {
		heading: '',
		headingHighlight: '',
		paragraphs: [],
		primaryCta: { label: '', url: '' },
		secondaryCta: { label: '', url: '' },
		image: { url: '', alt: '', caption: '' },
		pluginsTitle: '',
		pluginsSubtitle: '',
		plugins: [],
	},
	liveChat: {
		provider: '',
		websiteId: '',
		label: '',
		openLabel: '',
		fallbackUrl: '',
	},
	footer: {
		creditPrefix: '',
		creditMiddle: '',
		creditLinkLabel: '',
		creditLinkUrl: '',
		socialLabel: '',
		socials: [],
	},
	/*
	 * Saved option VALUES (`shaped_gallery_settings`), not the Settings screen's copy —
	 * that is `settingsPage` above. resolveConfig() overwrites this key wholesale from
	 * the top level of the localize payload, so the two must stay separately named.
	 */
	settings: {},
	/*
	 * The SHIPPED defaults for the keys this screen owns (`Settings::screen_defaults()`)
	 * — what "Reset to Default" restores. Lifted from the top level of the payload like
	 * `settings`, and deliberately separate from it: one is what the site chose, the
	 * other is what the plugin ships, and a reset needs to tell them apart.
	 */
	defaults: {},
};

const BLOCKED_KEYS = [ '__proto__', 'constructor', 'prototype' ];

/**
 * Whether a value is a plain object (and so mergeable).
 *
 * @param {*} value Candidate.
 * @return {boolean} True for plain objects.
 */
function isPlainObject( value ) {
	return !! value && 'object' === typeof value && ! Array.isArray( value );
}

/**
 * Recursive merge of `override` onto `base`.
 *
 * Plain objects recurse; arrays and primitives replace wholesale (so PHP can ship
 * `[]` to mean "none"). `null`/`undefined` never override. Neither input is
 * mutated, and prototype keys are skipped — the override comes from `window`.
 *
 * @param {Object} base     Defaults.
 * @param {Object} override Localized values.
 * @return {Object} New merged object.
 */
export function deepMerge( base, override ) {
	const out = { ...base };

	if ( ! isPlainObject( override ) ) {
		return out;
	}

	Object.keys( override ).forEach( ( key ) => {
		if ( BLOCKED_KEYS.includes( key ) ) {
			return;
		}
		const value = override[ key ];
		if ( null === value || undefined === value ) {
			return;
		}
		out[ key ] =
			isPlainObject( value ) && isPlainObject( base[ key ] )
				? deepMerge( base[ key ], value )
				: value;
	} );

	return out;
}

/**
 * Build the config the SPA renders from the raw localize object.
 *
 * `dashboard` carries the screen's own payload; `settings` and `adminUrl` sit at
 * the top level of `shaped_gallery_admin` and are lifted in so pages read one object.
 *
 * @param {Object} raw `window.shaped_gallery_admin`.
 * @return {Object} Complete config.
 */
export function resolveConfig( raw ) {
	const source = isPlainObject( raw ) ? raw : {};
	const config = deepMerge( DEFAULT_CONFIG, source.dashboard || {} );

	config.settings = isPlainObject( source.settings ) ? source.settings : {};
	config.defaults = isPlainObject( source.defaults ) ? source.defaults : {};

	// Derived fallbacks: keep the page usable if PHP ships nothing but adminUrl.
	const adminUrl = source.adminUrl || '';
	if ( ! config.urls.createGallery && adminUrl ) {
		// The gallery CPT's native "add new" screen — same URL GalleryEditor builds.
		config.urls.createGallery = `${ adminUrl }post-new.php?post_type=shaped_gallery`;
	}
	if ( ! config.urls.manage && adminUrl ) {
		config.urls.manage = `${ adminUrl }admin.php?page=shaped-gallery`;
	}

	return config;
}

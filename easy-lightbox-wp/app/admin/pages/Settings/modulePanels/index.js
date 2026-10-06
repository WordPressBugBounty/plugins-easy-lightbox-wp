/**
 * Barrel for the module-panel feature: the registry that says which modules have a
 * panel (`registry.js`) and the drawer that renders one (`ModulePanel.jsx`).
 *
 * The Modules grid imports from here so it never reaches into the folder's internals.
 */
export { MODULE_PANELS, hasModulePanel } from './registry';
export { default as ModulePanel } from './ModulePanel';
export { default as useModuleToggles } from './useModuleToggles';

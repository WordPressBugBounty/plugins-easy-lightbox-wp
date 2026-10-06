/**
 * Config context — the localized dashboard payload, read once and shared.
 *
 * The payload is read-only, immutable and request-scoped, so it does not warrant a
 * `@wordpress/data` store (§8's default): there is nothing to mutate and no
 * selector worth memoizing. Context is the minimum seam that still keeps server
 * state out of the prop chain (§18).
 */
import { createContext, useContext } from '@wordpress/element';
import { DEFAULT_CONFIG } from './config';

const ConfigContext = createContext( DEFAULT_CONFIG );

/**
 * Provide the resolved config to the tree.
 *
 * @param {Object} props
 * @param {Object} props.value    Resolved config (see resolveConfig()).
 * @param {Node}   props.children Tree.
 * @return {JSX.Element} Provider.
 */
export function ConfigProvider( { value, children } ) {
	return (
		<ConfigContext.Provider value={ value }>
			{ children }
		</ConfigContext.Provider>
	);
}

/**
 * Read the dashboard config.
 *
 * @return {Object} Config.
 */
export function useConfig() {
	return useContext( ConfigContext );
}

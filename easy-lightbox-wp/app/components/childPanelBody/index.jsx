/**
 * ChildPanelBody — a thin, styled wrapper over the core `PanelBody` used for
 * every collapsible section in the inspector and admin option panels. Keeps
 * section chrome consistent so panels never re-style `PanelBody` ad hoc.
 *
 * @param {Object}      props
 * @param {string}      props.title               Panel heading.
 * @param {JSX.Element} props.children            Panel body.
 * @param {boolean}     [props.initialOpen=false] Open on first render.
 * @param {string}      [props.className='']      Extra class names.
 * @return {JSX.Element} Panel.
 */
import { PanelBody } from '@wordpress/components';
import '../shared.scss';

export default function ChildPanelBody( { title, children, initialOpen = false, className = '' } ) {
	return (
		<PanelBody
			className={ `sp-shaped-gallery-child-panel ${ className }`.trim() }
			title={ title }
			initialOpen={ initialOpen }
		>
			{ children }
		</PanelBody>
	);
}

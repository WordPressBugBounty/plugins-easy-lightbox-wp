/**
 * ChildPanelBody — a thin, styled wrapper over the core `PanelBody` used for
 * every collapsible section in the inspector and admin option panels. Keeps
 * section chrome consistent so panels never re-style `PanelBody` ad hoc.
 *
 * Inside a `PanelAccordion` the panels share ONE open slot: opening a panel
 * closes whichever was open, and clicking the open one closes it. Outside one,
 * each panel opens and closes on its own, exactly as a bare `PanelBody` does.
 *
 * @param {Object}      props
 * @param {string}      props.title               Panel heading.
 * @param {JSX.Element} props.children            Panel body.
 * @param {boolean}     [props.initialOpen=false] Open on first render.
 * @param {string}      [props.className='']      Extra class names.
 * @return {JSX.Element} Panel.
 */
import { PanelBody } from '@wordpress/components';
import { createContext, useContext, useMemo, useState } from '@wordpress/element';
import '../shared.scss';

const AccordionContext = createContext( null );

/**
 * One-open-at-a-time group for the `ChildPanelBody` panels rendered inside it.
 *
 * Panels are keyed by title: it is stable across a panel unmounting and coming
 * back (the Ajax Pagination panel does, with its toggle), where an instance id
 * would not be. Until a panel is first clicked nothing is tracked, so each
 * panel's own `initialOpen` still decides what the inspector opens with.
 *
 * @param {Object}      props
 * @param {JSX.Element} props.children Panels.
 * @return {JSX.Element} Provider.
 */
export function PanelAccordion( { children } ) {
	// `undefined` = no panel clicked yet; `null` = every panel closed.
	const [ openTitle, setOpenTitle ] = useState( undefined );
	const value = useMemo( () => ( { openTitle, setOpenTitle } ), [ openTitle ] );

	return <AccordionContext.Provider value={ value }>{ children }</AccordionContext.Provider>;
}

export default function ChildPanelBody( { title, children, initialOpen = false, className = '' } ) {
	const accordion = useContext( AccordionContext );

	let openProps = { initialOpen };

	if ( accordion ) {
		const isOpen = undefined === accordion.openTitle ? initialOpen : accordion.openTitle === title;

		// The next state is derived here rather than read from `onToggle`'s
		// argument, which older cores do not pass.
		openProps = {
			opened: isOpen,
			onToggle: () => accordion.setOpenTitle( isOpen ? null : title ),
		};
	}

	return (
		<PanelBody
			className={ `sp-shaped-gallery-child-panel ${ className }`.trim() }
			title={ title }
			{ ...openProps }
		>
			{ children }
		</PanelBody>
	);
}

/**
 * DashCard — the dashboard's white / bordered / 12px-radius surface.
 *
 * Deliberately not `@wordpress/components` Card: that component is not one of the
 * sanctioned native primitives (§6.7) and ships its own border and shadow chrome
 * this design would spend CSS undoing.
 */

/**
 * @param {Object} props
 * @param {string} [props.as]         Element to render ('section' by default).
 * @param {string} [props.className]  Extra class.
 * @param {string} [props.labelledBy] Id of the heading naming this region.
 * @param {Node}   props.children     Card contents.
 * @return {JSX.Element} Card.
 */
export default function DashCard( { as: Tag = 'section', className = '', labelledBy, children } ) {
	return (
		<Tag
			className={ `sp-shaped-gallery-dash-card ${ className }`.trim() }
			aria-labelledby={ labelledBy }
		>
			{ children }
		</Tag>
	);
}

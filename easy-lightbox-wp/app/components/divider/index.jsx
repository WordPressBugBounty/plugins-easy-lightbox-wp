/**
 * Divider — a hairline separator between control groups.
 *
 * @param {Object} props
 * @param {string} [props.position=''] Optional modifier class.
 * @return {JSX.Element} Divider.
 */
import '../shared.scss';

export default function Divider( { position = '' } ) {
	return <span className={ `sp-shaped-gallery-divider ${ position }`.trim() } />;
}

/**
 * Ready Patterns — error boundary.
 *
 * The library is mounted into a node of its own outside the editor's React tree,
 * so an exception here would otherwise take the whole editor down with it rather
 * than just the modal.
 */
import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Renders a retry panel instead of crashing the editor.
 */
export default class ErrorBoundary extends Component {
	/**
	 * @param {Object} props Props.
	 */
	constructor( props ) {
		super( props );
		this.state = { hasError: false };
		this.retry = this.retry.bind( this );
	}

	/**
	 * @return {Object} Next state.
	 */
	static getDerivedStateFromError() {
		return { hasError: true };
	}

	/**
	 * @param {Error}  error Thrown error.
	 * @param {Object} info  Component stack.
	 * @return {void}
	 */
	componentDidCatch( error, info ) {
		// eslint-disable-next-line no-console
		console.error( 'ShapedGallery Ready Patterns:', error, info );
	}

	/**
	 * @return {void}
	 */
	retry() {
		this.setState( { hasError: false } );
		if ( this.props.onRetry ) {
			this.props.onRetry();
		}
	}

	/**
	 * @return {JSX.Element} Children, or the fallback.
	 */
	render() {
		if ( ! this.state.hasError ) {
			return this.props.children;
		}

		return (
			<div className="sp-shaped-patterns__state">
				<p className="sp-shaped-patterns__state-title">
					{ __( 'The pattern library could not be displayed.', 'easy-lightbox-wp' ) }
				</p>
				<button type="button" className="sp-shaped-patterns__insert-btn" onClick={ this.retry }>
					{ __( 'Try again', 'easy-lightbox-wp' ) }
				</button>
			</div>
		);
	}
}

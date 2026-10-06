/**
 * BatchAction — a button that runs a server action the server performs in BATCHES.
 *
 * Extracted from the Watermark panel's Purge Cache control the moment Advanced
 * Controls needed the same thing for Clear Gallery Cache (§6.7: a control two panels
 * offer belongs in the shared library, not in each). What is shared is the BEHAVIOUR,
 * which is where all the subtlety lives; the class names and every string are props,
 * so neither panel's markup or copy moved.
 *
 * The contract with the server is `{ deleted, remaining, message }`: it does bounded
 * work and reports whether more is left, and this loops until it is not — rather than
 * asking one request to survive a cache of fifty thousand entries. `MAX_BATCHES` is a
 * backstop, not a budget: a server that kept reporting work left forever would
 * otherwise spin here.
 *
 * Three rules the original arrived at, kept verbatim because each is load-bearing:
 *
 * - **`report()` is the ONE way the outcome is written**, and it cancels the pending
 *   dismissal first. Without that funnel, a timer left over from an earlier run blanks
 *   the message a later one just produced.
 * - **Success is on a timer, an error is not.** A finished job needs acknowledging
 *   once; a failed one describes work still to do, right beside the button that
 *   retries it.
 * - **The unmount cleanup is not optional.** Closing the drawer (or switching
 *   settings section) unmounts this while a timer may still hold a `setResult`.
 *
 * It also never touches the surrounding draft state. In a module drawer that would
 * clear a pending save status and mark the panel dirty with no user change behind it.
 */
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/** Give up rather than loop forever if the server keeps reporting work left. */
const MAX_BATCHES = 50;

/** How long a success message stays on screen, in ms. */
const SUCCESS_TIMEOUT = 3500;

/**
 * @param {Object} props
 * @param {string} props.path           REST path to POST, e.g. `/shaped-gallery/v1/cache/purge`.
 * @param {string} props.label          Button label at rest.
 * @param {string} [props.busyLabel]    Button label while running.
 * @param {string} [props.doneLabel]    Fallback success message when the server sends none.
 * @param {string} [props.errorLabel]   Fallback failure message when the error carries none.
 * @param {string} [props.className]    Class for the button.
 * @param {string} [props.wrapperClass] Class for the wrapper element.
 * @param {string} [props.statusClass]  Base class for the status paragraph; `is-success`
 *                                      / `is-error` is appended.
 * @return {JSX.Element} Button and its result.
 */
export default function BatchAction( {
	path,
	label,
	busyLabel,
	doneLabel,
	errorLabel,
	className,
	wrapperClass,
	statusClass,
} ) {
	const [ busy, setBusy ] = useState( false );
	const [ result, setResult ] = useState( null );
	const timer = useRef( null );

	const report = useCallback( ( next ) => {
		if ( timer.current ) {
			clearTimeout( timer.current );
			timer.current = null;
		}

		setResult( next );

		if ( 'success' === next?.type ) {
			timer.current = setTimeout( () => {
				timer.current = null;
				setResult( null );
			}, SUCCESS_TIMEOUT );
		}
	}, [] );

	useEffect(
		() => () => {
			if ( timer.current ) {
				clearTimeout( timer.current );
			}
		},
		[]
	);

	const run = async () => {
		// Enter on the focused button could otherwise re-fire mid-request.
		if ( busy ) {
			return;
		}

		setBusy( true );
		report( null );

		try {
			let message = '';

			for ( let batch = 0; batch < MAX_BATCHES; batch++ ) {
				// eslint-disable-next-line no-await-in-loop -- batches are sequential by design: each depends on the previous one's `remaining`.
				const response = await apiFetch( { path, method: 'POST' } );
				message = response?.message || '';

				if ( ! response?.remaining ) {
					break;
				}
			}

			report( {
				type: 'success',
				message: message || doneLabel || __( 'Done.', 'easy-lightbox-wp' ),
			} );
		} catch ( error ) {
			report( {
				type: 'error',
				message:
					error?.message ||
					errorLabel ||
					__( 'The action could not be completed.', 'easy-lightbox-wp' ),
			} );
		} finally {
			setBusy( false );
		}
	};

	return (
		<div className={ wrapperClass }>
			<button
				type="button"
				className={ className }
				onClick={ run }
				disabled={ busy }
			>
				{ busy ? busyLabel || __( 'Working…', 'easy-lightbox-wp' ) : label }
			</button>
			{ !! result && (
				<p
					className={ `${ statusClass } is-${ result.type }` }
					role={ 'error' === result.type ? 'alert' : 'status' }
				>
					{ result.message }
				</p>
			) }
		</div>
	);
}

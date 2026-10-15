/**
 * useCurrentOffer — `currentOffer()` for a component that must drop the offer on
 * time.
 *
 * PHP decides the offer when the page loads; `currentOffer()` holds it against the
 * viewer's clock. A component that only read it once would keep naming a discount
 * after it ended, for as long as the screen stayed open. This hook re-renders its
 * caller at the moment the offer ends, so the inspector's pill and the dashboard's
 * offer bar both leave then, from an already-open screen too. One timer rule, so
 * the two surfaces cannot disagree about when the offer is over.
 */
import { useEffect, useReducer } from '@wordpress/element';
import { currentOffer } from './upgrade';

/**
 * `setTimeout`'s ceiling (2^31-1 ms, ~24.8 days). A longer delay overflows and
 * fires at once, which here would re-render in a loop.
 */
const MAX_DELAY = 2147483647;

/**
 * The current Pro offer, re-read at the moment it ends.
 *
 * An end beyond `setTimeout`'s ceiling is waited out in capped steps, each
 * re-render arming the next. No timer runs for an offer with no end, or once
 * there is no offer.
 *
 * @return {{percent:number, endsAt:number, lead:string}} `currentOffer()`'s result.
 */
export default function useCurrentOffer() {
	const [ ticks, recheck ] = useReducer( ( count ) => count + 1, 0 );
	const offer = currentOffer();
	const { endsAt } = offer;

	useEffect( () => {
		if ( ! endsAt ) {
			return undefined;
		}

		const timer = setTimeout( recheck, Math.min( endsAt - Date.now(), MAX_DELAY ) );
		return () => clearTimeout( timer );
	}, [ endsAt, ticks ] );

	return offer;
}

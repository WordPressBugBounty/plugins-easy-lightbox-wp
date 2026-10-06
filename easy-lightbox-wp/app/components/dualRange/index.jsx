/**
 * DualRange — a two-thumb range slider over a single track, with a current-value
 * badge at each end and an optional caption under each thumb. Built for controls
 * like the Motion Effects "View Port" range (Bottom → Top scroll offsets), where
 * the user picks a start/end pair within one bounded scale. A center tick marks
 * the midpoint; the accent fill spans the selected sub-range.
 *
 * No native `<input type="range">` handles two thumbs on one track, so the thumbs
 * are `role="slider"` buttons: pointer-draggable and keyboard-operable (arrow
 * keys), with the moving thumb clamped against the other so they never cross.
 * Writes are debounced during a drag so the block attributes aren't thrashed.
 *
 * Value/write contract (the shared library convention): pass `value` + `onChange`
 * for a custom / nested write, OR `attributes` (current value) + `attributesKey`
 * + `setAttributes` for a direct write. The value is an object `{ start, end }`.
 *
 * @param {Object}   props
 * @param {Object}   [props.value]           Current `{ start, end }` (overrides `attributes`).
 * @param {Object}   [props.attributes]      Current `{ start, end }` (attributesKey form).
 * @param {string}   [props.attributesKey]   Attribute name to write.
 * @param {Function} [props.setAttributes]   setAttributes.
 * @param {Function} [props.onChange]        Custom change handler (overrides attributesKey write).
 * @param {string}   [props.label]           Control label.
 * @param {number}   [props.min=0]           Minimum.
 * @param {number}   [props.max=100]         Maximum.
 * @param {number}   [props.step=1]          Step.
 * @param {string}   [props.unit='']         Unit suffix shown in the value badges.
 * @param {string}   [props.startCaption]    Caption under the start thumb.
 * @param {string}   [props.endCaption]      Caption under the end thumb.
 * @param {string}   [props.startLabel]      Accessible name for the start thumb.
 * @param {string}   [props.endLabel]        Accessible name for the end thumb.
 * @param {Object}   [props.defaultValue]    Default `{ start, end }` (enables reset).
 * @param {boolean}  [props.allowReset=true] Allow reset when the value differs from default.
 * @return {JSX.Element} Control.
 */
import { memo, useState, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import ResetButton from '../resetButton';
import '../shared.scss';
import './editor.scss';

/** Commit debounce (ms) — matches SPRangeControl; keeps drags cheap. */
const COMMIT_DELAY = 100;

const clamp = ( n, min, max ) => Math.min( max, Math.max( min, n ) );

function DualRange( {
	value,
	attributes,
	attributesKey,
	setAttributes,
	onChange,
	label,
	min = 0,
	max = 100,
	step = 1,
	unit = '',
	startCaption,
	endCaption,
	startLabel,
	endLabel,
	defaultValue,
	allowReset = true,
} ) {
	const readValue = () => {
		const v = value !== undefined ? value : attributes;
		return {
			start: clamp( Number( v?.start ?? min ), min, max ),
			end: clamp( Number( v?.end ?? max ), min, max ),
		};
	};

	const [ current, setCurrent ] = useState( readValue );
	const trackRef = useRef( null );
	const currentRef = useRef( current );
	const timer = useRef( null );

	// Mirror the latest value so the drag listeners (bound once per drag) read
	// fresh state without stale closures.
	currentRef.current = current;

	// Re-sync when the external value changes.
	useEffect( () => {
		setCurrent( readValue() );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ value, attributes ] );

	// Flush any pending write on unmount.
	useEffect( () => () => clearTimeout( timer.current ), [] );

	const commit = ( next ) => {
		if ( onChange ) {
			onChange( next );
		} else if ( attributesKey ) {
			setAttributes( { [ attributesKey ]: next } );
		}
	};

	const commitDebounced = ( next ) => {
		clearTimeout( timer.current );
		timer.current = setTimeout( () => commit( next ), COMMIT_DELAY );
	};

	// Clamp the moving thumb against the other so start never passes end.
	const moveThumb = ( thumb, raw ) => {
		const c = currentRef.current;
		const stepped = clamp( Math.round( raw / step ) * step, min, max );
		return thumb === 'start'
			? { start: Math.min( stepped, c.end ), end: c.end }
			: { start: c.start, end: Math.max( stepped, c.start ) };
	};

	const posToValue = ( clientX ) => {
		const rect = trackRef.current?.getBoundingClientRect();
		if ( ! rect || ! rect.width ) {
			return min;
		}
		return min + clamp( ( clientX - rect.left ) / rect.width, 0, 1 ) * ( max - min );
	};

	const onPointerDown = ( thumb ) => ( event ) => {
		event.preventDefault();
		// Track the latest value synchronously so the final commit doesn't depend
		// on React having re-rendered between the last move and pointerup.
		let pending = currentRef.current;
		const move = ( ev ) => {
			pending = moveThumb( thumb, posToValue( ev.clientX ) );
			setCurrent( pending );
			commitDebounced( pending );
		};
		const up = () => {
			document.removeEventListener( 'pointermove', move );
			document.removeEventListener( 'pointerup', up );
			clearTimeout( timer.current );
			commit( pending );
		};
		document.addEventListener( 'pointermove', move );
		document.addEventListener( 'pointerup', up );
	};

	const onKeyDown = ( thumb ) => ( event ) => {
		let delta = 0;
		if ( 'ArrowRight' === event.key || 'ArrowUp' === event.key ) {
			delta = step;
		} else if ( 'ArrowLeft' === event.key || 'ArrowDown' === event.key ) {
			delta = -step;
		} else {
			return;
		}
		event.preventDefault();
		const base = 'start' === thumb ? current.start : current.end;
		const next = moveThumb( thumb, base + delta );
		setCurrent( next );
		commit( next );
	};

	const changed =
		allowReset &&
		defaultValue &&
		( current.start !== defaultValue.start || current.end !== defaultValue.end );

	const reset = () => {
		setCurrent( defaultValue );
		clearTimeout( timer.current );
		commit( defaultValue );
	};

	const pct = ( v ) => ( ( v - min ) / ( max - min ) ) * 100;
	const startPct = pct( current.start );
	const endPct = pct( current.end );

	const startAria = startLabel || startCaption || __( 'Range start', 'easy-lightbox-wp' );
	const endAria = endLabel || endCaption || __( 'Range end', 'easy-lightbox-wp' );

	return (
		<div className="sp-shaped-gallery-dual-range sp-shaped-gallery-cmp-mb">
			{ ( label || changed ) && (
				<div className="sp-shaped-gallery-control-head">
					<div className="sp-shaped-gallery-control-head__left">
						{ label && <span className="sp-shaped-gallery-control__title">{ label }</span> }
					</div>
					<div className="sp-shaped-gallery-control-head__right">
						{ changed && <ResetButton onClick={ reset } /> }
					</div>
				</div>
			) }

			<div className="sp-shaped-gallery-dual-range__body">
				<span className="sp-shaped-gallery-dual-range__value">
					{ current.start }
					{ unit }
				</span>

				<div className="sp-shaped-gallery-dual-range__track-col">
					<div className="sp-shaped-gallery-dual-range__track" ref={ trackRef }>
						<span className="sp-shaped-gallery-dual-range__rail" aria-hidden="true" />
						<span
							className="sp-shaped-gallery-dual-range__fill"
							aria-hidden="true"
							style={ { left: `${ startPct }%`, right: `${ 100 - endPct }%` } }
						/>
						<span className="sp-shaped-gallery-dual-range__tick" aria-hidden="true" />
						<button
							type="button"
							className="sp-shaped-gallery-dual-range__thumb"
							style={ { left: `${ startPct }%` } }
							role="slider"
							aria-label={ startAria }
							aria-valuemin={ min }
							aria-valuemax={ max }
							aria-valuenow={ current.start }
							onPointerDown={ onPointerDown( 'start' ) }
							onKeyDown={ onKeyDown( 'start' ) }
						/>
						<button
							type="button"
							className="sp-shaped-gallery-dual-range__thumb"
							style={ { left: `${ endPct }%` } }
							role="slider"
							aria-label={ endAria }
							aria-valuemin={ min }
							aria-valuemax={ max }
							aria-valuenow={ current.end }
							onPointerDown={ onPointerDown( 'end' ) }
							onKeyDown={ onKeyDown( 'end' ) }
						/>
					</div>

					{ ( startCaption || endCaption ) && (
						<div className="sp-shaped-gallery-dual-range__captions">
							<span>{ startCaption }</span>
							<span>{ endCaption }</span>
						</div>
					) }
				</div>

				<span className="sp-shaped-gallery-dual-range__value">
					{ current.end }
					{ unit }
				</span>
			</div>
		</div>
	);
}

export default memo( DualRange );

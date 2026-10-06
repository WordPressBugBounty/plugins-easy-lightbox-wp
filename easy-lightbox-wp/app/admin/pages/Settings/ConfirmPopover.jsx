/**
 * ConfirmPopover — a small confirmation panel anchored to the control that opened it.
 *
 * A settings row's checkbox is a local decision, and a centred modal answers it in the
 * wrong register: it dims the screen, moves the eye away from the row, and makes the
 * user find their place again afterwards. This opens under the control instead, so the
 * question and the thing it is about stay in one glance.
 *
 * Positioning is `position: absolute` inside the row's control cell rather than a
 * portal with collision detection. That is a deliberately small tool for a small job —
 * the panel is fixed-width, the cell is at a known edge of a fixed-width card, and the
 * only direction it can grow is inwards. A portalled popover would buy flipping and
 * shifting that nothing here can trigger, and cost a slot provider and a second focus
 * story.
 *
 * Behaviour (§14): Escape and any click outside are CANCELS — everything except the
 * confirm button leaves the caller's state alone. Focus moves to the panel on open and
 * returns to whatever had it when the panel closes, so a keyboard user lands back on
 * the checkbox they were operating. Not `aria-modal`: nothing behind it is inert, and
 * claiming otherwise would lie to a screen reader.
 *
 * @param {Object}   props
 * @param {string}   props.titleId      Id for the heading; names the dialog.
 * @param {string}   props.title        Heading text.
 * @param {string}   props.message      Body copy — say the consequence, not the title again.
 * @param {string}   props.confirmLabel Confirm button text.
 * @param {string}   props.cancelLabel  Cancel button text.
 * @param {Function} props.onConfirm    Called when the confirm button is pressed.
 * @param {Function} props.onCancel     Called for Escape, an outside click, or Cancel.
 * @return {JSX.Element} Popover.
 */
import { useEffect, useRef } from '@wordpress/element';

export default function ConfirmPopover( {
	titleId,
	title,
	message,
	confirmLabel,
	cancelLabel,
	onConfirm,
	onCancel,
} ) {
	const panelRef = useRef( null );
	const returnFocusRef = useRef( null );

	/*
	 * One effect for the whole open/close lifetime, and `onCancel` is deliberately NOT
	 * in the dependency list: the caller passes a fresh arrow on every render, so
	 * including it would tear down and re-run this on each keystroke elsewhere in the
	 * panel — re-stealing focus every time. The ref keeps the latest handler reachable
	 * without making the effect depend on its identity.
	 */
	const cancelRef = useRef( onCancel );
	cancelRef.current = onCancel;

	useEffect( () => {
		returnFocusRef.current = panelRef.current?.ownerDocument?.activeElement || null;

		// The panel itself, not its first button: landing on Cancel or on Confirm both
		// misrepresent which way the question leans. Reading order starts at the title.
		panelRef.current?.focus();

		const onKeyDown = ( event ) => {
			if ( 'Escape' === event.key ) {
				// The Settings screen sits inside WP admin; without this a stray Escape
				// would also reach anything else listening for it.
				event.stopPropagation();
				cancelRef.current();
			}
		};

		/*
		 * `pointerdown`, not `click`: a click fires after the mouse is released, so a
		 * drag that starts inside the panel and ends outside it would read as an outside
		 * click and cancel a decision the user was in the middle of making.
		 */
		const onPointerDown = ( event ) => {
			if ( ! panelRef.current?.contains( event.target ) ) {
				cancelRef.current();
			}
		};

		document.addEventListener( 'keydown', onKeyDown );
		document.addEventListener( 'pointerdown', onPointerDown );

		return () => {
			document.removeEventListener( 'keydown', onKeyDown );
			document.removeEventListener( 'pointerdown', onPointerDown );

			const previous = returnFocusRef.current;
			if ( previous && document.contains( previous ) ) {
				previous.focus();
			}
		};
	}, [] );

	return (
		<div
			ref={ panelRef }
			className="sp-shaped-gallery-settings-confirm"
			role="dialog"
			aria-labelledby={ titleId }
			tabIndex={ -1 }
		>
			<span className="sp-shaped-gallery-settings-confirm__caret" aria-hidden="true" />
			<h3 id={ titleId } className="sp-shaped-gallery-settings-confirm__title">
				{ title }
			</h3>
			<p className="sp-shaped-gallery-settings-confirm__text">{ message }</p>
			<div className="sp-shaped-gallery-settings-confirm__actions">
				<button
					type="button"
					className="sp-shaped-gallery-settings-confirm__cancel"
					onClick={ onCancel }
				>
					{ cancelLabel }
				</button>
				<button
					type="button"
					className="sp-shaped-gallery-settings-confirm__confirm"
					onClick={ onConfirm }
				>
					{ confirmLabel }
				</button>
			</div>
		</div>
	);
}

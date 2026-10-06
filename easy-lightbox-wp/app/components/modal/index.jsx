/**
 * Modal — a centred overlay with a dimmed backdrop and a close affordance.
 *
 * Renders only when `opened`. The backdrop, the close button and the Escape key
 * all invoke `onClose`; focus is trapped inside the panel while it is open and
 * restored to whatever was focused before it opened.
 *
 * Known limitation: a cross-origin iframe inside the panel (a video embed, say)
 * swallows keystrokes once focused, so Escape will not fire from within it. The
 * labelled close button is the panel's first focusable child and takes initial
 * focus, and the backdrop click still closes — but the trap is not airtight.
 *
 * @param {Object}   props
 * @param {boolean}  props.opened       Whether the modal is visible.
 * @param {Function} props.onClose      Close handler (backdrop, close button, Escape).
 * @param {Node}     props.children     Modal contents.
 * @param {string}   [props.className]  Extra class on the modal panel.
 * @param {string}   [props.label]      Accessible name (aria-label).
 * @param {string}   [props.labelledBy] Id of an element naming the modal.
 * @return {(JSX.Element|null)} Modal, or null when closed.
 */
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { useEffect, useRef } from '@wordpress/element';
import { close } from '@shaped-gallery/icons';
import './editor.scss';

const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'iframe',
	'[tabindex]:not([tabindex="-1"])',
].join( ',' );

/**
 * Visible, focusable descendants of a node, in tab order.
 *
 * @param {HTMLElement} root Container.
 * @return {Array<HTMLElement>} Focusable elements.
 */
function focusableWithin( root ) {
	if ( ! root ) {
		return [];
	}
	return Array.from( root.querySelectorAll( FOCUSABLE ) ).filter(
		( node ) => null !== node.offsetParent
	);
}

function Modal( { opened, onClose, children, className = '', label = '', labelledBy = '' } ) {
	const panelRef = useRef( null );
	const returnFocusRef = useRef( null );

	// Escape to close, Tab to cycle within the panel.
	useEffect( () => {
		if ( ! opened ) {
			return undefined;
		}

		const onKeyDown = ( event ) => {
			if ( 'Escape' === event.key ) {
				event.stopPropagation();
				onClose();
				return;
			}
			if ( 'Tab' !== event.key ) {
				return;
			}

			const items = focusableWithin( panelRef.current );
			if ( ! items.length ) {
				return;
			}
			const first = items[ 0 ];
			const last = items[ items.length - 1 ];
			const active = panelRef.current?.ownerDocument?.activeElement;

			if ( event.shiftKey && ( active === first || ! panelRef.current?.contains( active ) ) ) {
				event.preventDefault();
				last.focus();
			} else if ( ! event.shiftKey && active === last ) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener( 'keydown', onKeyDown );
		return () => document.removeEventListener( 'keydown', onKeyDown );
	}, [ opened, onClose ] );

	// Move focus in on open, hand it back on close.
	useEffect( () => {
		if ( ! opened ) {
			return undefined;
		}

		returnFocusRef.current = panelRef.current?.ownerDocument?.activeElement || null;
		const items = focusableWithin( panelRef.current );
		( items[ 0 ] || panelRef.current )?.focus();

		return () => {
			const previous = returnFocusRef.current;
			if ( previous && document.contains( previous ) ) {
				previous.focus();
			}
		};
	}, [ opened ] );

	// Lock body scroll, compensating for the scrollbar so the page does not jump.
	// WP admin leaves <html> overflow visible, so <body> is the right target.
	useEffect( () => {
		if ( ! opened ) {
			return undefined;
		}

		const { body } = document;
		const previousOverflow = body.style.overflow;
		const previousPadding = body.style.paddingRight;
		const scrollbar = window.innerWidth - document.documentElement.clientWidth;

		body.style.overflow = 'hidden';
		if ( scrollbar > 0 ) {
			body.style.paddingRight = `${ scrollbar }px`;
		}

		return () => {
			body.style.overflow = previousOverflow;
			body.style.paddingRight = previousPadding;
		};
	}, [ opened ] );

	if ( ! opened ) {
		return null;
	}

	return (
		<>
			<div
				className="sp-shaped-gallery-modal__backdrop"
				role="presentation"
				aria-hidden="true"
				onClick={ onClose }
			/>
			<div
				ref={ panelRef }
				className={ `sp-shaped-gallery-modal ${ className }`.trim() }
				role="dialog"
				aria-modal="true"
				aria-label={ labelledBy ? undefined : label || __( 'Dialog', 'easy-lightbox-wp' ) }
				aria-labelledby={ labelledBy || undefined }
				tabIndex={ -1 }
			>
				<Button
					className="sp-shaped-gallery-modal__close"
					icon={ close }
					label={ __( 'Close', 'easy-lightbox-wp' ) }
					showTooltip
					onClick={ onClose }
				/>
				{ children }
			</div>
		</>
	);
}

export default Modal;

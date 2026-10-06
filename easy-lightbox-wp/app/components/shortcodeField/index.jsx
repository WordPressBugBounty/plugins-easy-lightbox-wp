/**
 * ShortcodeField — a read-only shortcode with a copy icon docked inside the field.
 *
 * Shared because the same control appears in two very different trees: the block's
 * Gallery Information sidebar section inside Gutenberg, and every row of the Manage
 * Galleries table. Both need identical copy semantics, so they use one component
 * rather than two clipboard implementations that drift.
 *
 * The whole field is the click target, not just the icon — the box carries its own
 * `onClick`, and the icon button stops the event from bubbling so a click there does
 * not fire the copy twice.
 *
 * Copying uses the async Clipboard API and falls back to a hidden `execCommand`
 * selection, because `navigator.clipboard` is undefined on plain-HTTP admin origins —
 * still common on local and intranet installs.
 *
 * @param {Object}   props
 * @param {string}   props.value         The shortcode text.
 * @param {string}   [props.label]       Accessible name for the field.
 * @param {string}   [props.copyLabel]   Accessible name / tooltip for the button.
 * @param {string}   [props.copiedLabel] Message announced after a successful copy.
 * @param {string}   [props.className]   Extra class on the wrapper.
 * @param {Function} [props.onCopy]      Called with the value after a successful copy.
 * @return {JSX.Element} Field.
 */
import { Tooltip } from '@wordpress/components';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { CopyIcon } from '@shaped-gallery/icons';
import '../shared.scss';

/** Hover delay before the copy tooltip opens — the same beat as the table actions. */
const TOOLTIP_DELAY = 300;

/**
 * Put a string on the clipboard, resolving to whether it worked.
 *
 * @param {string}      text  Text to copy.
 * @param {HTMLElement} input The field holding the text (used by the fallback).
 * @return {Promise<boolean>} Success.
 */
async function copyText( text, input ) {
	try {
		if ( navigator.clipboard?.writeText ) {
			await navigator.clipboard.writeText( text );
			return true;
		}
	} catch {
		// Permission denied or an insecure origin — fall through to the selection copy.
	}

	if ( ! input ) {
		return false;
	}

	try {
		input.select();
		input.setSelectionRange( 0, text.length );
		return document.execCommand( 'copy' );
	} catch {
		return false;
	}
}

export default function ShortcodeField( {
	value,
	label = '',
	copyLabel = '',
	copiedLabel = '',
	className = '',
	onCopy,
} ) {
	const inputRef = useRef( null );
	const timerRef = useRef( null );
	const [ copied, setCopied ] = useState( false );

	// A pending "Copied" reset must not fire after the field unmounts (a deleted row).
	useEffect(
		() => () => {
			if ( timerRef.current ) {
				clearTimeout( timerRef.current );
			}
		},
		[]
	);

	const handleCopy = useCallback( async () => {
		const ok = await copyText( value, inputRef.current );
		if ( ! ok ) {
			return;
		}

		setCopied( true );
		onCopy?.( value );

		if ( timerRef.current ) {
			clearTimeout( timerRef.current );
		}
		timerRef.current = setTimeout( () => setCopied( false ), 2000 );
	}, [ value, onCopy ] );

	const fieldLabel = label || __( 'Shortcode', 'easy-lightbox-wp' );
	const buttonLabel = copyLabel || __( 'Copy shortcode', 'easy-lightbox-wp' );

	return (
		<div
			className={ `sp-shaped-gallery-shortcode-field${
				copied ? ' is-copied' : ''
			} ${ className }`.trim() }
		>
			<span className="sp-shaped-gallery-shortcode-field__box" onClick={ handleCopy }>
				<input
					ref={ inputRef }
					type="text"
					className="sp-shaped-gallery-shortcode-field__input"
					value={ value }
					/*
					 * Native character-count sizing, not a fixed pixel width: a box
					 * wide enough for a 6-digit gallery id left a dead gap after a
					 * typical 3-digit one. `size` sizes the input to the VALUE's own
					 * length, so the copy icon always sits right after the text.
					 */
					size={ value.length || 1 }
					aria-label={ fieldLabel }
					readOnly
				/>

				<span className="sp-shaped-gallery-shortcode-field__action">
					{ /*
					 * Core's Tooltip rather than `title`: the native attribute cannot be
					 * styled and never opens on keyboard focus.
					 */ }
					<Tooltip text={ buttonLabel } delay={ TOOLTIP_DELAY } placement="top">
						<button
							type="button"
							className="sp-shaped-gallery-shortcode-field__copy"
							onClick={ ( event ) => {
								// The box beneath already copies on click — without this the
								// icon's click would bubble up and fire a second copy.
								event.stopPropagation();
								handleCopy();
							} }
							aria-label={ buttonLabel }
						>
							<CopyIcon />
						</button>
					</Tooltip>

					{ /*
					 * One element serves both audiences: the visible confirmation above the
					 * icon AND the live region announcing the copy, since the button is
					 * icon-only. It stays mounted with empty text rather than being rendered
					 * conditionally — a live region has to exist before its content changes
					 * for the change to be announced, and empty text is not announced.
					 */ }
					<span
						className={ `sp-shaped-gallery-shortcode-field__toast${
							copied ? ' is-visible' : ''
						}` }
						role="status"
						aria-live="polite"
					>
						{ copied ? copiedLabel || __( 'Copied', 'easy-lightbox-wp' ) : '' }
					</span>
				</span>
			</span>
		</div>
	);
}

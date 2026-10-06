/**
 * Toast notifications for the dashboard.
 *
 * A thin wrapper over `react-hot-toast`, kept to one file so every toast on the
 * screen carries the same class (for `admin.scss`'s toaster styling) without each
 * call site restating it.
 */
import toast from 'react-hot-toast';

const TOAST_CLASS = 'sp-shaped-gallery-dash-toast';

/**
 * @param {string} message Toast copy.
 * @return {void}
 */
export function toastSuccessMsg( message ) {
	toast.success( message, { className: TOAST_CLASS } );
}

/**
 * @param {string} message Toast copy.
 * @return {void}
 */
export function toastErrorMsg( message ) {
	toast.error( message, { className: TOAST_CLASS } );
}

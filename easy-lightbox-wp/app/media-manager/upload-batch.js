/**
 * Pure state helpers for one upload batch — every file the user picked or
 * dropped, from the moment the first one is queued until the last one settles.
 *
 * `wp.Uploader` only reports per-file events (`added` / `progress` /
 * `success` / `error`); its `complete` hook is never fired by core. Batch
 * completion — the signal that gates the redirect to the Media Library — is
 * therefore derived here from the per-file statuses. Kept free of React and
 * `wp.*` so the progress math is unit-testable in isolation.
 *
 * Entry shape: `{ id, cid, name, size, kind, preview, loaded, status, message,
 * item }`, where
 * `id` is plupload's file id (present from the first event, including filter
 * rejections that never get an attachment model) and `cid` is the Backbone
 * attachment cid (the only key core's `progress`/`success` callbacks carry —
 * it unsets `file` before calling `success`). The two id spaces never collide
 * (`o_…` vs `c…`), so lookups accept either.
 */

/**
 * Per-file lifecycle states.
 *
 * @type {{UPLOADING: string, DONE: string, FAILED: string}}
 */
export const ENTRY_STATUS = Object.freeze( {
	UPLOADING: 'uploading',
	DONE: 'done',
	FAILED: 'failed',
} );

/**
 * Whole-batch states, derived by `summarizeBatch()`.
 *
 * @type {{IDLE: string, UPLOADING: string, COMPLETE: string, FAILED: string}}
 */
export const BATCH_STATUS = Object.freeze( {
	IDLE: 'idle',
	UPLOADING: 'uploading',
	COMPLETE: 'complete',
	FAILED: 'failed',
} );

/**
 * A batch with no files in it.
 *
 * @type {Array}
 */
export const EMPTY_BATCH = Object.freeze( [] );

/**
 * Index of the entry matching a plupload file id or an attachment cid.
 *
 * @param {Array}  batch Batch entries.
 * @param {string} key   Plupload file id or attachment cid.
 * @return {number} Index, or -1.
 */
const indexOf = ( batch, key ) => ( key ? batch.findIndex( ( entry ) => entry.id === key || entry.cid === key ) : -1 );

/**
 * Return a copy of the batch with one entry patched.
 *
 * @param {Array}  batch Batch entries.
 * @param {number} index Entry index.
 * @param {Object} patch Fields to merge.
 * @return {Array} Next batch.
 */
const patchAt = ( batch, index, patch ) =>
	batch.map( ( entry, i ) => ( i === index ? { ...entry, ...patch } : entry ) );

/**
 * Queue a newly added file. Re-adding a known id is a no-op.
 *
 * @param {Array}  batch          Batch entries.
 * @param {Object} file           File descriptor.
 * @param {string} file.id        Plupload file id.
 * @param {string} [file.cid]     Attachment model cid.
 * @param {string} [file.name]    File name.
 * @param {number} [file.size]    Size in bytes.
 * @param {string} [file.kind]    'image' | 'video' | '' — drives the row's fallback icon.
 * @param {string} [file.preview] Object URL of a local image preview, if any.
 * @return {Array} Next batch.
 */
export function addEntry( batch, { id, cid = '', name = '', size = 0, kind = '', preview = '' } ) {
	if ( -1 !== indexOf( batch, id ) ) {
		return batch;
	}
	return [
		...batch,
		{
			id,
			cid,
			name,
			size: Math.max( 0, Number( size ) || 0 ),
			kind,
			preview,
			loaded: 0,
			status: ENTRY_STATUS.UPLOADING,
			message: '',
			item: null,
		},
	];
}

/**
 * Record bytes sent for an in-flight file. Clamped to the file size; settled
 * entries are left untouched (a late progress tick must not revive them).
 *
 * @param {Array}  batch  Batch entries.
 * @param {string} key    Plupload file id or attachment cid.
 * @param {number} loaded Bytes sent so far.
 * @return {Array} Next batch.
 */
export function setEntryProgress( batch, key, loaded ) {
	const index = indexOf( batch, key );
	if ( -1 === index || ENTRY_STATUS.UPLOADING !== batch[ index ].status ) {
		return batch;
	}
	const { size } = batch[ index ];
	const bytes = Math.max( 0, Number( loaded ) || 0 );
	return patchAt( batch, index, { loaded: size ? Math.min( bytes, size ) : bytes } );
}

/**
 * Mark a file as uploaded and processed by the server.
 *
 * @param {Array}  batch Batch entries.
 * @param {string} key   Plupload file id or attachment cid.
 * @param {Object} item  The normalized MediaItem the upload produced.
 * @return {Array} Next batch.
 */
export function markEntryDone( batch, key, item ) {
	const index = indexOf( batch, key );
	if ( -1 === index ) {
		return batch;
	}
	return patchAt( batch, index, { status: ENTRY_STATUS.DONE, loaded: batch[ index ].size, item } );
}

/**
 * Mark a file as failed. Files rejected by plupload's filters (too large, bad
 * extension) fail before they were ever added, so an unknown id is appended
 * as a failed entry instead of being dropped — the batch must still count it.
 *
 * @param {Array}  batch             Batch entries.
 * @param {Object} failure           Failure descriptor.
 * @param {string} failure.id        Plupload file id (or attachment cid).
 * @param {string} [failure.name]    File name.
 * @param {string} [failure.message] Error message to show for the file.
 * @return {Array} Next batch.
 */
export function markEntryFailed( batch, { id, name = '', message = '' } ) {
	const index = indexOf( batch, id );
	if ( -1 === index ) {
		return [
			...batch,
			{
				id,
				cid: '',
				name,
				size: 0,
				kind: '',
				preview: '',
				loaded: 0,
				status: ENTRY_STATUS.FAILED,
				message,
				item: null,
			},
		];
	}
	return patchAt( batch, index, { status: ENTRY_STATUS.FAILED, message } );
}

/**
 * Per-file upload percent (0–100), floored so 100 means every byte was sent.
 *
 * @param {Object} entry Batch entry.
 * @return {number} Percent.
 */
export function entryPercent( entry ) {
	if ( ENTRY_STATUS.DONE === entry.status ) {
		return 100;
	}
	if ( ! entry.size ) {
		return 0;
	}
	return Math.floor( ( entry.loaded / entry.size ) * 100 );
}

/**
 * Derive the batch's aggregate state.
 *
 * `percent` is byte-weighted across every file that has not failed, so one
 * large file moves the bar proportionally more than a small one. It only reads
 * 100 once every file is DONE: a file whose bytes are all sent is still being
 * processed server-side (sub-sizes, metadata) until core reports success, so
 * the bar holds at 99 rather than claiming completion early.
 *
 * @param {Array} batch Batch entries.
 * @return {{status: string, total: number, done: number, failed: number, inFlight: number, percent: number}} Summary.
 */
export function summarizeBatch( batch ) {
	let done = 0;
	let failed = 0;
	let inFlight = 0;
	let size = 0;
	let loaded = 0;

	batch.forEach( ( entry ) => {
		if ( ENTRY_STATUS.FAILED === entry.status ) {
			failed++;
			return;
		}
		if ( ENTRY_STATUS.DONE === entry.status ) {
			done++;
		} else {
			inFlight++;
		}
		size += entry.size;
		loaded += ENTRY_STATUS.DONE === entry.status ? entry.size : entry.loaded;
	} );

	let status = BATCH_STATUS.IDLE;
	if ( inFlight ) {
		status = BATCH_STATUS.UPLOADING;
	} else if ( failed ) {
		status = BATCH_STATUS.FAILED;
	} else if ( done ) {
		status = BATCH_STATUS.COMPLETE;
	}

	let percent = 0;
	if ( BATCH_STATUS.COMPLETE === status ) {
		percent = 100;
	} else if ( size ) {
		percent = Math.min( 99, Math.floor( ( loaded / size ) * 100 ) );
	} else if ( done + inFlight ) {
		// Zero-byte files carry no weight; fall back to a file count.
		percent = Math.min( 99, Math.floor( ( done / ( done + inFlight ) ) * 100 ) );
	}

	return { status, total: batch.length, done, failed, inFlight, percent };
}

/**
 * The MediaItems a batch produced, in upload order.
 *
 * @param {Array} batch Batch entries.
 * @return {Array} MediaItem[].
 */
export const uploadedItems = ( batch ) =>
	batch.filter( ( entry ) => ENTRY_STATUS.DONE === entry.status && entry.item ).map( ( entry ) => entry.item );

/**
 * Sharing the receipt through the device's native share sheet.
 *
 * This is the Web Share API, which needs no native app: `navigator.share()` opens the
 * same OS-level sheet the WhatsApp app itself uses, and WhatsApp appears there when it
 * is installed. Two consequences worth knowing:
 *
 *  - Only the file travels. WhatsApp ignores `text` when an image is attached, so the
 *    amount has to be part of the picture rather than a caption.
 *  - Support is uneven. Image files can be shared by Safari on iOS 14+, Chrome on
 *    Android 76+, Safari on macOS 14+, and Chrome on Windows 128+. Firefox cannot share
 *    files at all, so the fallback below downloads the image instead of dead-ending.
 */

import { downloadBlob } from './receiptImage.js';

function toFile(blob, filename) {
	return new File([blob], filename, { type: blob.type });
}

/** True when this browser can share image files through the share sheet. */
export function supportsFileSharing(blob, filename) {
	if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') {
		return false;
	}

	try {
		return navigator.canShare({ files: [toFile(blob, filename)] });
	} catch {
		return false;
	}
}

/**
 * Shares the image, falling back to a download.
 *
 * Everything up to the `navigator.share()` call is deliberately synchronous: any `await`
 * here risks consuming the tap's transient activation, which would make the browser
 * refuse the share. The blob is rendered beforehand and only handed over here.
 *
 * @returns {Promise<'shared' | 'downloaded' | 'cancelled'>}
 */
export async function shareReceipt({ blob, filename, title, text }) {
	const file = toFile(blob, filename);

	if (supportsFileSharing(blob, filename)) {
		try {
			await navigator.share({ files: [file], title, text });
			return 'shared';
		} catch (error) {
			// Dismissing the sheet is a normal outcome, not a failure.
			if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
			// Anything else (permissions policy, no share targets, …): fall through to a download.
		}
	}

	downloadBlob(blob, filename);
	return 'downloaded';
}

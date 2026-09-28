/**
 * Turns the receipt model into a shareable JPEG.
 *
 * The image is rendered ahead of the user's tap and cached, rather than produced inside
 * the click handler. This matters: `navigator.share()` requires *transient activation*,
 * and awaiting work before calling it can consume that activation, after which the
 * browser rejects the share with NotAllowedError.
 */

import { drawReceipt } from './drawReceipt.js';
import signatureUrl from '$lib/assets/firma_veronica.jpg';

const JPEG_QUALITY = 0.92;
const MIME_TYPE = 'image/jpeg';

/** Resolves once the image has decoded, so the canvas never draws a blank bitmap. */
export function loadImage(source) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('No se pudo leer la imagen de la firma.'));
		image.src = source;
	});
}

function canvasToBlob(canvas) {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error('No se pudo generar la imagen.'));
			},
			MIME_TYPE,
			JPEG_QUALITY
		);
	});
}

/**
 * Renders the receipt and returns a JPEG blob plus its suggested filename.
 *
 * @param {{ model: object, settings: object, now?: Date }} input
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function renderReceiptImage({ model, settings, now }) {
	// The signature ships with the app. A decode failure must not blank the receipt, so the
	// drawing code simply omits it.
	const signatureImage = await loadImage(signatureUrl).catch(() => null);

	const canvas = drawReceipt({ model, settings, now, signatureImage });
	const blob = await canvasToBlob(canvas);

	return { blob, filename: receiptFilename(model.weekEnd) };
}

/** Builds the filename, e.g. "comprobante-2026-04-04.jpg". */
export function receiptFilename(weekEnd) {
	const stamp = [
		weekEnd.getFullYear(),
		String(weekEnd.getMonth() + 1).padStart(2, '0'),
		String(weekEnd.getDate()).padStart(2, '0')
	].join('-');

	return `comprobante-${stamp}.jpg`;
}

/** Saves a blob to the user's downloads folder. */
export function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	// Give the browser a moment to start the download before revoking the URL.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export { MIME_TYPE };

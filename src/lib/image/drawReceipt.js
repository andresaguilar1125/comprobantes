/**
 * Draws the payment receipt onto a canvas, following the layout sketched out in
 * `src/assets/template.xml`.
 *
 * It is a raster image rather than a PDF so it can go through the device's native share
 * sheet (WhatsApp, Mail, …). Drawing on a canvas means the browser renders the text with
 * its own fonts, so the colón symbol and accents are handled correctly.
 *
 * Typography follows the sketch's heading pair: a large bold title, a slightly smaller
 * bold total, and one uniform body size for everything else.
 */

import { formatAmountForReceipt } from '$lib/domain/currency.js';
import { formatLongEs } from '$lib/domain/dates.js';

/** Rendered at 2x so text stays crisp when the image is viewed large or printed. */
const SCALE = 2;

/** Content box mirrored from the sketch's 700-wide geometry. */
const WIDTH = 700;
const PAD = 40;
const RIGHT = WIDTH - PAD;

// One shared body size, so no line looks accidentally more important than another.
const HEADING_1 = 31;
const HEADING_2 = 26;
const BODY = 19;
const CAPTION = 15;

const INK = '#111827';
const MUTED = '#6b7280';
const RULE = '#111827';
const WHITE = '#ffffff';

// System font stack, so the image matches the surrounding UI on every platform.
const FONT_FAMILY =
	'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function font(size, weight = '400') {
	return `${weight} ${size}px ${FONT_FAMILY}`;
}

/** "28/09/2026 03:01 PM". */
export function formatStamp(date) {
	const pad = (n) => String(n).padStart(2, '0');
	const suffix = date.getHours() >= 12 ? 'PM' : 'AM';
	const hours = date.getHours() % 12 || 12;

	const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
	const time = `${pad(hours)}:${pad(date.getMinutes())} ${suffix}`;

	return `${day} ${time}`;
}

/**
 * Derives every y position from the content, so the sheet grows by exactly one row per
 * holiday, plus one more when a note is present, and nothing overlaps.
 *
 * @param {{ holidayCount?: number, hasNote?: boolean }} [input] how many rows to lay out
 */
export function computeLayout({ holidayCount = 0, hasNote = false } = {}) {
	const titleY = 34;
	const stampY = 62;
	const headerRuleY = 84;

	const weekY = 120;
	const officeY = 148;

	// Label/value rows, evenly spaced. Three fixed rows: "A nombre de",
	// "Identificacion" and "Salario Semanal", then one more per holiday, then the
	// optional note.
	const rowsTop = 190;
	const rowStep = 42;
	const holidaysTop = rowsTop + rowStep * 3;

	// The closing rule sits a fixed gap below the last row actually drawn, so the
	// spacing stays even whether there are no holidays, one, or several.
	const extraRows = Math.max(holidayCount, 0) + (hasNote ? 1 : 0);
	const lastRowY = rowsTop + (3 + extraRows - 1) * rowStep;
	const totalRuleY = lastRowY + 40;
	const totalY = totalRuleY + 46;

	// No frame around the signature: the rule below it is the signing line.
	const signatureTop = totalY + 34;
	const signatureBoxHeight = 78;
	const signatureRuleY = signatureTop + signatureBoxHeight + 14;
	const signatureCaptionY = signatureRuleY + 26;

	const footerY = signatureCaptionY + 18;

	return {
		titleY,
		stampY,
		headerRuleY,
		weekY,
		officeY,
		rowsTop,
		rowStep,
		holidaysTop,
		totalRuleY,
		totalY,
		signatureTop,
		signatureBoxHeight,
		signatureRuleY,
		signatureCaptionY,
		footerY,
		width: WIDTH,
		height: footerY + 12
	};
}

function rule(ctx, y, width = 2) {
	ctx.strokeStyle = RULE;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(PAD, y);
	ctx.lineTo(RIGHT, y);
	ctx.stroke();
}

/** Label on the left, value flush right — the alignment the sketch uses. */
function pair(ctx, label, value, y) {
	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = font(BODY);
	ctx.fillText(label, PAD, y);

	ctx.textAlign = 'right';
	ctx.font = font(BODY, '700');
	ctx.fillText(value ?? '', RIGHT, y, RIGHT - (PAD + 220));
	ctx.textAlign = 'left';
}

/** Draws an image inside a box, preserving its aspect ratio and centring it. */
function contained(ctx, image, x, y, maxWidth, maxHeight) {
	if (!image) return;

	const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
	const width = image.width * ratio;
	const height = image.height * ratio;

	ctx.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
}

/**
 * Renders the receipt and returns the canvas.
 *
 * @param {{
 *   model: object,
 *   settings: object,
 *   now?: Date,
 *   signatureImage?: HTMLImageElement | null
 * }} input
 * @returns {HTMLCanvasElement}
 */
export function drawReceipt({ model, settings, now = new Date(), signatureImage = null }) {
	// Each holiday gets its own line, so two in one week read as two charges.
	const holidayConcepts = model.concepts.filter((concept) => concept.isHoliday);

	// An empty note must not leave a blank row behind.
	const note = model.note ?? '';

	const layout = computeLayout({ holidayCount: holidayConcepts.length, hasNote: Boolean(note) });

	const canvas = document.createElement('canvas');
	canvas.width = layout.width * SCALE;
	canvas.height = layout.height * SCALE;

	const ctx = canvas.getContext('2d');
	ctx.scale(SCALE, SCALE);

	// JPEG has no transparency, so paint a white page first.
	ctx.fillStyle = WHITE;
	ctx.fillRect(0, 0, layout.width, layout.height);

	// --- Title block ---------------------------------------------------------
	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = font(HEADING_1, '700');
	ctx.fillText('COMPROBANTE PAGO SEMANAL', PAD, layout.titleY);

	ctx.font = font(BODY);
	ctx.fillStyle = MUTED;
	ctx.fillText(formatStamp(now), PAD, layout.stampY);

	rule(ctx, layout.headerRuleY);

	// --- Period and description ---------------------------------------------
	ctx.fillStyle = INK;
	ctx.font = font(BODY);
	ctx.fillText(
		`${formatLongEs(model.weekStart)} al ${formatLongEs(model.weekEnd)}`,
		PAD,
		layout.weekY
	);
	ctx.fillText(settings.officeDescription, PAD, layout.officeY);

	// --- Label / value rows --------------------------------------------------
	pair(ctx, 'A nombre de', settings.employeeName, layout.rowsTop);
	pair(ctx, 'Identificacion', settings.employeeId, layout.rowsTop + layout.rowStep);
	pair(
		ctx,
		'Salario Semanal',
		formatAmountForReceipt(model.weeklySalary),
		layout.rowsTop + layout.rowStep * 2
	);

	// One line per holiday. The label already carries its own prefix
	// ("Feriado - Navidad"), so nothing is added here — adding one produced the title
	// "Dia Feriado Feriado - Navidad".
	holidayConcepts.forEach((concept, index) => {
		pair(
			ctx,
			concept.label,
			formatAmountForReceipt(concept.amount),
			layout.holidaysTop + index * layout.rowStep
		);
	});

	// The optional note, on the row after the last holiday. It carries no amount, so the
	// value is written on the left, right after the label, rather than flush right.
	if (note) {
		const noteY = layout.holidaysTop + holidayConcepts.length * layout.rowStep;

		ctx.textAlign = 'left';
		ctx.fillStyle = INK;
		ctx.font = font(BODY);
		ctx.fillText('Nota', PAD, noteY);

		const labelWidth = ctx.measureText('Nota').width;
		ctx.font = font(BODY, '700');
		ctx.fillText(note, PAD + labelWidth + 12, noteY, RIGHT - (PAD + labelWidth + 12));
	}

	// --- Total ---------------------------------------------------------------
	rule(ctx, layout.totalRuleY, 2.5);

	ctx.fillStyle = INK;
	ctx.font = font(HEADING_2, '700');
	ctx.fillText('Monto Total', PAD, layout.totalY);

	ctx.textAlign = 'right';
	ctx.fillText(formatAmountForReceipt(model.total), RIGHT, layout.totalY);
	ctx.textAlign = 'left';

	// --- Signature -----------------------------------------------------------
	// No frame: the signature floats above a single signing line.
	contained(
		ctx,
		signatureImage,
		PAD,
		layout.signatureTop,
		WIDTH - 2 * PAD,
		layout.signatureBoxHeight
	);

	rule(ctx, layout.signatureRuleY);

	ctx.fillStyle = INK;
	ctx.font = font(BODY);
	ctx.fillText('Firma de recibido', PAD, layout.signatureCaptionY);

	return canvas;
}

export { BODY, CAPTION, HEADING_1, HEADING_2, SCALE, WIDTH };

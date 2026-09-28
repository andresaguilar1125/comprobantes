import { describe, expect, it } from 'vitest';

import holidaysData from '../src/lib/data/holidays.json';
import { DEFAULT_SETTINGS } from '../src/lib/domain/config.js';
import { weekRangeFromEndingSaturday } from '../src/lib/domain/dates.js';
import {
	buildReceiptModel,
	holidaysInWeek,
	resolveHolidays
} from '../src/lib/domain/payroll.js';
import { drawReceipt } from '../src/lib/image/drawReceipt.js';

/**
 * Guards the text that actually reaches the canvas.
 *
 * The model and the drawing code each used to add a prefix, producing
 * "Dia Feriado Feriado - Navidad" on the receipt. Asserting only on the model missed it,
 * because the duplication happened downstream while drawing. These tests capture the
 * strings handed to `fillText` instead, which is the seam where the bug occurred.
 */

const SETTINGS = { ...DEFAULT_SETTINGS, weeklySalary: 70000, holidayRate: 12000 };

/** Builds a receipt model for the week closing on the given "YYYY-MM-DD" Saturday. */
function modelForWeekEnding(isoDate) {
	const [y, m, d] = isoDate.split('-').map(Number);
	const weekEnd = new Date(y, m - 1, d);
	const { start } = weekRangeFromEndingSaturday(weekEnd);
	const holidays = resolveHolidays(holidaysData, weekEnd.getFullYear());
	const holidays_ = holidaysInWeek(start, holidays);

	return buildReceiptModel({ settings: SETTINGS, weekEnd, weekStart: start, holidays: holidays_ });
}

/**
 * Draws the receipt with a stubbed canvas context and returns every string passed to
 * `fillText`. Only the text calls matter here, so the rest of the 2D API is a no-op.
 */
function drawnText(model) {
	const texts = [];
	const record = (text) => {
		texts.push(String(text));
	};

	const context = {
		// Layout needs a measurable string width; the exact value is irrelevant here.
		measureText: (text) => ({ width: String(text).length * 8 }),
		fillText: record,
		strokeText: record,
		scale: () => {},
		fillRect: () => {},
		strokeRect: () => {},
		beginPath: () => {},
		moveTo: () => {},
		lineTo: () => {},
		stroke: () => {},
		drawImage: () => {}
	};

	const canvas = {
		width: 0,
		height: 0,
		getContext: () => context
	};

	const originalCreateElement = globalThis.document?.createElement;

	globalThis.document = {
		createElement: (tag) => (tag === 'canvas' ? canvas : {})
	};

	try {
		drawReceipt({ model, settings: SETTINGS, now: new Date(2026, 8, 28, 15, 1), signatureImage: null });
	} finally {
		if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
		else delete globalThis.document;
	}

	return texts;
}

describe('receipt row text', () => {
	it('names each holiday row as "Feriado - <name>"', () => {
		const texts = drawnText(modelForWeekEnding('2026-04-04'));

		expect(texts).toContain('Feriado - Jueves Santo');
		expect(texts).toContain('Feriado - Viernes Santo');
	});

	it('never prefixes a row with the old "Dia Feriado" wording', () => {
		const texts = drawnText(modelForWeekEnding('2026-04-04'));

		expect(texts.filter((text) => /dia feriado/i.test(text))).toEqual([]);
	});

	it('never repeats the holiday prefix twice', () => {
		for (const week of ['2026-04-04', '2026-12-26', '2026-09-19']) {
			const texts = drawnText(modelForWeekEnding(week));

			for (const text of texts) {
				expect(text, `${week}: "${text}"`).not.toMatch(/feriado\s*-\s*feriado/i);
				expect(text, `${week}: "${text}"`).not.toMatch(/feriado.*feriado -/i);
			}
		}
	});

	it('uses the holiday name and no other wording for a single-holiday week', () => {
		const texts = drawnText(modelForWeekEnding('2026-12-26'));
		const holidayRows = texts.filter((text) => /^Feriado -/.test(text));

		expect(holidayRows).toEqual(['Feriado - Navidad']);
	});

	it('draws one row per holiday, plus the salary and the total', () => {
		const texts = drawnText(modelForWeekEnding('2026-04-04'));

		expect(texts).toContain('Salario Semanal');
		expect(texts).toContain('Monto Total');
		expect(texts.filter((text) => /^Feriado -/.test(text))).toHaveLength(2);
		expect(texts).toContain('94,000.00 CRC');
	});

	it('draws no holiday row when the week has no holiday', () => {
		const texts = drawnText(modelForWeekEnding('2026-09-26'));

		expect(texts.filter((text) => /^Feriado -/.test(text))).toEqual([]);
		expect(texts).toContain('70,000.00 CRC');
	});
});

import { describe, expect, it } from 'vitest';

import holidaysData from '../src/lib/data/holidays.json';
import { DEFAULT_SETTINGS } from '../src/lib/domain/config.js';
import { weekRangeFromEndingSaturday } from '../src/lib/domain/dates.js';
import {
	buildReceiptModel,
	holidaysInWeek,
	resolveHolidays,
	sanitiseNote
} from '../src/lib/domain/payroll.js';
import { computeLayout, drawReceipt } from '../src/lib/image/drawReceipt.js';

/**
 * Guards the note: how it is normalised, and the text that actually reaches the canvas.
 * Asserting on the model alone is not enough — a row can be built correctly and then be
 * drawn wrong, which is exactly how the "Dia Feriado" bug slipped through.
 */

const SETTINGS = { ...DEFAULT_SETTINGS, weeklySalary: 70000, holidayRate: 12000 };

function modelForWeekEnding(isoDate, note = '') {
	const [y, m, d] = isoDate.split('-').map(Number);
	const weekEnd = new Date(y, m - 1, d);
	const { start } = weekRangeFromEndingSaturday(weekEnd);
	const holidays = resolveHolidays(holidaysData, weekEnd.getFullYear());
	const split = holidaysInWeek(start, holidays);

	return buildReceiptModel({
		settings: SETTINGS,
		weekEnd,
		weekStart: start,
		holidays: split,
		note
	});
}

/** Draws with a stubbed canvas and returns every string passed to `fillText`. */
function drawnText(model) {
	const texts = [];
	const record = (text) => texts.push(String(text));

	const context = {
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

	const canvas = { width: 0, height: 0, getContext: () => context };
	const original = globalThis.document?.createElement;

	globalThis.document = { createElement: (tag) => (tag === 'canvas' ? canvas : {}) };

	try {
		drawReceipt({
			model,
			settings: SETTINGS,
			now: new Date(2026, 8, 28, 15, 1),
			signatureImage: null
		});
	} finally {
		if (original) globalThis.document.createElement = original;
		else delete globalThis.document;
	}

	return texts;
}

describe('sanitiseNote', () => {
	it('forces uppercase', () => {
		expect(sanitiseNote('efectivo')).toBe('EFECTIVO');
		expect(sanitiseNote('Sinpe')).toBe('SINPE');
		expect(sanitiseNote('adelanto parcial aguinaldo')).toBe('ADELANTO PARCIAL AGUINALDO');
	});

	it('keeps accents, digits and the allowed punctuation', () => {
		expect(sanitiseNote('pago #2 (parcial) - 15/09')).toBe('PAGO #2 (PARCIAL) - 15/09');
		expect(sanitiseNote('depósito señá')).toBe('DEPÓSITO SEÑÁ');
	});

	it('strips characters that could break the drawing', () => {
		expect(sanitiseNote('a<b>c"d\\e$f')).toBe('ABCDEF');
		expect(sanitiseNote('line\nbreak\ttab')).toBe('LINEBREAKTAB');
	});

	it('collapses leading and trailing whitespace', () => {
		expect(sanitiseNote('   efectivo   ')).toBe('EFECTIVO');
	});

	it('treats missing values as empty', () => {
		expect(sanitiseNote(undefined)).toBe('');
		expect(sanitiseNote(null)).toBe('');
		expect(sanitiseNote('    ')).toBe('');
	});
});

describe('note in the receipt model', () => {
	it('carries the normalised note', () => {
		const model = modelForWeekEnding('2026-09-26', 'Efectivo');
		expect(model.note).toBe('EFECTIVO');
	});

	it('defaults to an empty note', () => {
		expect(modelForWeekEnding('2026-09-26').note).toBe('');
	});
});

describe('note on the drawn receipt', () => {
	it('draws the label and the value when a note is present', () => {
		const texts = drawnText(modelForWeekEnding('2026-09-26', 'Sinpe'));

		expect(texts).toContain('Nota');
		expect(texts).toContain('SINPE');
	});

	it('draws no note row when the note is empty', () => {
		const texts = drawnText(modelForWeekEnding('2026-09-26'));

		expect(texts).not.toContain('Nota');
		expect(texts.some((text) => /EFECTIVO|SINPE/.test(text))).toBe(false);
	});

	it('draws no note row when the note is only whitespace', () => {
		const texts = drawnText(modelForWeekEnding('2026-09-26', '   '));

		expect(texts).not.toContain('Nota');
	});

	it('prints the note in uppercase even if given lowercase', () => {
		const texts = drawnText(modelForWeekEnding('2026-09-26', 'adelanto parcial aguinaldo'));

		expect(texts).toContain('ADELANTO PARCIAL AGUINALDO');
		expect(texts.some((text) => /adelanto/.test(text))).toBe(false);
	});

	it('still draws the holidays and the total alongside the note', () => {
		const texts = drawnText(modelForWeekEnding('2026-04-04', 'SINPE'));

		expect(texts).toContain('Feriado - Jueves Santo');
		expect(texts).toContain('Feriado - Viernes Santo');
		expect(texts).toContain('SINPE');
		expect(texts).toContain('94,000.00 CRC');
	});
});

describe('layout with a note', () => {
	it('grows by one row when a note is present', () => {
		const without = computeLayout({ holidayCount: 0, hasNote: false });
		const withNote = computeLayout({ holidayCount: 0, hasNote: true });

		expect(withNote.height - without.height).toBe(without.rowStep);
	});

	it('counts holidays and the note together', () => {
		const two = computeLayout({ holidayCount: 2, hasNote: false });
		const twoPlusNote = computeLayout({ holidayCount: 2, hasNote: true });
		const three = computeLayout({ holidayCount: 3, hasNote: false });

		expect(twoPlusNote.height).toBe(three.height);
		expect(twoPlusNote.height).toBeGreaterThan(two.height);
	});

	it('keeps a two-holiday week with a note within budget', () => {
		expect(computeLayout({ holidayCount: 2, hasNote: true }).height).toBeLessThanOrEqual(700);
	});
});

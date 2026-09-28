import { describe, expect, it } from 'vitest';

import holidaysData from '../src/lib/data/holidays.json';
import { DEFAULT_SETTINGS } from '../src/lib/domain/config.js';
import { isoKey, saturdaysOfYear, weekRangeFromEndingSaturday } from '../src/lib/domain/dates.js';
import {
	buildReceiptModel,
	describeHolidays,
	holidaysInWeek,
	resolveHolidays
} from '../src/lib/domain/payroll.js';

const SETTINGS = { ...DEFAULT_SETTINGS, weeklySalary: 70000, holidayRate: 12000 };

/** Builds a receipt model for the week closing on the given "YYYY-MM-DD" Saturday. */
function modelForWeekEnding(isoDate) {
	const [y, m, d] = isoDate.split('-').map(Number);
	const weekEnd = new Date(y, m - 1, d);
	const { start } = weekRangeFromEndingSaturday(weekEnd);
	const holidays = resolveHolidays(holidaysData, weekEnd.getFullYear());
	const split = holidaysInWeek(start, holidays);
	return buildReceiptModel({ settings: SETTINGS, weekEnd, weekStart: start, holidays: split });
}

describe('holidays.json', () => {
	it('contains exactly the 9 mandatory dates for 2026', () => {
		const entry = holidaysData.find((h) => h.year === 2026);

		expect(entry.dates).toHaveLength(9);
		expect(entry.dates).toEqual([
			'01-01',
			'04-02',
			'04-03',
			'04-11',
			'05-01',
			'07-25',
			'08-15',
			'09-15',
			'12-25'
		]);
	});

	it('labels every date', () => {
		const entry = holidaysData[0];
		for (const date of entry.dates) {
			expect(entry.labels[date]).toBeTruthy();
		}
	});

	/**
	 * Guards the deliberate exclusions: these are the 2026 holidays whose payment is
	 * NOT obligatory, so they must never trigger extra pay.
	 */
	it('excludes the non-mandatory holidays', () => {
		const entry = holidaysData.find((h) => h.year === 2026);
		expect(entry.dates).not.toContain('08-02');
		expect(entry.dates).not.toContain('08-31');
		expect(entry.dates).not.toContain('12-01');
	});

	it('resolves each date onto the correct calendar day', () => {
		const holidays = resolveHolidays(holidaysData, 2026);
		const newYear = holidays.find((h) => h.key === '01-01');

		expect(isoKey(newYear.date)).toBe('2026-01-01');
		expect(newYear.label).toBe('Año Nuevo');
	});

	it('returns nothing for an unsupported year', () => {
		expect(resolveHolidays(holidaysData, 2030)).toEqual([]);
	});
});

describe('holiday detection per week', () => {
	it('finds no holiday in an ordinary week', () => {
		const model = modelForWeekEnding('2026-09-26');

		expect(model.holidayCount).toBe(0);
		expect(model.total).toBe(70000);
	});

	it('pays one holiday for the week containing a Saturday holiday', () => {
		// Juan Santamaría falls on Saturday Apr 11, a working day for this employee.
		const model = modelForWeekEnding('2026-04-11');

		expect(model.holidayCount).toBe(1);
		expect(model.total).toBe(82000);
	});

	it('pays one holiday for a Friday holiday', () => {
		const model = modelForWeekEnding('2026-05-02');
		expect(model.total).toBe(82000);
	});

	/**
	 * The key edge case: Jueves Santo (Apr 2) and Viernes Santo (Apr 3) fall in the
	 * same pay week, so the rate is applied per day.
	 */
	it('pays per holiday day when two holidays share a week', () => {
		const model = modelForWeekEnding('2026-04-04');

		expect(model.holidayCount).toBe(2);
		expect(model.holidayTotal).toBe(24000);
		expect(model.total).toBe(94000);
		expect(describeHolidays(model.paidHolidays)).toBe('Jueves Santo y Viernes Santo');
	});

	it('covers all eight holiday weeks of 2026', () => {
		const saturdays = saturdaysOfYear(2026);
		const models = saturdays.map((saturday) =>
			modelForWeekEnding(isoKey(saturday))
		);
		const withHolidays = models.filter((m) => m.holidayCount > 0);

		// 9 holidays across 8 distinct weeks (Holy Week holds two of them).
		expect(withHolidays).toHaveLength(8);
		expect(withHolidays.reduce((sum, m) => sum + m.holidayCount, 0)).toBe(9);
		expect(withHolidays.every((m) => m.total > 70000)).toBe(true);
	});

	it('never pays more than two holidays in a 2026 week', () => {
		for (const saturday of saturdaysOfYear(2026)) {
			expect(modelForWeekEnding(isoKey(saturday)).holidayCount).toBeLessThanOrEqual(2);
		}
	});
});

describe('Sunday holidays', () => {
	/**
	 * No 2026 mandatory holiday falls on a Sunday, so this exercises the rule with a
	 * synthetic date. It keeps the data file future-proof.
	 */
	it('skips a holiday that falls on the rest day', () => {
		const sunday = new Date(2026, 7, 2); // Sunday Aug 2 2026
		const { start } = weekRangeFromEndingSaturday(new Date(2026, 7, 8));
		const split = holidaysInWeek(start, [
			{ key: '08-02', label: 'Feriado de prueba', date: sunday }
		]);

		expect(split.paid).toHaveLength(0);
		expect(split.skippedSunday).toHaveLength(1);
	});

	it('still pays holidays in the same week as a skipped Sunday holiday', () => {
		const sunday = new Date(2026, 7, 2);
		const saturdayHoliday = new Date(2026, 7, 8);
		const { start } = weekRangeFromEndingSaturday(new Date(2026, 7, 8));
		const split = holidaysInWeek(start, [
			{ key: '08-02', label: 'Domingo', date: sunday },
			{ key: '08-08', label: 'Sábado', date: saturdayHoliday }
		]);

		expect(split.paid).toHaveLength(1);
		expect(split.skippedSunday).toHaveLength(1);
	});
});

describe('buildReceiptModel', () => {
	it('always includes the weekly salary as a checked concept', () => {
		const model = modelForWeekEnding('2026-09-26');
		const weekly = model.concepts.find((c) => c.key === 'weekly');

		expect(weekly.checked).toBe(true);
		expect(weekly.amount).toBe(70000);
		expect(model.concepts).toHaveLength(1);
	});

	it('produces one concept per paid holiday, each checked', () => {
		const model = modelForWeekEnding('2026-04-04');
		const holidayConcepts = model.concepts.filter((c) => c.isHoliday);

		expect(holidayConcepts).toHaveLength(2);
		expect(holidayConcepts.every((c) => c.checked)).toBe(true);
		expect(holidayConcepts.every((c) => c.amount === 12000)).toBe(true);
		expect(holidayConcepts[0].detail).toBe('Jueves Santo');
	});

	it('totals the concepts', () => {
		const model = modelForWeekEnding('2026-04-04');
		const sum = model.concepts.reduce((acc, c) => acc + c.amount, 0);

		expect(sum).toBe(model.total);
		expect(model.total).toBe(94000);
	});

	it('respects edited settings', () => {
		// April 11 2026 is a Saturday and also Juan Santamaría Day.
		const weekEnd = new Date(2026, 3, 11);
		const { start } = weekRangeFromEndingSaturday(weekEnd);
		const holidays = resolveHolidays(holidaysData, 2026);
		const split = holidaysInWeek(start, holidays);

		const model = buildReceiptModel({
			settings: { weeklySalary: 80000, holidayRate: 15000 },
			weekEnd,
			weekStart: start,
			holidays: split
		});

		expect(model.total).toBe(95000);
	});
});

describe('receipt row labels', () => {
	/**
	 * Regression guard: the row title used to be assembled in the drawing code by
	 * prefixing the generic concept label, which produced "Dia Feriado Día feriado
	 * laborado". The finished title now comes from the model, so it cannot double up.
	 */
	it('names each holiday row after the holiday itself', () => {
		const model = modelForWeekEnding('2026-04-04');
		const holidayLabels = model.concepts.filter((c) => c.isHoliday).map((c) => c.label);

		expect(holidayLabels).toEqual(['Feriado - Jueves Santo', 'Feriado - Viernes Santo']);
	});

	it('names a single holiday row after its own holiday', () => {
		const model = modelForWeekEnding('2026-12-26');
		const holiday = model.concepts.find((c) => c.isHoliday);

		expect(holiday.label).toBe('Feriado - Navidad');
	});

	it('keeps the generic wording out of the row title', () => {
		const model = modelForWeekEnding('2026-04-04');
		const labels = model.concepts.map((c) => c.label).join(' | ');

		expect(labels).not.toMatch(/feriado laborado/i);
		expect(labels).not.toMatch(/Dia Feriado Dia/i);
	});

	it('labels the weekly row without a prefix', () => {
		const model = modelForWeekEnding('2026-04-04');
		expect(model.concepts[0].label).toBe('Salario semanal');
	});
});

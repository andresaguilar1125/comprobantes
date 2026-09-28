import { describe, expect, it } from 'vitest';

import {
	addDays,
	defaultSaturday,
	formatLongEs,
	formatShortEs,
	isoKey,
	monthDayKey,
	saturdaysOfYear,
	weekRangeFromEndingSaturday,
	weekdayEs
} from '../src/lib/domain/dates.js';

describe('saturdaysOfYear', () => {
	it('lists every Saturday of 2026, starting Jan 3 and ending Dec 26', () => {
		const saturdays = saturdaysOfYear(2026);

		expect(saturdays).toHaveLength(52);
		expect(isoKey(saturdays[0])).toBe('2026-01-03');
		expect(isoKey(saturdays.at(-1))).toBe('2026-12-26');
	});

	it('only returns Saturdays, all inside the requested year', () => {
		for (const saturday of saturdaysOfYear(2026)) {
			expect(saturday.getDay()).toBe(6);
			expect(saturday.getFullYear()).toBe(2026);
			expect(`${saturday.getHours()}${saturday.getMinutes()}`).toBe('00');
		}
	});

	it('handles a leap year without drifting', () => {
		const saturdays = saturdaysOfYear(2028);
		expect(saturdays.every((d) => d.getDay() === 6)).toBe(true);
		expect(saturdays.at(-1).getFullYear()).toBe(2028);
	});
});

describe('weekRangeFromEndingSaturday', () => {
	it('spans Sunday through Saturday', () => {
		const { start, end } = weekRangeFromEndingSaturday(new Date(2026, 3, 4));

		expect(isoKey(start)).toBe('2026-03-29');
		expect(isoKey(end)).toBe('2026-04-04');
		expect(start.getDay()).toBe(0);
		expect(end.getDay()).toBe(6);
		expect(isoKey(addDays(start, 6))).toBe(isoKey(end));
	});

	/**
	 * Regression guard: a week covering a month rollover must not slip a day. This is
	 * exactly the case that breaks if dates are serialised via toISOString() in UTC-6.
	 */
	it('crosses a month boundary correctly', () => {
		const { start, end } = weekRangeFromEndingSaturday(new Date(2026, 4, 2));

		expect(isoKey(start)).toBe('2026-04-26');
		expect(isoKey(end)).toBe('2026-05-02');
	});

	it('crosses a year boundary correctly', () => {
		const { start, end } = weekRangeFromEndingSaturday(new Date(2026, 0, 3));

		expect(isoKey(start)).toBe('2025-12-28');
		expect(isoKey(end)).toBe('2026-01-03');
	});
});

describe('defaultSaturday', () => {
	const saturdays = saturdaysOfYear(2026);

	it('picks the most recent Saturday that is not in the future', () => {
		// 2026-09-28 is a Monday, so the week closes on Saturday Sep 26.
		const picked = defaultSaturday(saturdays, new Date(2026, 8, 28));
		expect(isoKey(picked)).toBe('2026-09-26');
	});

	it('keeps the same Saturday when today is Saturday', () => {
		const picked = defaultSaturday(saturdays, new Date(2026, 8, 26));
		expect(isoKey(picked)).toBe('2026-09-26');
	});

	it('falls back to the first Saturday when today precedes the year', () => {
		const picked = defaultSaturday(saturdays, new Date(2025, 0, 1));
		expect(isoKey(picked)).toBe('2026-01-03');
	});

	it('falls back to the last Saturday when today follows the year', () => {
		const picked = defaultSaturday(saturdays, new Date(2027, 5, 1));
		expect(isoKey(picked)).toBe('2026-12-26');
	});
});

describe('formatting', () => {
	it('formats short and long Spanish dates', () => {
		const date = new Date(2026, 3, 4);
		expect(formatShortEs(date)).toBe('04/04/2026');
		expect(formatLongEs(date)).toBe('4 de abril de 2026');
	});

	it('names weekdays in Spanish', () => {
		expect(weekdayEs(new Date(2026, 3, 2))).toBe('jueves');
		expect(weekdayEs(new Date(2026, 3, 4))).toBe('sábado');
		expect(weekdayEs(new Date(2026, 2, 29))).toBe('domingo');
	});

	it('builds zero-padded holiday lookup keys', () => {
		expect(monthDayKey(new Date(2026, 0, 1))).toBe('01-01');
		expect(monthDayKey(new Date(2026, 11, 25))).toBe('12-25');
	});
});

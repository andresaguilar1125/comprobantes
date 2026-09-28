/**
 * Builds the month grid for the date picker.
 *
 * Weeks run Sunday → Saturday to match the pay week: a week is paid on the Saturday that
 * closes it, so Saturday is the only day that can be selected. Sunday is the rest day and
 * starts the range.
 */

import { addDays, isoKey, monthNameEs } from './dates.js';

export const WEEKDAY_HEADERS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "abril 2026" */
export function monthTitle(year, month) {
	return `${monthNameEs(month)} ${year}`;
}

/** Every Saturday key in the given month, as "YYYY-MM-DD". */
export function saturdayKeysIn(year, month) {
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const keys = [];

	for (let day = 1; day <= daysInMonth; day += 1) {
		const date = new Date(year, month, day);
		if (date.getDay() === 6) keys.push(isoKey(date));
	}

	return keys;
}

/**
 * The days of `month`, padded with the neighbouring months' days so each row is a
 * complete week. Only the rows the month actually needs are returned, so the grid never
 * ends with a blank line.
 *
 * @returns {Array<{ date: Date, key: string, inMonth: boolean, isSaturday: boolean }>}
 */
export function monthGrid(year, month) {
	const first = new Date(year, month, 1);
	// The Sunday on or before the 1st.
	const start = addDays(first, -first.getDay());

	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const rows = Math.ceil((first.getDay() + daysInMonth) / 7);

	const days = [];
	for (let i = 0; i < rows * 7; i += 1) {
		const date = addDays(start, i);
		days.push({
			date,
			key: isoKey(date),
			inMonth: date.getMonth() === month,
			isSaturday: date.getDay() === 6
		});
	}

	return days;
}

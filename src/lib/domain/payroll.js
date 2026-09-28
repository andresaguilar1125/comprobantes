/**
 * Payroll rules for a single employer–employee relationship with weekly pay.
 *
 * Business rules (agreed with the employer):
 *   - Base pay is a fixed weekly salary of DEFAULT_WEEKLY_SALARY.
 *   - Each *mandatory* holiday falling on a working day (Monday–Saturday) inside the
 *     selected week adds DEFAULT_HOLIDAY_RATE, one rate per holiday day. Two holidays in
 *     one week therefore add two rates (e.g. Holy Week: Jueves + Viernes Santo).
 *   - A mandatory holiday falling on a Sunday is NOT paid, because she does not work
 *     Sundays and the week's rest day is already covered by the weekly salary.
 *   - Non-mandatory holidays are not present in holidays.json and add nothing.
 *
 * No other concepts exist: no overtime, no vacations, no aguinaldo, no advances.
 *
 * The receipt only ever has one combination — the weekly salary, optionally plus each
 * holiday — so there is nothing for the user to choose. `buildReceiptModel` derives the
 * whole thing from the selected week alone.
 */

import { addDays, isSameDay, monthDayKey, startOfDay } from './dates.js';

/**
 * Expands the raw holidays.json entries into concrete dated holidays for one year.
 * Returns an empty array when the year is not present in the data file.
 */
export function resolveHolidays(holidayData, year) {
	const entry = holidayData.find((item) => item.year === year);
	if (!entry) return [];

	return entry.dates.map((key) => {
		const [month, day] = key.split('-').map(Number);
		return {
			key,
			label: entry.labels?.[key] ?? 'Feriado',
			date: new Date(year, month - 1, day)
		};
	});
}

/**
 * Splits the holidays occurring inside a Sunday→Saturday week into those that are paid
 * (Monday–Saturday) and those skipped because they land on Sunday.
 */
export function holidaysInWeek(weekStart, holidays) {
	const start = startOfDay(weekStart);
	const paid = [];
	const skippedSunday = [];

	for (let offset = 1; offset <= 6; offset += 1) {
		const day = addDays(start, offset);
		const match = holidays.find((holiday) => isSameDay(holiday.date, day));
		if (match) paid.push({ ...match, date: day });
	}

	// The week starts on Sunday, which is the employee's rest day.
	const sunday = start;
	const sundayMatch = holidays.find((holiday) => isSameDay(holiday.date, sunday));
	if (sundayMatch) skippedSunday.push({ ...sundayMatch, date: sunday });

	return { paid, skippedSunday };
}

/**
 * Normalises the user's optional note.
 *
 * It is forced to uppercase — a receipt is a formal document, and it keeps the line
 * visually consistent with the rest of the labels. Only characters that render safely are
 * kept, so nothing a user types can break the canvas drawing.
 */
export function sanitiseNote(value) {
	return String(value ?? '')
		.toUpperCase()
		.replace(/[^A-Z0-9ÁÉÍÓÚÜÑ .,/()#-]/g, '')
		.trim();
}

/**
 * Builds the complete, display-ready model for one receipt.
 *
 * `weekEnd` is the Saturday the week closes on; the range is derived from it.
 *
 * Each concept's `label` is already the finished text for the receipt — the holiday's
 * own name is folded in here, so the drawing code never has to assemble a row title and
 * cannot end up duplicating a prefix.
 *
 * `note` is free text ("EFECTIVO", "SINPE", …) shown as its own row. An empty note
 * yields an empty string and the row is not drawn at all.
 */
export function buildReceiptModel({ settings, weekEnd, weekStart, holidays, note = '' }) {
	const paidHolidays = holidays.paid ?? [];
	const holidayRate = Number(settings.holidayRate) || 0;
	const weeklySalary = Number(settings.weeklySalary) || 0;
	const noteValue = sanitiseNote(note);

	const concepts = [
		{
			key: 'weekly',
			label: 'Salario semanal',
			detail: '',
			amount: weeklySalary,
			checked: true,
			isHoliday: false
		}
	];

	paidHolidays.forEach((holiday, index) => {
		concepts.push({
			key: `holiday-${index}`,
			label: `Feriado - ${holiday.label}`,
			detail: holiday.label,
			amount: holidayRate,
			checked: true,
			isHoliday: true
		});
	});

	const holidayTotal = paidHolidays.length * holidayRate;
	const total = weeklySalary + holidayTotal;

	return {
		weekStart,
		weekEnd,
		concepts,
		paidHolidays,
		skippedSundayHolidays: holidays.skippedSunday ?? [],
		holidayCount: paidHolidays.length,
		holidayTotal,
		weeklySalary,
		note: noteValue,
		total
	};
}

/** Human-readable summary of the holiday dates in a week, for the inline notice. */
export function describeHolidays(paidHolidays) {
	return paidHolidays.map((holiday) => holiday.label).join(' y ');
}

export { monthDayKey };

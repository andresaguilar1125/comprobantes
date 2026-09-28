/**
 * Date helpers.
 *
 * Every function works in LOCAL time and never calls `toISOString()`. Serialising a
 * local-midnight Date with toISOString() would roll it back to the previous day in
 * negative UTC offsets (Costa Rica is UTC-6), shifting every week boundary by a day.
 * Dates are keyed with explicit local y/m/d parts instead.
 */

const MONTHS_ES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre'
];

export { MONTHS_ES };

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Zero-pads a number to two digits. */
export function pad2(n) {
	return String(n).padStart(2, '0');
}

/** Normalises any Date to local midnight. */
export function startOfDay(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

/** Returns a new Date `n` days after `date`, at local midnight. */
export function addDays(date, n) {
	const d = new Date(date);
	d.setDate(d.getDate() + n);
	return startOfDay(d);
}

/** Holiday lookup key, e.g. "04-02". Matches the format used in holidays.json. */
export function monthDayKey(date) {
	return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Stable local key, e.g. "2026-04-04". Safe to use as a Map key or DOM id. */
export function isoKey(date) {
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Short display format used in the UI, e.g. "04/04/2026". */
export function formatShortEs(date) {
	return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Long display format used on the receipt, e.g. "4 de abril de 2026". */
export function formatLongEs(date) {
	return `${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

/** Month name in Spanish, e.g. "abril". */
export function monthNameEs(month) {
	return MONTHS_ES[month];
}

/** Weekday name in Spanish. */
export function weekdayEs(date) {
	return WEEKDAYS_ES[date.getDay()];
}

/** True when both Dates fall on the same local calendar day. */
export function isSameDay(a, b) {
	return isoKey(a) === isoKey(b);
}

/**
 * Every Saturday of `year`, at local midnight.
 *
 * Saturdays are the pay days ("semana que termina el sábado ..."), so they drive the
 * week selector.
 */
export function saturdaysOfYear(year) {
	const out = [];
	const cursor = new Date(year, 0, 1);
	// Day 6 is Saturday. Step forward to the first Saturday on or after Jan 1.
	const offset = (6 - cursor.getDay() + 7) % 7;
	cursor.setDate(cursor.getDate() + offset);

	while (cursor.getFullYear() === year) {
		out.push(startOfDay(cursor));
		cursor.setDate(cursor.getDate() + 7);
	}

	return out;
}

/**
 * The pay week that ends on the given Saturday: Sunday through Saturday (7 days).
 * Note that 7 days is always safe, so no month rollover can break the range.
 */
export function weekRangeFromEndingSaturday(saturday) {
	const end = startOfDay(saturday);
	const start = addDays(end, -6);
	return { start, end };
}

/**
 * The Saturday to preselect: the most recent one that is not in the future.
 * Falls back to the first Saturday when today precedes the whole list.
 */
export function defaultSaturday(saturdays, today = new Date()) {
	const t = startOfDay(today);
	let candidate = null;

	for (const saturday of saturdays) {
		if (saturday.getTime() <= t.getTime()) {
			candidate = saturday;
		}
	}

	return candidate ?? saturdays[0] ?? null;
}

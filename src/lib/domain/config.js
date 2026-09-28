/**
 * Central configuration for the app.
 *
 * To support a new year: add the year to `SUPPORTED_YEARS` and append a matching
 * entry to `src/lib/data/holidays.json`. Nothing else needs to change.
 */
export const SUPPORTED_YEARS = [2026];

/** Fixed weekly base salary, in whole colones. */
export const DEFAULT_WEEKLY_SALARY = 70000;

/** Fixed amount paid per mandatory holiday worked, in whole colones. */
export const DEFAULT_HOLIDAY_RATE = 12000;

/** localStorage key holding the user's settings. Bump the suffix on breaking changes. */
export const SETTINGS_STORAGE_KEY = 'comprobantes.settings.v1';

/**
 * Editable in the Settings screen. These are only defaults; the real values come
 * from localStorage once the user saves them.
 *
 * The signature is not here on purpose: it ships with the app as an asset, so there is
 * nothing for the user to upload.
 */
export const DEFAULT_SETTINGS = {
	employeeName: 'VERONICA DEL CARMEN VEGA FLORES',
	employeeId: '401-010479-0013M',
	officeDescription: 'Cuido Hilda León Quesada (Miriam)',
	weeklySalary: DEFAULT_WEEKLY_SALARY,
	holidayRate: DEFAULT_HOLIDAY_RATE
};

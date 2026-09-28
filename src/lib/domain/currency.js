/**
 * Colombian-style Spanish currency formatting for Costa Rican colones.
 *
 * Formatting is done manually rather than with `toLocaleString` so the output is
 * byte-identical on every machine and in tests, regardless of the ICU data bundled
 * with the local Node/browser build.
 *
 * Conventions: '.' groups thousands, ',' separates decimals → 70.000,00
 */

const UNITS = [
	'cero',
	'uno',
	'dos',
	'tres',
	'cuatro',
	'cinco',
	'seis',
	'siete',
	'ocho',
	'nueve',
	'diez',
	'once',
	'doce',
	'trece',
	'catorce',
	'quince',
	'dieciséis',
	'diecisiete',
	'dieciocho',
	'diecinueve',
	'veinte',
	'veintiuno',
	'veintidós',
	'veintitrés',
	'veinticuatro',
	'veinticinco',
	'veintiséis',
	'veintisiete',
	'veintiocho',
	'veintinueve'
];

const TENS = [
	'',
	'',
	'',
	'treinta',
	'cuarenta',
	'cincuenta',
	'sesenta',
	'setenta',
	'ochenta',
	'noventa'
];

const HUNDREDS = [
	'',
	'ciento',
	'doscientos',
	'trescientos',
	'cuatrocientos',
	'quinientos',
	'seiscientos',
	'setecientos',
	'ochocientos',
	'novecientos'
];

/**
 * Spanish drops the trailing "-uno" before a noun: "veintiún mil", "treinta y un mil".
 * Must be applied to the *multiplier* word only, never to the final remainder.
 */
function apocopate(word) {
	if (word === 'veintiuno') return 'veintiún';
	if (word.endsWith(' uno')) return `${word.slice(0, -4)} un`;
	if (word === 'uno') return 'un';
	return word;
}

/** Spells out 0–999. */
function belowThousand(n) {
	if (n < 30) return UNITS[n];

	if (n < 100) {
		const tens = Math.floor(n / 10);
		const units = n % 10;
		return units === 0 ? TENS[tens] : `${TENS[tens]} y ${UNITS[units]}`;
	}

	if (n === 100) return 'cien';

	const hundreds = Math.floor(n / 100);
	const rest = n % 100;
	return rest === 0 ? HUNDREDS[hundreds] : `${HUNDREDS[hundreds]} ${belowThousand(rest)}`;
}

/**
 * Spells out a non-negative integer in Spanish, lowercase, without "y" between
 * scales. Supports 0 – 999,999,999.
 */
export function integerToWords(value) {
	const n = Math.floor(Math.abs(value));
	if (n === 0) return 'cero';
	if (n < 1000) return belowThousand(n);

	if (n < 1_000_000) {
		const thousands = Math.floor(n / 1000);
		const rest = n % 1000;
		// "mil", never "un mil".
		const head = thousands === 1 ? 'mil' : `${apocopate(belowThousand(thousands))} mil`;
		return rest === 0 ? head : `${head} ${belowThousand(rest)}`;
	}

	const millions = Math.floor(n / 1_000_000);
	const rest = n % 1_000_000;
	const head = millions === 1 ? 'un millón' : `${apocopate(belowThousand(millions))} millones`;
	return rest === 0 ? head : `${head} ${integerToWords(rest)}`;
}

/**
 * Formats an amount for display: 94000 → "94.000,00".
 * `decimals: 0` gives "94.000".
 */
export function formatCRC(amount, { decimals = 2 } = {}) {
	const negative = amount < 0;
	const fixed = Math.abs(amount).toFixed(decimals);
	const [whole, fraction] = fixed.split('.');
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

	if (!decimals) return `${negative ? '-' : ''}${grouped}`;
	return `${negative ? '-' : ''}${grouped},${fraction}`;
}

/**
 * Formats an amount the way the printed receipt shows it: comma thousands, dot
 * decimals, and an explicit currency code — 82000 → "82,000.00 CRC".
 *
 * This is the international financial convention rather than the local display one. It
 * is kept separate from `formatCRC` so the on-screen UI can stay localised while the
 * receipt matches the reference layout.
 */
export function formatAmountForReceipt(amount) {
	const fixed = Math.abs(amount).toFixed(2);
	const [whole, fraction] = fixed.split('.');
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	return `${amount < 0 ? '-' : ''}${grouped}.${fraction} CRC`;
}

/**
 * Spells out an amount in colones, uppercase:
 *   94000 → "NOVENTA Y CUATRO MIL COLONES EXACTOS"
 *   7050.5 → "SIETE MIL CINCUENTA COLONES CON 50/100"
 *
 * Shown under the numeric total, so the receipt carries the amount in words as a
 * cross-check against the figure — customary on payment receipts.
 */
export function amountInWordsCRC(amount) {
	const absolute = Math.abs(amount);
	const whole = Math.floor(absolute);
	const cents = Math.round((absolute - whole) * 100);

	const words = integerToWords(whole);
	const currency = whole === 1 ? 'COLÓN' : 'COLONES';
	const suffix = cents === 0 ? 'EXACTOS' : `CON ${String(cents).padStart(2, '0')}/100`;

	return `${words} ${currency} ${suffix}`.toUpperCase();
}

import { describe, expect, it } from 'vitest';

import {
	amountInWordsCRC,
	formatAmountForReceipt,
	formatCRC,
	integerToWords
} from '../src/lib/domain/currency.js';

describe('formatCRC', () => {
	it('groups thousands with a dot and uses a comma for decimals', () => {
		expect(formatCRC(70000)).toBe('70.000,00');
		expect(formatCRC(94000)).toBe('94.000,00');
		expect(formatCRC(1000000)).toBe('1.000.000,00');
	});

	it('can omit decimals', () => {
		expect(formatCRC(82000, { decimals: 0 })).toBe('82.000');
	});

	it('handles small and zero amounts', () => {
		expect(formatCRC(0)).toBe('0,00');
		expect(formatCRC(500)).toBe('500,00');
	});
});

describe('integerToWords', () => {
	it('spells the units and the irregular hundreds', () => {
		expect(integerToWords(0)).toBe('cero');
		expect(integerToWords(15)).toBe('quince');
		expect(integerToWords(21)).toBe('veintiuno');
		expect(integerToWords(100)).toBe('cien');
		expect(integerToWords(101)).toBe('ciento uno');
		expect(integerToWords(500)).toBe('quinientos');
	});

	it('apocopates the multiplier before "mil"', () => {
		expect(integerToWords(1000)).toBe('mil');
		expect(integerToWords(21000)).toBe('veintiún mil');
		expect(integerToWords(31000)).toBe('treinta y un mil');
	});

	/**
	 * Regression guard: the apocope must only apply to the hundreds/thousands
	 * multiplier, never to a standalone remainder ("mil uno", not "mil un").
	 */
	it('keeps the full form in the remainder', () => {
		expect(integerToWords(1001)).toBe('mil uno');
		expect(integerToWords(21001)).toBe('veintiún mil uno');
	});

	it('spells millions', () => {
		expect(integerToWords(1000000)).toBe('un millón');
		expect(integerToWords(2000000)).toBe('dos millones');
		expect(integerToWords(1000001)).toBe('un millón uno');
	});
});

describe('amountInWordsCRC', () => {
	it('writes whole amounts as "EXACTOS"', () => {
		expect(amountInWordsCRC(70000)).toBe('SETENTA MIL COLONES EXACTOS');
		expect(amountInWordsCRC(82000)).toBe('OCHENTA Y DOS MIL COLONES EXACTOS');
		expect(amountInWordsCRC(94000)).toBe('NOVENTA Y CUATRO MIL COLONES EXACTOS');
		expect(amountInWordsCRC(12000)).toBe('DOCE MIL COLONES EXACTOS');
	});

	it('uses the singular for exactly one colón', () => {
		expect(amountInWordsCRC(1)).toBe('UNO COLÓN EXACTOS');
	});

	it('expresses cents as a fraction', () => {
		expect(amountInWordsCRC(7050.5)).toBe('SIETE MIL CINCUENTA COLONES CON 50/100');
	});
});

describe('formatAmountForReceipt', () => {
	it('uses comma thousands, dot decimals, and the CRC code', () => {
		expect(formatAmountForReceipt(70000)).toBe('70,000.00 CRC');
		expect(formatAmountForReceipt(82000)).toBe('82,000.00 CRC');
		expect(formatAmountForReceipt(94000)).toBe('94,000.00 CRC');
	});

	it('handles zero and amounts under a thousand', () => {
		expect(formatAmountForReceipt(0)).toBe('0.00 CRC');
		expect(formatAmountForReceipt(500)).toBe('500.00 CRC');
	});

	it('does not confuse the two conventions', () => {
		// formatCRC is localised (dots + comma); the receipt uses the international form.
		expect(formatCRC(82000)).toBe('82.000,00');
		expect(formatAmountForReceipt(82000)).toBe('82,000.00 CRC');
	});
});

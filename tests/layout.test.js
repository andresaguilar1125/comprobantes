import { describe, expect, it } from 'vitest';

import {
	BODY,
	CAPTION,
	HEADING_1,
	HEADING_2,
	computeLayout,
	formatStamp
} from '../src/lib/image/drawReceipt.js';

describe('computeLayout', () => {
	it('stays 700 wide', () => {
		expect(computeLayout().width).toBe(700);
	});

	it('is wider than it is tall', () => {
		const layout = computeLayout();
		expect(layout.width).toBeGreaterThan(layout.height);
	});

	it('keeps the height under budget for every real week', () => {
		// No holidays, one holiday, and Holy Week (two).
		for (const holidayCount of [0, 1, 2]) {
			expect(computeLayout({ holidayCount }).height, `${holidayCount} holidays`).toBeLessThanOrEqual(
				640
			);
		}
	});

	it('grows by exactly one row per extra holiday', () => {
		const none = computeLayout({ holidayCount: 0 });
		const one = computeLayout({ holidayCount: 1 });
		const two = computeLayout({ holidayCount: 2 });

		expect(one.height - none.height).toBe(none.rowStep);
		expect(two.height - one.height).toBe(one.rowStep);
	});

	it('orders every band top to bottom', () => {
		const layout = computeLayout({ holidayCount: 2 });

		const ordered = [
			layout.titleY,
			layout.stampY,
			layout.headerRuleY,
			layout.weekY,
			layout.officeY,
			layout.rowsTop,
			layout.holidaysTop,
			layout.totalRuleY,
			layout.totalY,
			layout.signatureTop,
			layout.signatureRuleY,
			layout.signatureCaptionY,
			layout.footerY
		];

		for (let i = 1; i < ordered.length; i += 1) {
			expect(ordered[i], `band ${i} must sit below band ${i - 1}`).toBeGreaterThan(
				ordered[i - 1]
			);
		}

		expect(layout.height).toBeGreaterThan(layout.footerY);
	});

	it('leaves room for the signature above its rule', () => {
		const layout = computeLayout({ holidayCount: 2 });
		const signatureBottom = layout.signatureTop + layout.signatureBoxHeight;

		expect(signatureBottom).toBeLessThan(layout.signatureRuleY);
	});
});

describe('typography', () => {
	it('uses two heading sizes above one body size', () => {
		expect(HEADING_1).toBeGreaterThan(HEADING_2);
		expect(HEADING_2).toBeGreaterThan(BODY);
		expect(BODY).toBeGreaterThan(CAPTION);
	});
});

describe('formatStamp', () => {
	it('renders date and time on one line, 12-hour with AM/PM', () => {
		expect(formatStamp(new Date(2026, 8, 28, 15, 1))).toBe('28/09/2026 03:01 PM');
		expect(formatStamp(new Date(2026, 8, 28, 9, 5))).toBe('28/09/2026 09:05 AM');
	});

	it('shows noon and midnight as 12', () => {
		expect(formatStamp(new Date(2026, 8, 28, 12, 0))).toBe('28/09/2026 12:00 PM');
		expect(formatStamp(new Date(2026, 8, 28, 0, 30))).toBe('28/09/2026 12:30 AM');
	});
});

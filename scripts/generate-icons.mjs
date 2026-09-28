/**
 * Generates the PWA icon set as PNG files, with no image dependencies.
 *
 * These are deliberately simple placeholder icons so the app is installable out of the
 * box. Replace the files in `static/` with real artwork when branding matters; keep the
 * same names and sizes so `vite.config.js` and `app.html` continue to resolve.
 *
 * Run with: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');

const TEAL = [15, 118, 110];
const WHITE = [255, 255, 255];

/** CRC32, as required by the PNG chunk format. */
const CRC_TABLE = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n += 1) {
		let c = n;
		for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	return table;
})();

function crc32(buffer) {
	let c = -1;
	for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ -1) >>> 0;
}

function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);

	const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(typeAndData));

	return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes RGBA pixel data as a PNG buffer. */
function encodePng(width, height, pixels) {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8; // bit depth
	header[9] = 6; // colour type: RGBA
	header[10] = 0; // deflate
	header[11] = 0; // adaptive filtering
	header[12] = 0; // no interlace

	// Each scanline is prefixed with a filter byte (0 = none).
	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0;
		pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}

	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

/**
 * Draws the icon: a rounded square background with a "receipt" card and three lines.
 * `inset` shrinks the artwork for maskable icons, keeping it inside the safe zone.
 */
function drawIcon(size, { inset = 0 } = {}) {
	const pixels = Buffer.alloc(size * size * 4);
	const pad = Math.round(size * inset);
	const radius = size * 0.22 * (1 - inset * 1.6);

	const cardX0 = Math.round(size * 0.28);
	const cardX1 = Math.round(size * 0.72) - 1;
	const cardY0 = Math.round(size * 0.22);
	const cardY1 = Math.round(size * 0.78) - 1;
	const lineHeight = Math.max(2, Math.round(size * 0.035));
	const lineWidth = Math.max(0.6, size * 0.22);

	function put(x, y, [r, g, b]) {
		const offset = (y * size + x) * 4;
		pixels[offset] = r;
		pixels[offset + 1] = g;
		pixels[offset + 2] = b;
		pixels[offset + 3] = 255;
	}

	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			// Rounded-square background with a small inset for maskable variants.
			const inX = x >= pad && x < size - pad;
			const inY = y >= pad && y < size - pad;
			let inBackground = inX && inY;

			if (inBackground && radius > 0) {
				// Cut the corners outside the rounded rect.
				const cx = Math.min(Math.max(x, pad + radius), size - pad - radius);
				const cy = Math.min(Math.max(y, pad + radius), size - pad - radius);
				const dx = x - cx;
				const dy = y - cy;
				if (dx * dx + dy * dy > radius * radius) inBackground = false;
			}

			if (!inBackground) {
				put(x, y, WHITE);
				continue;
			}

			// White receipt card.
			const inCard = x >= cardX0 && x <= cardX1 && y >= cardY0 && y <= cardY1;
			if (!inCard) {
				put(x, y, TEAL);
				continue;
			}

			// Three teal lines on the card.
			const lineTops = [0.32, 0.45, 0.58].map((f) => Math.round(size * f));
			const onLine = lineTops.some(
				(top) => y >= top && y < top + lineHeight && x < cardX0 + lineWidth
			);

			put(x, y, onLine ? TEAL : WHITE);
		}
	}

	return encodePng(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
	{ file: 'favicon.png', size: 64, inset: 0 },
	{ file: 'icon-192.png', size: 192, inset: 0 },
	{ file: 'icon-512.png', size: 512, inset: 0 },
	// Maskable icons must keep their artwork in the central safe zone.
	{ file: 'icon-maskable-512.png', size: 512, inset: 0.12 }
];

for (const { file, size, inset } of targets) {
	const png = drawIcon(size, { inset });
	writeFileSync(join(OUT_DIR, file), png);
	console.log(`wrote static/${file} (${size}x${size}, ${png.length} bytes)`);
}

console.log(`\nReplace these placeholders with real artwork when needed: ${OUT_DIR}`);

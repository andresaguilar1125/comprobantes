/**
 * Serves the production build under a sub-path, to verify the GitHub Pages layout.
 *
 * GitHub Pages hosts this project at https://<user>.github.io/<repo>/, so the app must
 * work when mounted at a prefix rather than at the domain root.
 *
 * Usage: node scripts/serve-subpath.mjs [prefix] [port]
 */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const PREFIX = process.argv[2] ?? '/comprobantes';
const PORT = Number(process.argv[3] ?? 4180);
const ROOT = new URL('../build/', import.meta.url).pathname;

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml'
};

/** Resolves a request path to a file in `build`, mirroring SvelteKit's static output. */
function resolveFile(urlPath) {
	let rel = decodeURIComponent(urlPath);
	if (rel.startsWith(PREFIX)) rel = rel.slice(PREFIX.length);
	if (rel === '' || rel === '/') rel = '/index.html';

	const candidates = [];
	if (rel.endsWith('/')) {
		candidates.push(join(ROOT, rel, 'index.html'));
	} else if (extname(rel)) {
		candidates.push(join(ROOT, rel));
	} else {
		candidates.push(join(ROOT, `${rel}/index.html`), join(ROOT, rel), join(ROOT, `${rel}.html`));
	}
	// SPA fallback: unknown routes are served the fallback shell, like GitHub Pages.
	candidates.push(join(ROOT, '404.html'));

	for (const candidate of candidates) {
		const safe = normalize(candidate);
		if (safe.startsWith(ROOT) && existsSync(safe) && statSync(safe).isFile()) return safe;
	}
	return null;
}

createServer((req, res) => {
	const url = new URL(req.url, 'http://localhost');
	const file = resolveFile(url.pathname);

	if (!file) {
		res.writeHead(404, { 'content-type': 'text/plain' });
		res.end('not found');
		return;
	}

	res.writeHead(200, {
		'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
		// The service worker must be allowed to control the whole prefix.
		'service-worker-allowed': PREFIX + '/'
	});
	createReadStream(file).pipe(res);
}).listen(PORT, () => {
	console.log(`Serving build at http://localhost:${PORT}${PREFIX}/`);
});

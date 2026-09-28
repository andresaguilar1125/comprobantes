import adapter from '@sveltejs/adapter-static';

/**
 * GitHub Pages serves this site from https://<user>.github.io/<repo>/, so `paths.base`
 * must equal the repository name at build time. Locally (`vite dev`) it stays empty.
 * The CI workflow sets BASE_PATH=/${{ github.event.repository.name }}.
 */
const base = process.argv.includes('dev') ? '' : (process.env.BASE_PATH ?? '');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// `fallback` turns the build into a SPA shell. On GitHub Pages this must be
		// 404.html (GitHub serves it for unknown paths). Using `index.html` would
		// collide with the prerendered homepage.
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base
		}
	}
};

export default config;

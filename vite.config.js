import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Must match `kit.paths.base` in svelte.config.js. Locally it is empty; the CI workflow
 * sets BASE_PATH=/${{ github.event.repository.name }}.
 */
const base = process.argv.includes('dev') ? '' : (process.env.BASE_PATH ?? '');

/**
 * Opt-in self-signed HTTPS for the dev server.
 *
 * Needed to test sharing on a phone. `navigator.share()` only exists in a *secure
 * context*, so over plain `http://<lan-ip>:5173` the Share button silently degrades to a
 * download and WhatsApp never appears in the sheet. `npm run dev:secure` enables this.
 *
 * Vite cannot do this on its own in v8: `server.https` is typed as Node's
 * `https.ServerOptions` and the resolver only ever reads cert/key/ca/pfx files, so a
 * bare `https: true` produces an empty options object. The plugin supplies a cert.
 */
const httpsDev = process.env.HTTPS_DEV === 'true';

/**
 * Builds the precache manifest URLs for a static SvelteKit build mounted at `base`.
 *
 * This replaces the plugin's built-in transform, which is only correct when the app is
 * served from the domain root. Workbox globs walk `.svelte-kit/output`, so every entry
 * arrives prefixed with `client/` or `prerendered/pages/`. Those prefixes are stripped,
 * and each prerendered page is then emitted as an absolute URL under `base`, with the
 * trailing slash GitHub Pages serves it at.
 *
 * Without this, on a repository sub-path the manifest holds `settings` and
 * `/comprobantes`, while the browser requests `/comprobantes/settings/` and
 * `/comprobantes/`. Every offline navigation would miss the precache and fail, even
 * though the same pages load fine while online.
 */
function precacheManifestTransform(prefix, webManifestName) {
	const root = prefix ? `${prefix}/` : '/';

	return (entries) => ({
		manifest: entries
			.map((entry) => {
				let url = entry.url;

				// Prerendered pages become absolute URLs under `base`.
				if (url.startsWith('prerendered/pages/')) {
					const page = url.slice('prerendered/pages/'.length).replace(/index\.html$/, '');
					return { ...entry, url: `${root}${page}` };
				}

				// Everything else (static assets, the app bundle) is already relative.
				if (url.startsWith('client/')) url = url.slice('client/'.length);
				return { ...entry, url };
			})
			// The web app manifest is fetched directly, never from the precache.
			.filter((entry) => entry.url !== webManifestName)
	});
}

export default defineConfig({
	plugins: [
		sveltekit(),		// Only in dev: a self-signed cert has no place in a production build.
		...(httpsDev ? [basicSsl()] : []),		SvelteKitPWA({
			registerType: 'autoUpdate',
			/*
			 * Every route in this app is prerendered, so each page shell is precached under its
			 * own URL and offline navigation works from the precache alone. The navigation
			 * fallback is therefore disabled: otherwise every navigation would be bound to a
			 * single shell, which for a prerendered SPA is unnecessary and hides the real URLs.
			 */
			workbox: {
				navigateFallback: null,
				globPatterns: [
					'client/**/*.{js,css,ico,png,svg,webp,webmanifest,woff,woff2}',
					'prerendered/**/*.html'
				],
				manifestTransforms: [precacheManifestTransform(base, 'manifest.webmanifest')]
			},
			manifest: {
				name: 'Comprobante de Pago',
				short_name: 'Comprobantes',
				description: 'Genera comprobantes de pago semanales en PDF.',
				lang: 'es',
				start_url: '.',
				scope: '.',
				display: 'standalone',
				background_color: '#f1f5f9',
				theme_color: '#0f766e',
				icons: [
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: 'icon-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]

			}
		})
	],
	server: {
		// Serve on the LAN so a phone can reach the dev server, not just localhost.
		host: true,
		/*
		 * Vite already trusts bare IP addresses, so plain LAN access needs nothing here.
		 * A tunnel arrives as a hostname instead and would otherwise be rejected with a
		 * 403, so those domains are listed explicitly. A leading dot matches any subdomain,
		 * which covers the random URLs cloudflared and localtunnel hand out.
		 */
		allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', '.loca.lt']
	}
});

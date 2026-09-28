<script>
	import '../app.css';
	import { base } from '$app/paths';
	import { browser, dev } from '$app/environment';
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores/settings.svelte.js';
	import es from '$lib/i18n/es.json';

	let { children } = $props();

	/**
	 * The web app manifest and the service worker are produced by the PWA plugin at build
	 * time — neither exists while running `vite dev`. Linking the manifest unconditionally
	 * makes the dev server answer `GET /manifest.webmanifest` with a 404 on every page
	 * load, which is what the `[404] GET /manifest.webmanifest` warning is about.
	 * Both are therefore wired up only in a production build.
	 *
	 * To exercise the PWA locally, build first and use the preview server:
	 *   npm run build && npm run preview
	 */
	const manifestUrl = dev ? null : `${base}/manifest.webmanifest`;

	// Hydration-safe: reads localStorage only once the component is running in a browser.
	$effect(() => {
		settings.load();
	});

	/**
	 * Registers the service worker so the app keeps working offline.
	 *
	 * The generated worker lives at `<base>/sw.js`. The scope is pinned to the app's
	 * base path because GitHub Pages serves this from a repository sub-path, and a
	 * worker may not claim a scope above its own location.
	 */
	onMount(async () => {
		if (dev || !browser || !('serviceWorker' in navigator)) return;

		try {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true, base });
		} catch (error) {
			// Offline support is a progressive enhancement; never block the app on it.
			console.warn('No se pudo registrar el service worker:', error);
		}
	});
</script>

<svelte:head>
	<title>{es.app.title}</title>
	<meta name="description" content={es.app.subtitle} />
	{#if manifestUrl}
		<link rel="manifest" href={manifestUrl} />
	{/if}
	<link rel="icon" href={`${base}/favicon.png`} />
	<link rel="apple-touch-icon" href={`${base}/icon-192.png`} />
	<meta name="theme-color" content="#0f766e" />
</svelte:head>

<div class="page">
	{#if settings.writeError}
		<div class="notice notice--error" role="alert">
			<span>No se pudo guardar la configuración en este dispositivo.</span>
		</div>
	{/if}

	{@render children()}

	<footer style="margin-top:32px;text-align:center;color:var(--muted);font-size:0.8rem">
		<a href="{base}/" style="color:inherit">{es.app.title}</a>
		·
		<a href="{base}/settings/" style="color:inherit">{es.settings.title}</a>
	</footer>
</div>

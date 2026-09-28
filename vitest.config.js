import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The domain logic under `src/lib/domain` is plain JavaScript with no SvelteKit
 * runtime dependencies, so tests run in a bare Node environment. Keeping this
 * config separate from `vite.config.js` avoids booting the sveltekit() plugin.
 *
 * `$lib` is resolved by SvelteKit, which this config deliberately does not load, so the
 * alias is declared here to keep unit tests able to import the same modules the app does.
 */
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		include: ['tests/**/*.test.js'],
		environment: 'node'
	}
});

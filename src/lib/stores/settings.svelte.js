import { browser } from '$app/environment';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '$lib/domain/config.js';

/** Keeps only known keys, and coerces the numeric fields back to numbers. */
function normalise(raw) {
	const merged = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };

	return {
		employeeName: String(merged.employeeName ?? ''),
		employeeId: String(merged.employeeId ?? ''),
		officeDescription: String(merged.officeDescription ?? ''),
		weeklySalary: Number(merged.weeklySalary) || 0,
		holidayRate: Number(merged.holidayRate) || 0
	};
}

/**
 * Reactive settings backed by localStorage.
 *
 * The store is a module-level singleton so every route sees the same values. Reads are
 * guarded by `browser` because this app is prerendered: during the server pass
 * `localStorage` does not exist and the defaults are used instead.
 */
class SettingsStore {
	/** @type {ReturnType<typeof normalise>} */
	current = $state({ ...DEFAULT_SETTINGS });

	/** True once localStorage has been read, so the UI can avoid a flash of defaults. */
	loaded = $state(false);

	/** Last write error, e.g. when the browser refuses to persist. */
	writeError = $state('');

	#initialised = false;

	/** Reads persisted settings. Safe to call repeatedly. */
	load() {
		if (!browser || this.#initialised) return;
		this.#initialised = true;

		try {
			const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
			if (stored) this.current = normalise(JSON.parse(stored));
		} catch {
			// Corrupt or unreadable JSON: fall back to the defaults rather than crashing.
			this.current = { ...DEFAULT_SETTINGS };
		}

		this.loaded = true;
	}

	/** Merges a partial update, persists it, and returns the saved values. */
	save(patch) {
		this.current = normalise({ ...this.current, ...patch });
		this.#persist();
		return this.current;
	}

	/** Restores the shipped defaults. */
	reset() {
		this.current = { ...DEFAULT_SETTINGS };
		this.#persist();
		return this.current;
	}

	#persist() {
		if (!browser) return;

		try {
			window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.current));
			this.writeError = '';
		} catch (error) {
			this.writeError =
				error instanceof Error ? error.message : 'No se pudo guardar la configuración.';
		}
	}
}

export const settings = new SettingsStore();

/**
 * True when the values required to print a receipt are present. The signature is bundled
 * with the app, so it is never missing and is not part of this check.
 */
export function isReadyForReceipt(values) {
	return Boolean(values.employeeName?.trim() && values.employeeId?.trim());
}

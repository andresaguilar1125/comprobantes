<script>
	import { base } from '$app/paths';
	import { DEFAULT_SETTINGS } from '$lib/domain/config.js';
	import { settings } from '$lib/stores/settings.svelte.js';
	import es from '$lib/i18n/es.json';

	/**
	 * The form edits a local draft and only writes to the store on save, so a stray
	 * keystroke cannot corrupt stored settings.
	 */
	let draft = $state({ ...DEFAULT_SETTINGS });
	let status = $state('');
	let error = $state('');

	// Seed the draft from the store once it has read localStorage.
	$effect(() => {
		if (!settings.loaded) return;
		draft = { ...settings.current };
	});

	function save() {
		error = '';
		settings.save({
			employeeName: draft.employeeName.trim(),
			employeeId: draft.employeeId.trim(),
			officeDescription: draft.officeDescription.trim(),
			weeklySalary: Number(draft.weeklySalary) || 0,
			holidayRate: Number(draft.holidayRate) || 0
		});

		if (settings.writeError) {
			error = 'No se pudo guardar la configuración en este dispositivo.';
			return;
		}

		status = es.settings.saved;
	}

	function restore() {
		draft = settings.reset();
		error = '';
		status = es.settings.restored;
	}
</script>

<header class="topbar">
	<div>
		<h1 class="topbar__title">{es.settings.title}</h1>
		<p class="topbar__subtitle">{es.settings.localOnly}</p>
	</div>
	<a class="btn btn--secondary" href="{base}/">{es.settings.back}</a>
</header>

{#if status}
	<div class="notice notice--info" role="status">{status}</div>
{/if}
{#if error}
	<div class="notice notice--error" role="alert">{error}</div>
{/if}

<section class="card">
	<h2 class="card__title">{es.settings.employeeSection}</h2>
	<p class="card__hint">Estos datos aparecen impresos en el comprobante.</p>

	<div class="field">
		<label class="field__label" for="name">{es.settings.name}</label>
		<input id="name" type="text" bind:value={draft.employeeName} autocomplete="name" />
	</div>

	<div class="field">
		<label class="field__label" for="id">{es.settings.id}</label>
		<input id="id" type="text" bind:value={draft.employeeId} />
	</div>

	<div class="field">
		<label class="field__label" for="office">{es.settings.office}</label>
		<input id="office" type="text" bind:value={draft.officeDescription} />
	</div>
</section>

<section class="card">
	<h2 class="card__title">{es.settings.paySection}</h2>
	<p class="card__hint">Montos en colones, sin decimales ni símbolo.</p>

	<div class="grid-2">
		<div class="field">
			<label class="field__label" for="weekly">{es.settings.weeklySalary}</label>
			<input id="weekly" type="number" min="0" step="1000" bind:value={draft.weeklySalary} />
		</div>

		<div class="field">
			<label class="field__label" for="rate">{es.settings.holidayRate}</label>
			<input id="rate" type="number" min="0" step="500" bind:value={draft.holidayRate} />
		</div>
	</div>
</section>

<section class="card">
	<h2 class="card__title">{es.settings.signatureSection}</h2>
	<p class="card__hint">{es.settings.signatureBundled}</p>
</section>

<div class="row" style="margin-top:20px">
	<button class="btn btn--primary" style="width:auto;min-width:200px" type="button" onclick={save}>
		{es.settings.save}
	</button>
	<button class="btn btn--secondary" type="button" onclick={restore}>
		{es.settings.restore}
	</button>
</div>

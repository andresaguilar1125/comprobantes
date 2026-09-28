<script>
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { SUPPORTED_YEARS } from '$lib/domain/config.js';
	import {
		defaultSaturday,
		formatLongEs,
		formatShortEs,
		isoKey,
		saturdaysOfYear,
		weekRangeFromEndingSaturday
	} from '$lib/domain/dates.js';
	import { buildReceiptModel, holidaysInWeek, resolveHolidays, sanitiseNote } from '$lib/domain/payroll.js';
	import { isReadyForReceipt, settings } from '$lib/stores/settings.svelte.js';
	import { renderReceiptImage } from '$lib/image/receiptImage.js';
	import { shareReceipt, supportsFileSharing } from '$lib/image/share.js';
	import WeekCalendar from '$lib/components/WeekCalendar.svelte';
	import holidaysData from '$lib/data/holidays.json';
	import es from '$lib/i18n/es.json';

	// Only 2026 is wired up. See src/lib/data/README.md to add another year.
	const YEAR = SUPPORTED_YEARS[0];
	const SATURDAYS = saturdaysOfYear(YEAR);
	const SATURDAY_KEYS = SATURDAYS.map(isoKey);
	const HOLIDAYS = resolveHolidays(holidaysData, YEAR);

	/** Holiday days, so the calendar can ring the dates in red. */
	const HOLIDAY_KEYS = HOLIDAYS.map((holiday) => isoKey(holiday.date));

	/** Local midnight, so "past" compares whole days rather than the current time. */
	const TODAY = new Date();
	TODAY.setHours(0, 0, 0, 0);

	/** "2026-04-04" → the Saturday Date it refers to. */
	function saturdayFromKey(key) {
		const [y, m, d] = key.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	let selectedKey = $state('');

	/** Optional free-text note shown on the receipt, e.g. "EFECTIVO" or "SINPE". */
	let note = $state('');

	let rendering = $state(false);
	let renderError = $state('');
	let previewBlob = $state(null);
	let previewUrl = $state('');
	let previewFilename = $state('');
	let actionMessage = $state('');

	// Preselect the most recent pay day on first render, once the browser is available.
	$effect(() => {
		if (!browser || selectedKey) return;
		const initial = defaultSaturday(SATURDAYS);
		if (initial) selectedKey = isoKey(initial);
	});

	let weekEnd = $derived(selectedKey ? saturdayFromKey(selectedKey) : SATURDAYS[0]);
	let weekRange = $derived(weekRangeFromEndingSaturday(weekEnd));
	let weekHolidays = $derived(holidaysInWeek(weekRange.start, HOLIDAYS));

	/** Clear the stale confirmation and the note as soon as the week changes. */
	$effect(() => {
		// Touch weekEnd so this re-runs on week change only.
		weekEnd;
		actionMessage = '';
		// The note describes one specific payment, so it must not carry over to the
		// next week by accident.
		note = '';
	});

	let currentSettings = $derived(settings.current);

	/**
	 * The whole receipt is derived from the week: the salary always applies, and each
	 * holiday in the week adds its own line. There is nothing to choose.
	 */
	let model = $derived(
		buildReceiptModel({
			settings: currentSettings,
			weekEnd,
			weekStart: weekRange.start,
			holidays: weekHolidays,
			note
		})
	);

	/**
	 * Renders whenever the week or the settings change — never inside the click handler.
	 * `navigator.share()` needs the tap's transient activation, and awaiting image
	 * generation before it can consume that activation and get the share rejected.
	 */
	$effect(() => {
		const data = { model, settings: currentSettings };
		if (!browser) return;

		let cancelled = false;
		let createdUrl = '';

		rendering = true;
		renderError = '';

		renderReceiptImage(data)
			.then(({ blob, filename }) => {
				if (cancelled) return;
				previewBlob = blob;
				previewFilename = filename;
				createdUrl = URL.createObjectURL(blob);
				previewUrl = createdUrl;
			})
			.catch((error) => {
				console.error('No se pudo generar la imagen del comprobante:', error);
				if (!cancelled) renderError = es.blocked.renderFailed;
			})
			.finally(() => {
				if (!cancelled) rendering = false;
			});

		return () => {
			cancelled = true;
			if (createdUrl) URL.revokeObjectURL(createdUrl);
		};
	});

	let ready = $derived(isReadyForReceipt(currentSettings));

	let canShare = $derived(
		Boolean(previewBlob) && browser && supportsFileSharing(previewBlob, previewFilename)
	);

	let blockedMessage = $derived(
		currentSettings.employeeName?.trim() && currentSettings.employeeId?.trim()
			? ''
			: es.blocked.missingEmployee
	);

	async function onShare() {
		if (!ready || !previewBlob) return;

		actionMessage = '';
		const outcome = await shareReceipt({
			blob: previewBlob,
			filename: previewFilename,
			title: 'Comprobante de pago',
			text: `Comprobante de pago del ${formatShortEs(model.weekEnd)}`
		});

		if (outcome === 'downloaded') actionMessage = es.actions.downloadedFallback;
	}
</script>

<header class="topbar">
	<div>
		<h1 class="topbar__title">{es.app.title}</h1>
		<p class="topbar__subtitle">{es.app.subtitle}</p>
	</div>
	<a
		class="btn-icon"
		href="{base}/settings/"
		title={es.app.settingsLink}
		aria-label={es.app.settingsLink}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3" />
			<path
				d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
			/>
		</svg>
	</a>
</header>

<div class="layout">
	<section>
		<div class="card">
			<h2 class="card__title">Datos del pago</h2>
			<p class="card__hint">{es.form.weekHelp}</p>

			<div class="field">
				<span class="field__label">{es.form.weekLabel}</span>
				<WeekCalendar
					saturdayKeys={SATURDAY_KEYS}
					holidayKeys={HOLIDAY_KEYS}
					value={selectedKey}
					today={TODAY}
					onSelect={(key) => (selectedKey = key)}
				/>
				<p class="field__hint">
					Del {formatShortEs(model.weekStart)} al {formatShortEs(model.weekEnd)}
				</p>
			</div>

			<div class="field">
				<label class="field__label" for="note">{es.form.noteLabel}</label>
				<input
					id="note"
					type="text"
					maxlength="60"
					placeholder={es.form.notePlaceholder}
					value={note}
					oninput={(event) => (note = sanitiseNote(event.currentTarget.value))}
				/>
				<p class="field__hint">{es.form.noteHelp}</p>
			</div>
		</div>

		<div class="card">
			{#if renderError}
				<div class="notice notice--error" role="alert">{renderError}</div>
			{/if}

			{#if actionMessage}
				<div class="notice notice--info" role="status">{actionMessage}</div>
			{/if}

			{#if !ready}
				<div class="notice notice--warn" role="status">
					<span>{blockedMessage}</span>
				</div>
			{/if}

			<button
				class="btn btn--primary"
				onclick={onShare}
				disabled={!ready || rendering || !previewBlob}
			>
				{#if rendering}
					<span class="spinner" aria-hidden="true"></span>
					{es.actions.generating}
				{:else}
					{canShare ? es.actions.share : es.actions.download}
				{/if}
			</button>

			{#if !ready}
				<p style="margin:12px 0 0;text-align:center">
					<a class="btn btn--ghost" href="{base}/settings/">{es.actions.goToSettings}</a>
				</p>
			{/if}
		</div>
	</section>

	<aside class="preview">
		{#if model.paidHolidays.length > 0}
			<div class="notice notice--info" role="status">
				<div>
					{#if model.paidHolidays.length === 1}
						{es.holiday.noticeSingular}
					{:else}
						{es.holiday.noticePlural.replace('{count}', String(model.paidHolidays.length))}
					{/if}
					<ul class="notice__list">
						{#each model.paidHolidays as holiday (holiday.key)}
							<li>{holiday.label}</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}

		<div class="card">
			<h2 class="card__title">{es.form.previewTitle}</h2>
			<p class="card__hint">{es.form.previewHint}</p>
			<div class="preview__frame">
				{#if previewUrl}
					<img src={previewUrl} alt={es.form.previewTitle} style="display:block;width:100%" />
				{:else}
					<p style="padding:24px;color:var(--muted);margin:0">{es.form.previewLoading}</p>
				{/if}
			</div>
		</div>
	</aside>
</div>

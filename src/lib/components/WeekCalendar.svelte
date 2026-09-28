<script>
	/**
	 * Month calendar for choosing the pay week.
	 *
	 * Only Saturdays are selectable, because a week is paid on the Saturday that ends it.
	 * Earlier Saturdays are greyed out (already paid), the selected one is solid blue, and
	 * later Saturdays are a lighter blue. Mandatory holidays are marked with a red ring,
	 * so the weeks that carry extra pay are obvious before opening one.
	 */
	import { monthGrid, monthTitle, WEEKDAY_HEADERS } from '$lib/domain/calendar.js';
	import { formatShortEs, isoKey } from '$lib/domain/dates.js';
	import es from '$lib/i18n/es.json';

	let { saturdayKeys = [], holidayKeys = [], value = '', today, onSelect } = $props();

	/** "2026-04-04" → a local Date. */
	function parseKey(key) {
		const [y, m, d] = key.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	// The month on screen follows the selection, but can be paged away from it.
	let view = $state(null);
	let lastValue = $state(null);

	$effect(() => {
		if (value === lastValue) return;
		lastValue = value;
		if (!value) return;
		const day = parseKey(value);
		view = { year: day.getFullYear(), month: day.getMonth() };
	});

	/** Range of months that contain a pay day, as year * 12 + month. */
	let bounds = $derived.by(() => {
		if (!saturdayKeys.length) return null;
		const first = parseKey(saturdayKeys[0]);
		const last = parseKey(saturdayKeys[saturdayKeys.length - 1]);
		return {
			min: first.getFullYear() * 12 + first.getMonth(),
			max: last.getFullYear() * 12 + last.getMonth()
		};
	});

	let viewIndex = $derived(view ? view.year * 12 + view.month : 0);
	let canPrev = $derived(bounds ? viewIndex > bounds.min : false);
	let canNext = $derived(bounds ? viewIndex < bounds.max : false);
	let grid = $derived(view ? monthGrid(view.year, view.month) : []);

	/** Holiday keys as a Set, so the lookup below stays O(1) per cell. */
	let holidaySet = $derived(new Set(holidayKeys));

	function shift(delta) {
		const next = viewIndex + delta;
		view = { year: Math.floor(next / 12), month: next % 12 };
	}

	function isPast(date) {
		return today ? date.getTime() < today.getTime() : false;
	}
</script>

<div class="cal">
	<div class="cal__nav">
		<button
			class="btn-icon"
			type="button"
			onclick={() => shift(-1)}
			disabled={!canPrev}
			aria-label={es.form.prevMonth}>‹</button
		>
		<span class="cal__title">{view ? monthTitle(view.year, view.month) : ''}</span>
		<button
			class="btn-icon"
			type="button"
			onclick={() => shift(1)}
			disabled={!canNext}
			aria-label={es.form.nextMonth}>›</button
		>
	</div>

	<div class="cal__weekdays">
		{#each WEEKDAY_HEADERS as name (name)}
			<span>{name}</span>
		{/each}
	</div>

	<div class="cal__grid">
		{#each grid as day (day.key)}
			{#if day.isSaturday && saturdayKeys.includes(day.key)}
				<button
					type="button"
					class="cal__day cal__day--pay"
					class:cal__day--outside={!day.inMonth}
					class:cal__day--past={isPast(day.date)}
					class:cal__day--selected={day.key === value}
					class:cal__day--next={!isPast(day.date) && day.key !== value}
					class:cal__day--holiday={holidaySet.has(day.key)}
					aria-pressed={day.key === value}
					aria-label={`${es.form.weekLabel} sáb ${formatShortEs(day.date)}${
						holidaySet.has(day.key) ? `, ${es.form.holidayMark}` : ''
					}`}
					onclick={() => onSelect?.(day.key)}
				>
					{day.date.getDate()}
				</button>
			{:else}
				<span
					class="cal__day"
					class:cal__day--outside={!day.inMonth}
					class:cal__day--past={isPast(day.date)}
					class:cal__day--holiday={holidaySet.has(day.key)}
					title={holidaySet.has(day.key) ? es.form.holidayMark : undefined}
				>
					{day.date.getDate()}
				</span>
			{/if}
		{/each}
	</div>
</div>

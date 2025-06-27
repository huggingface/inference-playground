<script lang="ts">
	import { page } from "$app/state";
	import fuzzysearch from "$lib/utils/search.js";
	import { Popover, SpatialMenu } from "melt/builders";
	import { watch } from "runed";
	import { settings } from "../(state)/settings.svelte.js";
	import type { ApiModelsResponse } from "../../api/models/+server.js";

	const popover = new Popover({
		floatingConfig: {
			computePosition: { placement: "bottom-start" },
		},
		onOpenChange: open => {
			if (open) return;
			document.getElementById(popover.trigger.id)?.focus();
		},
	});
	const menu = new SpatialMenu<ApiModelsResponse["models"][number]>({
		onSelect: model => {
			settings.model = model;
			popover.open = false;
		},
	});

	const data = $derived(page.data as ApiModelsResponse);

	let search = $state("");
	const filteredModels = $derived(
		data.models.filter(m => m.pipeline_tag === settings.filterTag).toSorted((a, b) => a.id.localeCompare(b.id))
	);

	const searchedModels = $derived(
		fuzzysearch({
			needle: search,
			haystack: filteredModels,
			property: "id",
		})
	);

	const groupedByCompany = $derived.by(() => {
		const grouped = new Map<string, ApiModelsResponse["models"]>();
		searchedModels.forEach(model => {
			const company = model.id.split("/")[0] ?? "Other";
			if (!grouped.has(company)) grouped.set(company, []);
			grouped.get(company)!.push(model);
		});
		return grouped;
	});

	function formatCompanyName(name: string) {
		// Replace _- with spaces, capitalize all words
		return name
			.replace(/_/g, " ")
			.replace(/-/g, " ")
			.split(" ")
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	function getModelName(model: ApiModelsResponse["models"][number]) {
		return model.id.split("/").pop()!;
	}
</script>

<button
	class=" focus-within:custom-outline flex w-full items-center justify-between gap-0.5 rounded-lg border border-stone-300 bg-white py-2 pr-3 text-stone-900 transition-colors dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
	{...popover.trigger}
>
	{settings.model?.id ?? "Select a model"}
</button>

<div
	class={[popover.open && "grid", "max-h-128 grid-cols-3 gap-4 overflow-y-auto border p-2"]}
	{...popover.content}
	{...menu.root}
>
	<input type="text" class="w-full" bind:value={search} placeholder="Search models..." autofocus />
	{#each groupedByCompany as [company, models]}
		<p class="col-span-3 text-sm font-medium text-stone-700 dark:text-stone-300">
			{formatCompanyName(company)}
		</p>
		{#each models as model}
			{@const item = menu.getItem(model)}
			<div
				class={[
					"flex h-64 w-64 scroll-mt-12 scroll-mb-6 items-center justify-between gap-0.5 rounded-lg border border-stone-300 bg-white py-2 pr-3 text-stone-900 transition-colors ",
					"dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100",
					"focus-within:custom-outline",
					item.highlighted && "outline-2",
				]}
				{...item.attrs}
			>
				{getModelName(model)}
			</div>
		{/each}
	{/each}
</div>

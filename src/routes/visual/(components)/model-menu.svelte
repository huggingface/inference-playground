<script lang="ts">
	import { page } from "$app/state";
	import fuzzysearch from "$lib/utils/search.js";
	import { Popover, SpatialMenu } from "melt/builders";
	import { watch } from "runed";
	import IconCheck from "~icons/carbon/checkmark";
	import IconChevronRight from "~icons/carbon/chevron-right";
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

	async function getImages(model: ApiModelsResponse["models"][number]) {
		try {
			const res = await fetch(`/api/model-images?modelId=${encodeURIComponent(model.id)}`);
			if (!res.ok) {
				console.error(`Failed to fetch images for ${model.id}:`, res.status, res.statusText);
				return [];
			}

			const data = await res.json();
			console.log(`Images for ${model.id}:`, data.images);
			return data.images || [];
		} catch (error) {
			console.error(`Error fetching images for ${model.id}:`, error);
			return [];
		}
	}

	$inspect(getImages(settings.model!));
</script>

<button
	class=" focus-within:custom-outline flex w-full items-center justify-between gap-0.5 rounded-lg border border-stone-300 bg-white py-2 pr-3 text-stone-900 transition-colors dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
	{...popover.trigger}
>
	{settings.model?.id ?? "Select a model"}
</button>

<div
	class={[
		popover.open && "grid",
		"max-h-128 grid-cols-3 gap-3 overflow-y-auto rounded-xl border border-stone-200 bg-white p-4 shadow-lg backdrop-blur-sm",
		"dark:border-stone-700 dark:bg-stone-900/95",
	]}
	{...popover.content}
	{...menu.root}
>
	<div class="col-span-4 mb-4">
		<input
			type="text"
			class="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm placeholder-stone-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:placeholder-stone-400 dark:focus:border-blue-400"
			bind:value={search}
			placeholder="Search models..."
			autofocus
		/>
	</div>
	{#each searchedModels as model}
		{@const item = menu.getItem(model)}
		{@const company = model.id.split("/")[0] ?? "Other"}
		<div
			class={[
				"group relative flex h-32 cursor-pointer flex-col items-start justify-between overflow-hidden rounded-lg border p-3 text-left transition-all duration-200",
				"border-stone-200 bg-white hover:border-blue-300",
				"dark:border-stone-600 dark:bg-stone-800 dark:hover:border-blue-500",
				"focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20",
				item.highlighted && "border-blue-500 ring-2 ring-blue-500/30",
				settings.model?.id === model.id && "border-green-500 bg-green-50 ring-2 ring-green-500/30 dark:bg-green-900/20",
			]}
			{...item.attrs}
		>
			{#await getImages(model)}
				<div
					class="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-700 dark:to-stone-800"
				></div>
			{:then images}
				{#if images && images.length > 0}
					<div class="absolute inset-0">
						<img
							src={images[0]}
							alt=""
							class="h-full w-full object-cover opacity-20 transition-opacity group-hover:opacity-30"
							loading="lazy"
						/>
						<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
					</div>
				{:else}
					<div
						class="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-700 dark:to-stone-800"
					></div>
				{/if}
			{:catch}
				<div
					class="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-700 dark:to-stone-800"
				></div>
			{/await}

			<div class="relative z-10 flex w-full items-start justify-between">
				<div class="min-w-0 flex-1">
					<h4 class="truncate text-sm font-medium text-stone-900 drop-shadow-sm dark:text-stone-100">
						{getModelName(model)}
					</h4>
					<p class="mt-1 truncate text-xs text-stone-600 drop-shadow-sm dark:text-stone-300">
						{formatCompanyName(company)}
					</p>
				</div>
				{#if settings.model?.id === model.id}
					<div class="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
						<IconCheck class="h-3 w-3" />
					</div>
				{/if}
			</div>
			<div class="relative z-10 mt-auto flex w-full items-center justify-between">
				<span class="text-xs text-stone-500 drop-shadow-sm dark:text-stone-400">
					{model.pipeline_tag}
				</span>
				<div class="opacity-0 transition-opacity group-hover:opacity-100">
					<IconChevronRight class="h-4 w-4 text-blue-500 drop-shadow-sm" />
				</div>
			</div>
		</div>
	{/each}
</div>

<script lang="ts">
	import { page } from "$app/state";
	import fuzzysearch from "$lib/utils/search.js";
	import { Popover, SpatialMenu } from "melt/builders";
	import { Debounced } from "runed";
	import IconCheck from "~icons/carbon/checkmark";
	import IconChevronDown from "~icons/lucide/chevron-down";
	import { settings } from "../(state)/settings.svelte.js";
	import type { ApiModelsResponse } from "../../api/models/+server.js";

	const popover = new Popover({
		floatingConfig: {
			computePosition: { placement: "bottom-start" },
		},
		onOpenChange: open => {
			// if new state is open, or it was already closed, ignore
			if (open || !prevOpen.current) return;
			document.getElementById(popover.trigger.id)?.focus();
		},
	});
	const prevOpen = new Debounced(() => popover.open, 1);

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
</script>

<button
	class="focus-within:custom-outline flex w-full items-center justify-between
	gap-0.5 truncate rounded-lg border border-stone-300 bg-white px-3
	py-2 text-stone-900
	transition-colors
	hover:bg-stone-50 hover:text-stone-900
	dark:border-stone-600 dark:bg-stone-800
	dark:text-stone-100 dark:hover:bg-stone-700 dark:hover:text-stone-100"
	{...popover.trigger}
>
	<span class="min-h-0 truncate"> {settings.model?.id ?? "Select a model"}</span>
	<IconChevronDown class="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" />
</button>

<div
	class={[
		popover.open && "flex flex-col",
		"max-h-128 w-200 overflow-clip rounded-xl border border-stone-200 bg-white  shadow-lg backdrop-blur-sm",
		"dark:border-stone-700 dark:bg-stone-900/95",
	]}
	{...popover.content}
	{...menu.root}
>
	<div class="col-span-3 px-4 pt-4">
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
			bind:value={search}
			placeholder="Search models..."
			autofocus
		/>
	</div>

	<div class="list-mask grid grid-cols-3 gap-3 overflow-y-auto p-4 pt-6">
		{#each searchedModels as model}
			{@const item = menu.getItem(model)}
			{@const company = model.id.split("/")[0] ?? "Other"}
			<div
				class={[
					"group relative flex h-64 cursor-pointer scroll-m-4 flex-col items-start justify-between overflow-hidden rounded-lg border p-3 text-left transition-all duration-200",
					"bg-white ",
					"dark:bg-stone-800",
					item.highlighted
						? "border-blue-300 ring-2 ring-blue-500/30 dark:border-blue-500 "
						: "border-stone-200 dark:border-stone-600 ",
					settings.model?.id === model.id &&
						"border-green-500 bg-green-50 ring-2 ring-green-500/30 dark:bg-green-900/20",
				]}
				{...item.attrs}
			>
				{#if model.preview_img}
					<div class="absolute inset-0">
						<img
							src={model.preview_img}
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
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.list-mask {
		--shadow-height: 20px;
		--scrollbar-width: 12px;
		position: relative;

		--mask-image:
			linear-gradient(
				to bottom,
				transparent,
				#000 var(--shadow-height),
				#000 calc(100% - var(--shadow-height)),
				transparent 100%
			),
			linear-gradient(to left, #fff var(--scrollbar-width), transparent var(--scrollbar-width));

		mask-image: var(--mask-image);
		-webkit-mask-image: var(--mask-image);
	}
</style>

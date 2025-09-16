<script lang="ts">
	import { models } from "$lib/state/models.svelte.js";
	import { VirtualScroll } from "$lib/spells/virtual-scroll.svelte.js";
	import type { CustomModel, Model } from "$lib/types.js";
	import fuzzysearch from "$lib/utils/search.js";
	import { Combobox } from "melt/builders";
	import { onMount, untrack } from "svelte";
	import typia from "typia";
	import IconCube from "~icons/carbon/cube";
	import IconStar from "~icons/carbon/star";
	import IconEye from "~icons/carbon/view";
	import Tooltip from "../../lib/components/tooltip.svelte";

	interface Props {
		modelId?: string;
		onModelSelect?: (modelId: string) => void;
	}

	let { modelId, onModelSelect }: Props = $props();

	let query = $state("");

	const selectedModel = $derived.by(() => {
		if (!modelId) return undefined;
		return models.all.find(m => m.id === modelId);
	});

	// Set initial query to current model ID
	onMount(() => {
		if (!selectedModel) return;
		query = selectedModel.id;
	});

	const queryIfTouched = $derived.by(() => {
		if (combobox.touched) return query;
		return "";
	});
	const trending = $derived(fuzzysearch({ needle: queryIfTouched, haystack: models.trending, property: "id" }));
	const other = $derived(fuzzysearch({ needle: queryIfTouched, haystack: models.nonTrending, property: "id" }));
	const custom = $derived(fuzzysearch({ needle: queryIfTouched, haystack: models.custom, property: "id" }));

	// Combine all filtered models into sections for virtualization
	type SectionItem =
		| { type: "header"; content: string }
		| { type: "model"; content: Model | CustomModel; trending?: boolean };

	const allFilteredModels = $derived.by((): SectionItem[] => {
		const sections: SectionItem[] = [];

		if (trending.length > 0) {
			sections.push({ type: "header", content: "Trending" });
			trending.forEach(model => sections.push({ type: "model", content: model, trending: true }));
		}

		if (custom.length > 0) {
			sections.push({ type: "header", content: "Custom endpoints" });
			custom.forEach(model => sections.push({ type: "model", content: model }));
		}

		if (other.length > 0) {
			sections.push({ type: "header", content: "Other models" });
			other.forEach(model => sections.push({ type: "model", content: model }));
		}

		return sections;
	});

	const virtualScroll = new VirtualScroll({
		itemHeight: 30, // Approximate height of each item
		overscan: 5,
		totalItems: () => allFilteredModels.length,
	});

	const isCustom = typia.createIs<CustomModel>();

	const combobox = new Combobox<string | undefined>({
		floatingConfig: {
			computePosition: { placement: "bottom-start" },
		},
		sameWidth: true,
		value: () => modelId,
		onValueChange(newModelId) {
			if (!newModelId) return;
			onModelSelect?.(newModelId);
			// Update query to match selected model
			const selectedModel = models.all.find(m => m.id === newModelId);
			if (selectedModel) {
				query = selectedModel.id;
			}
		},
		onNavigate(current, direction) {
			const modelItems = allFilteredModels.filter(item => item.type === "model");
			const currIdx = modelItems.findIndex(item => typeof item.content === "object" && item.content.id === current);

			let nextIdx: number;
			if (direction === "next") {
				nextIdx = currIdx === -1 ? 0 : (currIdx + 1) % modelItems.length;
			} else {
				nextIdx = currIdx === -1 ? modelItems.length - 1 : (currIdx - 1 + modelItems.length) % modelItems.length;
			}

			const nextItem = modelItems[nextIdx];
			if (!nextItem) return null;

			// Scroll to the item
			const allItems = allFilteredModels;
			const actualIdx = allItems.findIndex(item => item === nextItem);
			if (actualIdx !== -1) {
				virtualScroll.scrollToIndex(actualIdx);
			}

			// Return the content for highlighting
			return typeof nextItem.content === "object" ? nextItem.content.id : null;
		},
		onOpenChange: o => {
			if (o || !modelId) return;
			combobox.inputValue = modelId;
		},
	});

	$effect(() => {
		if (modelId && selectedModel && combobox.open) {
			untrack(() => combobox.highlight(selectedModel.id));
		}
	});
</script>

<div class="relative w-full">
	<label class="block space-y-1.5 text-xs font-medium text-gray-600">
		<p>Model</p>

		<!-- Combobox input -->
		<input
			class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm
		text-gray-900 placeholder-gray-500 transition-colors focus:border-gray-900 focus:ring-2
		focus:ring-gray-900/10 focus:outline-none"
			placeholder="Search and select a model..."
			bind:value={query}
			{...combobox.input}
		/>
	</label>

	<!-- Combobox content -->
	<div
		class="absolute z-50 mt-1 hidden max-h-80 w-full !min-w-[400px] overflow-hidden overflow-y-auto
		rounded-lg border border-gray-200 bg-white shadow-lg data-[open]:block"
		{...combobox.content}
		{...virtualScroll.container}
		onscroll={e => {
			e.stopPropagation();
			e.preventDefault();
			virtualScroll.container.onscroll(e);
		}}
	>
		<!-- Virtualized model list -->
		{#snippet modelEntry(model: Model | CustomModel, trending?: boolean)}
			{@const [nameSpace, modelName] = model.id.split("/")}
			<div
				class="flex w-full cursor-pointer items-center px-3 py-2 text-sm
						hover:bg-gray-50 data-[highlighted]:bg-gray-100"
				{...combobox.getOption(model.id)}
			>
				{#if trending}
					<div class="mr-1.5 size-4 text-yellow-400">
						<IconStar />
					</div>
				{/if}

				{#if modelName}
					<span class="inline-flex items-center">
						<span class="text-gray-500">{nameSpace}</span>
						<span class="mx-1 text-gray-300">/</span>
						<span class="text-black">{modelName}</span>
					</span>
				{:else}
					<span class="text-black">{nameSpace}</span>
				{/if}

				{#if "pipeline_tag" in model && model.pipeline_tag === "image-text-to-text"}
					<Tooltip openDelay={100}>
						{#snippet trigger(tooltip)}
							<div
								class="ml-2 grid size-5 place-items-center rounded bg-gray-500/10 text-gray-500"
								{...tooltip.trigger}
							>
								<IconEye class="size-3.5" />
							</div>
						{/snippet}
						Image text-to-text
					</Tooltip>
				{/if}

				{#if isCustom(model)}
					<Tooltip openDelay={100}>
						{#snippet trigger(tooltip)}
							<div
								class="ml-2 grid size-5 place-items-center rounded bg-gray-500/10 text-gray-500"
								{...tooltip.trigger}
							>
								<IconCube class="size-3.5" />
							</div>
						{/snippet}
						Custom Model
					</Tooltip>
				{/if}
			</div>
		{/snippet}

		<!-- Virtual scroll container -->
		<div style="height: {virtualScroll.totalHeight}px; position: relative;">
			<div style="transform: translateY({virtualScroll.offsetY}px);">
				{#each virtualScroll.getVisibleItems(allFilteredModels) as { item }}
					{#if item.type === "header"}
						<div class="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">{item.content}</div>
					{:else}
						{@render modelEntry(item.content, item.trending)}
					{/if}
				{/each}
			</div>
		</div>
	</div>
</div>

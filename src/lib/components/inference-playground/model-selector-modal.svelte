<script lang="ts">
	import { autofocus } from "$lib/actions/autofocus.js";
	import { models } from "$lib/state/models.svelte.js";
	import type { Conversation, CustomModel, Model } from "$lib/types.js";
	import { noop } from "$lib/utils/noop.js";
	import fuzzysearch from "$lib/utils/search.js";
	import { sleep } from "$lib/utils/sleep.js";
	import { Combobox } from "melt/builders";
	import { untrack } from "svelte";
	import typia from "typia";
	import IconAdd from "~icons/carbon/add";
	import IconCube from "~icons/carbon/cube";
	import IconEdit from "~icons/carbon/edit";
	import IconSearch from "~icons/carbon/search";
	import IconStar from "~icons/carbon/star";
	import IconEye from "~icons/carbon/view";
	import Tooltip from "../tooltip.svelte";
	import { openCustomModelConfig } from "./custom-model-config.svelte";

	interface Props {
		onModelSelect?: (model: string) => void;
		onClose?: () => void;
		conversation: Conversation;
	}

	let { onModelSelect, onClose, conversation }: Props = $props();

	const combobox = new Combobox({
		onOpenChange(o) {
			if (!o) onClose?.();
		},
		floatingConfig: {
			onCompute: noop,
		},
		sameWidth: false,
		value: () => undefined,
		onValueChange(modelId) {
			if (!modelId) return;
			onModelSelect?.(modelId);
			onClose?.();
		},
	});
	$effect(() => {
		untrack(() => combobox.highlight(conversation.model.id));
		// Workaround while this component does not use a <dialog />
		sleep(10).then(() => {
			combobox.open = true;
		});
	});

	let backdropEl = $state<HTMLDivElement>();
	let query = $state("");

	const trending = $derived(fuzzysearch({ needle: query, haystack: models.trending, property: "id" }));
	const other = $derived(fuzzysearch({ needle: query, haystack: models.nonTrending, property: "id" }));
	const custom = $derived(fuzzysearch({ needle: query, haystack: models.custom, property: "id" }));

	function handleBackdropClick(event: MouseEvent) {
		event.stopPropagation();
		if (window?.getSelection()?.toString()) {
			return;
		}
		if (event.target === backdropEl) {
			onClose?.();
		}
	}

	const isCustom = typia.createIs<CustomModel>();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="fixed inset-0 z-50 h-dvh bg-black/85 pt-32" bind:this={backdropEl} onclick={handleBackdropClick}>
	<div
		class="abs-x-center md:abs-y-center absolute top-12 flex w-[calc(100%-2rem)] max-w-[600px] flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
	>
		<div class="flex items-center border-b px-3 dark:border-gray-800">
			<div class="mr-2 text-sm">
				<IconSearch />
			</div>
			<input
				{...combobox.input}
				use:autofocus
				class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-hidden"
				placeholder="Search models ..."
				bind:value={query}
			/>
		</div>
		<div
			class="max-h-[220px] overflow-x-hidden overflow-y-auto md:max-h-[300px]"
			{...combobox.content}
			popover={undefined}
		>
			{#snippet modelEntry(model: Model | CustomModel, trending?: boolean)}
				{@const [nameSpace, modelName] = model.id.split("/")}
				<div
					class="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm
						data-[highlighted]:bg-gray-100 data-[highlighted]:dark:bg-gray-800"
					data-model
					{...combobox.getOption(model.id)}
				>
					{#if trending}
						<div class=" mr-1.5 size-4 text-yellow-400">
							<IconStar />
						</div>
					{/if}

					{#if modelName}
						<span class="inline-flex items-center">
							<span class="text-gray-500 dark:text-gray-400">{nameSpace}</span>
							<span class="mx-1 text-gray-300 dark:text-gray-700">/</span>
							<span class="text-black dark:text-white">{modelName}</span>
						</span>
					{:else}
						<span class="text-black dark:text-white">{nameSpace}</span>
					{/if}

					{#if "pipeline_tag" in model && model.pipeline_tag === "image-text-to-text"}
						<Tooltip openDelay={100}>
							{#snippet trigger(tooltip)}
								<div
									class="ml-2 grid size-5 place-items-center rounded bg-gray-500/10 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300"
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
									class="ml-2 grid size-5 place-items-center rounded bg-gray-500/10 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300"
									{...tooltip.trigger}
								>
									<IconCube class="size-3.5" />
								</div>
							{/snippet}
							Custom Model
						</Tooltip>
						<Tooltip>
							{#snippet trigger(tooltip)}
								<button
									class="mr-1 ml-auto grid size-4.5 place-items-center rounded-sm bg-gray-100 text-xs
					hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500"
									aria-label="Add custom model"
									{...tooltip.trigger}
									onclick={e => {
										e.stopPropagation();
										onClose?.();
										openCustomModelConfig({
											model,
											onSubmit: model => {
												onModelSelect?.(model.id);
											},
										});
									}}
								>
									<IconEdit class="size-3" />
								</button>
							{/snippet}
							<span class="text-sm">Edit</span>
						</Tooltip>
					{/if}
				</div>
			{/snippet}
			{#if trending.length > 0}
				<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Trending</div>
				{#each trending as model}
					{@render modelEntry(model, true)}
				{/each}
			{/if}
			<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Custom endpoints</div>
			{#if custom.length > 0}
				{#each custom as model}
					{@render modelEntry(model, false)}
				{/each}
			{/if}
			<div
				class="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-gray-500 data-[highlighted]:bg-blue-500/15 data-[highlighted]:text-blue-600 dark:text-gray-400 dark:data-[highlighted]:text-blue-300"
				{...combobox.getOption("__custom__", () => {
					onClose?.();
					openCustomModelConfig({
						onSubmit: model => {
							onModelSelect?.(model.id);
						},
					});
				})}
			>
				<IconAdd class="rounded bg-blue-500/10 text-blue-600" />
				Add a custom endpoint
			</div>
			{#if other.length > 0}
				<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Other models</div>
				{#each other as model}
					{@render modelEntry(model, false)}
				{/each}
			{/if}
		</div>
	</div>
</div>

<script lang="ts">
	import { autofocus } from "$lib/actions/autofocus.js";
	import { models } from "$lib/state/models.svelte.js";
	import type { Conversation, CustomModel, ModelWithTokenizer } from "$lib/types.js";
	import fuzzysearch from "$lib/utils/search.js";
	import { watch } from "runed";
	import { tick } from "svelte";
	import typia from "typia";
	import IconAdd from "~icons/carbon/add";
	import IconCube from "~icons/carbon/cube";
	import IconSearch from "~icons/carbon/search";
	import IconStar from "~icons/carbon/star";
	import IconEye from "~icons/carbon/view";
	import IconEdit from "~icons/carbon/edit";
	import Tooltip from "../tooltip.svelte";
	import { openCustomModelConfig } from "./custom-model-config.svelte";

	interface Props {
		onModelSelect?: (model: string) => void;
		onClose?: () => void;
		conversation: Conversation;
	}

	let { onModelSelect, onClose, conversation }: Props = $props();

	let backdropEl = $state<HTMLDivElement>();
	let highlightIdx = $state(-1);
	let ignoreCursorHighlight = $state(false);
	let containerEl = $state<HTMLDivElement>();
	let query = $state("");

	const trending = $derived(fuzzysearch({ needle: query, haystack: models.trending, property: "id" }));
	const other = $derived(fuzzysearch({ needle: query, haystack: models.nonTrending, property: "id" }));
	const custom = $derived(fuzzysearch({ needle: query, haystack: models.custom, property: "id" }));
	const queried = $derived([...trending, ...other, ...custom]);

	function getModelIdx(model: ModelWithTokenizer | CustomModel) {
		return queried.findIndex(m => m.id === model.id);
	}
	const highlighted = $derived(queried[highlightIdx]);

	watch(
		() => queried,
		(curr, prev) => {
			const prevModel = prev?.[highlightIdx];
			if (prevModel) {
				// maintain model selection
				highlightIdx = Math.max(
					0,
					curr.findIndex(model => model.id === prevModel?.id)
				);
			} else {
				highlightIdx = curr.findIndex(model => model.id === conversation.model.id);
			}
			scrollToResult();
		}
	);

	function selectModel(model: ModelWithTokenizer | CustomModel) {
		onModelSelect?.(model.id);
		onClose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onClose?.();
		} else if (e.key === "Enter") {
			if (highlighted) selectModel(highlighted);
		} else if (e.key === "ArrowUp") {
			if (highlightIdx > 0) highlightIdx--;
			ignoreCursorHighlight = true;
		} else if (e.key === "ArrowDown") {
			if (highlightIdx < queried.length - 1) highlightIdx++;
			ignoreCursorHighlight = true;
		} else {
			return;
		}
		e.preventDefault();

		scrollToResult();
	}

	async function scrollToResult() {
		await tick();
		const highlightedEl = document.querySelector("[data-model][data-highlighted]");
		highlightedEl?.scrollIntoView({ block: "nearest" });
	}

	function highlightRow(idx: number) {
		if (ignoreCursorHighlight) return;
		highlightIdx = idx;
	}

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

<svelte:window onkeydown={handleKeydown} onmousemove={() => (ignoreCursorHighlight = false)} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="fixed inset-0 z-10 flex h-screen items-start justify-center bg-black/85 pt-32"
	bind:this={backdropEl}
	onclick={handleBackdropClick}
>
	<div class="flex w-full max-w-[600px] items-start justify-center overflow-hidden p-10 text-left whitespace-nowrap">
		<div
			class="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white text-gray-900 shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
			bind:this={containerEl}
		>
			<div class="flex items-center border-b px-3 dark:border-gray-800">
				<div class="mr-2 text-sm">
					<IconSearch />
				</div>
				<input
					use:autofocus
					class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder-gray-400 outline-hidden"
					placeholder="Search models ..."
					bind:value={query}
				/>
			</div>
			<div class="max-h-[300px] overflow-x-hidden overflow-y-auto">
				{#snippet modelEntry(model: ModelWithTokenizer | CustomModel, trending?: boolean)}
					{@const idx = getModelIdx(model)}
					{@const [nameSpace, modelName] = model.id.split("/")}
					<button
						class="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm
						data-[highlighted]:bg-gray-100 data-[highlighted]:dark:bg-gray-800"
						data-highlighted={highlightIdx === idx ? true : undefined}
						data-model
						onmouseenter={() => highlightRow(idx)}
						onclick={() => {
							onModelSelect?.(model.id);
							onClose?.();
						}}
					>
						{#if trending}
							<div class=" mr-1.5 size-4 text-yellow-400">
								<IconStar />
							</div>
						{/if}
						<span class="inline-flex items-center"
							><span class="text-gray-500 dark:text-gray-400">{nameSpace}</span><span
								class="mx-1 text-gray-300 dark:text-gray-700">/</span
							><span class="text-black dark:text-white">{modelName}</span></span
						>

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
											openCustomModelConfig({ model });
										}}
									>
										<IconEdit class="size-3" />
									</button>
								{/snippet}
								<span class="text-sm">Edit</span>
							</Tooltip>
						{/if}
					</button>
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
				<button
					class="flex w-full cursor-pointer items-center gap-2  px-2 py-1.5 text-sm text-gray-500  dark:text-gray-400 hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-300"
					onclick={() => {
						onClose?.();
						openCustomModelConfig({ onSubmit: m => (conversation.model = m) });
					}}
				>
					<IconAdd class="text-blue-600 bg-blue-500/10 rounded"/>
					Add a custom endpoint
				</button>
				{#if other.length > 0}
					<div class="px-2 py-1.5 text-xs font-medium text-gray-500">Other models</div>
					{#each other as model}
						{@render modelEntry(model, false)}
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<script lang="ts" module>
	const data = $derived(page.data as ApiModelsResponse);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- temporary hack while this is in a module
	let model: Model = $state<ApiModelsResponse["models"][number]>(undefined as any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- temporary hack while this is in a module
	let provider: InferenceProviderMapping["provider"] = $state(undefined as any);

	let filterTag = $state<PipelineTag>(PipelineTag.TextToImage);
	let prompt = $state("");

	let inputContainer = $state<HTMLElement>();

	export function reuseSettings(item: VisualItem | GeneratingItem) {
		const config = item.config;
		if (!config) return;

		if (config.prompt) {
			prompt = config.prompt;
		}
		if (config.model && config.provider) {
			// Find the model by ID
			const foundModel = data.models.find(m => m.id === config.model);
			if (foundModel) {
				model = foundModel;
				// Find the provider in the model's mappings
				const foundProvider = foundModel.inferenceProviderMapping.find(p => p.provider === config.provider);
				if (foundProvider) {
					provider = foundProvider.provider;
				}

				filterTag = model.pipeline_tag;
			}
		}

		if (!inputContainer) return;

		const color = getComputedStyle(document.documentElement).getPropertyValue("--color-mandarin-peel-10");

		inputContainer?.animate(
			[
				{ outlineColor: color, offset: 0 },
				{ outlineColor: color, offset: 0.8 },
				{ outlineColor: "transparent", offset: 1 },
			],
			{
				duration: 1200,
			}
		);
	}
</script>

<script lang="ts">
	import { page } from "$app/state";
	import LocalToasts from "$lib/components/local-toasts.svelte";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { token } from "$lib/state/token.svelte.js";
	import { PipelineTag, type InferenceProviderMapping, type Model } from "$lib/types.js";
	import ProviderSelect from "$lib/ui/provider-select.svelte";
	import fuzzysearch from "$lib/utils/search.js";
	import { InferenceClient } from "@huggingface/inference";
	import { Combobox } from "melt/builders";
	import { watch } from "runed";
	import IconCheck from "~icons/lucide/check";
	import IconChevronDown from "~icons/lucide/chevron-down";
	import IconHeart from "~icons/lucide/heart";
	import IconImage from "~icons/lucide/image";
	import IconSparkles from "~icons/lucide/sparkles";
	import IconVideo from "~icons/lucide/video";
	import type { ApiModelsResponse } from "../api/models/+server.js";
	import { blobs, VisualEntityType, visualItems, type GeneratingItem, type VisualItem } from "./state.svelte.js";
	import { capitalize } from "$lib/utils/string.js";
	import { columns } from "./settings.svelte.js";

	type Props = {
		style?: string;
	};
	const { style }: Props = $props();

	model = data.models[0]!;
	provider = data.models[0]!.inferenceProviderMapping[0]!.provider;

	const modelCombobox = new Combobox({
		value: () => model,
		onValueChange: v => {
			if (!v) return;
			model = v;
		},
		onOpenChange: open => {
			if (!open) modelCombobox.inputValue = model.id;
		},
		inputValue: model.id,
		sameWidth: false,
		floatingConfig: {
			computePosition: { placement: "bottom-start" },
			offset: { mainAxis: 16, crossAxis: 0 },
		},
	});

	const filteredModels = $derived(
		data.models.filter(m => m.pipeline_tag === filterTag).toSorted((a, b) => a.id.localeCompare(b.id))
	);
	watch(
		() => $state.snapshot(filteredModels),
		() => {
			if (filteredModels.includes(model)) return;
			model = filteredModels[0]!;
			modelCombobox.inputValue = model.id;
		}
	);

	const searchedModels = $derived(
		fuzzysearch({
			needle: modelCombobox.touched ? modelCombobox.inputValue : "",
			haystack: filteredModels,
			property: "id",
		})
	);

	let autosized = new TextareaAutosize();

	async function generateContent(isMock: boolean = false) {
		if (!prompt.trim()) return;

		const currentPrompt = prompt.trim();
		const startTime = Date.now();
		const isVideo = filterTag === PipelineTag.TextToVideo;

		// Add loading item
		const item: GeneratingItem = {
			id: crypto.randomUUID(),
			type: isVideo ? VisualEntityType.Video : VisualEntityType.Image,
			config: {
				prompt: currentPrompt,
				model: isMock ? (isVideo ? "Mock Video Model" : "Mock Model") : model.id,
				provider: isMock ? "mock" : provider,
			},
		};
		visualItems.generating = [...visualItems.generating, item];

		try {
			let blob: Blob;

			if (isMock) {
				// Mock generation with delay
				const min = 1000;
				const max = isVideo ? 3000 : 4000;
				const delay = Math.random() * (max - min) + min;
				await new Promise(resolve => setTimeout(resolve, delay));

				// Fetch appropriate mock content
				const response = await fetch(isVideo ? "/src/routes/visual/placeholder.mp4" : "/api/sb-image");
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				blob = await response.blob();
			} else {
				// Real generation using Hugging Face API
				const client = new InferenceClient(token.value);

				blob = isVideo
					? ((await client.textToVideo({
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							provider: provider as any,
							model: model.id,
							inputs: currentPrompt,
						})) as unknown as Blob)
					: ((await client.textToImage({
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							provider: provider as any,
							model: model.id,
							inputs: currentPrompt,
							parameters: { num_inference_steps: 4 },
						})) as unknown as Blob);
			}

			const endTime = Date.now();
			const generationTimeMs = endTime - startTime;

			const storageKey = await blobs.upload(blob);
			await visualItems.create({
				...item,
				storageKey,
				generationTimeMs,
			});
		} catch (error) {
			const prefix = isMock ? "Mock " : "";
			console.error(`${prefix}${isVideo ? "video" : "image"} generation failed:`, error);
		} finally {
			visualItems.generating = visualItems.generating.filter(_item => item !== _item);
		}
	}

	const contentType = $derived(filterTag === PipelineTag.TextToImage ? "image" : "video");
</script>

<!-- Sidebar -->
<div
	class="dark:from-lemon-punch-1 dark:to-lemon-punch-2 flex h-full flex-1 flex-col overflow-hidden bg-gradient-to-b from-stone-50 to-stone-100 dark:border-stone-700"
	{style}
>
	<div class="sidebar-header border-b border-stone-200 p-4 dark:border-stone-700">
		<h2 class="text-lg font-semibold text-stone-800 dark:text-stone-200">{capitalize(contentType)} Generation</h2>
		<p class="text-sm text-stone-600 dark:text-stone-400">Configure your settings</p>
	</div>

	<div class="flex-1 overflow-auto p-4">
		<div
			class="space-y-4 rounded-sm outline-2 outline-offset-8 outline-transparent outline-dashed"
			bind:this={inputContainer}
		>
			<div class="flex items-end gap-2">
				<div class="flex flex-1 flex-col gap-2">
					<label {...modelCombobox.label} class="block text-sm font-medium text-stone-700 dark:text-stone-300">
						Model
					</label>

					<div
						class="focus-within:custom-outline flex w-full items-center justify-between gap-0.5 rounded-lg border border-stone-300 bg-white py-2 pr-3 text-stone-900 transition-colors dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
					>
						<input {...modelCombobox.input} class="flex-1 shrink pl-3 outline-none" />
						<button
							class="bg-pasilla-3 hover:bg-pasilla-4 active:hover:bg-pasilla-2 rounded px-2 py-1 text-xs"
							{...modelCombobox.trigger}
						>
							<IconChevronDown />
						</button>
					</div>

					<div
						{...modelCombobox.content}
						class={[
							"max-h-96 flex-col rounded-lg border border-stone-600 bg-stone-100 p-2 shadow dark:bg-stone-800",
							modelCombobox.open && "flex",
						]}
					>
						{#each searchedModels as model (model)}
							<div
								{...modelCombobox.getOption(model)}
								class={[
									"relative flex scroll-m-2 items-center justify-between rounded-xl py-2 pr-2 pl-2",
									modelCombobox.highlighted?.id === model.id && "bg-stone-700",
									modelCombobox.value?.id === model.id && "font-semibold",
								]}
							>
								<span>{model.id}</span>
								{#if modelCombobox.value?.id === model.id}
									<IconCheck class="text-mandarin-peel-15 font-bold" />
								{/if}
							</div>
						{:else}
							<div {...modelCombobox.getOption(model, model.id)}>{model.id}</div>
						{/each}
					</div>
				</div>

				<div
					class="focus-within:custom-outline relative flex h-10.5 rounded-lg border border-stone-200/20 bg-stone-800 p-0.5 shadow-lg dark:border-stone-600"
				>
					<!-- Sliding background indicator -->
					<div
						class="absolute top-0.5 h-8.75 rounded-md bg-stone-700 shadow-md transition-all duration-150 ease-out"
						style="width: calc(50% - 4px); transform: translateX({filterTag === PipelineTag.TextToImage
							? '0'
							: 'calc(100% + 4px)'})"
					></div>

					{#snippet radio(tag: PipelineTag, Icon: typeof IconImage)}
						<label
							class="group relative z-10 flex flex-1 cursor-pointer items-center justify-center rounded-lg px-4 py-2 transition-all duration-300 ease-out"
							class:text-white={filterTag === tag}
							class:text-stone-400={filterTag !== tag}
							class:hover:text-stone-200={filterTag !== tag}
						>
							<!-- Icon -->
							<Icon class="h-4 w-4 transition-all duration-150 ease-out " />

							<!-- Hidden radio input -->
							<input
								type="radio"
								value={tag}
								name="model-type"
								aria-label={tag}
								class="absolute inset-0 cursor-pointer opacity-0"
								bind:group={filterTag}
							/>
						</label>
					{/snippet}

					{@render radio(PipelineTag.TextToImage, IconImage)}
					{@render radio(PipelineTag.TextToVideo, IconVideo)}
				</div>
			</div>

			<div class="space-y-2">
				<ProviderSelect {model} bind:provider />
			</div>

			<label class="block space-y-2 text-sm font-medium text-stone-700 dark:text-stone-300">
				<p>Prompt</p>
				<textarea
					class="w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
					bind:value={prompt}
					placeholder="Describe the {contentType} you want to generate..."
					rows="4"
					{@attach autosized.attachment}
				></textarea>
			</label>

			<label for="columns" class="hidden space-y-2 text-sm font-medium text-stone-700 lg:block dark:text-stone-300">
				<p>Columns</p>
				<select
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 transition-colors dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
					id="columns"
					bind:value={columns.current}
				>
					<option value={1}>1 Column</option>
					<option value={2}>2 Columns</option>
					<option value={3}>3 Columns</option>
					<option value={4}>4 Columns</option>
					<option value={5}>5 Columns</option>
					<option value={6}>6 Columns</option>
				</select>
			</label>
		</div>
	</div>

	<div class="sidebar-footer space-y-2 border-t border-stone-200 p-4 dark:border-stone-700">
		{#snippet generateBtn(args: { classes?: string; onGenerate: () => void; icon: typeof IconSparkles; label: string })}
			<LocalToasts>
				{#snippet children({ addToast, trigger })}
					<button
						class="btn-depth flex h-10 w-full touch-manipulation items-center justify-center rounded-md px-4 py-2 text-base font-medium tracking-wide whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 {args.classes}"
						onclick={() => {
							if (!prompt) {
								return addToast({
									type: "assertive",
									data: { content: "Prompt is required to generate", variant: "danger" },
								});
							}
							args.onGenerate();
						}}
						{...trigger}
					>
						<args.icon class="mr-2 h-4 w-4" />
						{args.label}
					</button>
				{/snippet}
			</LocalToasts>
		{/snippet}

		{@render generateBtn({
			onGenerate: () => generateContent(false),
			icon: IconSparkles,
			label: `Generate ${contentType}`,
		})}

		{@render generateBtn({
			classes: "btn-depth-stone",
			onGenerate: () => generateContent(true),
			icon: IconHeart,
			label: "Mock generate",
		})}
	</div>
</div>

<style>
	@reference "../../app.css";

	.sidebar {
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
	}

	.sidebar-header {
		background: linear-gradient(135deg, var(--color-lemon-punch-3), var(--color-lemon-punch-5));
	}
</style>

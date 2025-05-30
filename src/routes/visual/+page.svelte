<script lang="ts">
	import { masonry } from "$lib/attachments/masonry.js";
	import { Splitter } from "$lib/spells/splitter.svelte.js";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { token } from "$lib/state/token.svelte.js";
	import { PipelineTag, type InferenceProviderMapping, type Model } from "$lib/types.js";
	import ProviderSelect from "$lib/ui/provider-select.svelte";
	import { InferenceClient } from "@huggingface/inference";
	import { PersistedState, useDebounce, watch } from "runed";
	import { onMount } from "svelte";
	import IconHeart from "~icons/lucide/heart";
	import { default as IconImage, default as IconPhoto } from "~icons/lucide/image";
	import IconSparkles from "~icons/lucide/sparkles";
	import IconVideo from "~icons/lucide/video";
	import IconX from "~icons/lucide/x";
	import type { ApiModelsResponse } from "../api/models/+server.js";
	import ImageCard from "./image-card.svelte";
	import type { ImageItem } from "./types.js";

	let { data }: { data: ApiModelsResponse } = $props();

	let model: Model = $state(data.models[0]!);
	let filterTag = $state<PipelineTag>(PipelineTag.TextToImage);
	const filteredModels = $derived(data.models.filter(m => m.pipeline_tag === filterTag));
	watch(
		() => $state.snapshot(filteredModels),
		() => {
			if (!filteredModels.includes(model)) model = filteredModels[0]!;
		}
	);

	let provider: InferenceProviderMapping["provider"] = $state(data.models[0]!.inferenceProviderMapping[0]!.provider);
	let prompt = $state("");
	let columns = $state(3);
	let expandedImage: ImageItem | null = $state(null);
	let autosized = new TextareaAutosize();
	let dialogElement: HTMLDialogElement;

	const images = $state<ImageItem[]>([]);

	function generateUniqueId(): string {
		return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	function expandImage(imageItem: ImageItem) {
		expandedImage = imageItem;
		dialogElement?.showModal();
	}

	function closeExpandedImage() {
		expandedImage = null;
		dialogElement?.close();
	}

	function reuseSettings(imageItem: ImageItem) {
		if (imageItem.prompt) {
			prompt = imageItem.prompt;
		}
		if (imageItem.model && imageItem.provider) {
			// Find the model by ID
			const foundModel = data.models.find(m => m.id === imageItem.model);
			if (foundModel) {
				model = foundModel;
				// Find the provider in the model's mappings
				const foundProvider = foundModel.inferenceProviderMapping.find(p => p.provider === imageItem.provider);
				if (foundProvider) {
					provider = foundProvider.provider;
				}
			}
		}

		if (!inputContainer) return;

		const green = getComputedStyle(document.documentElement).getPropertyValue("--color-blue-600");

		inputContainer?.animate(
			[
				{ outlineColor: green, offset: 0 },
				{ outlineColor: green, offset: 0.8 },
				{ outlineColor: "transparent", offset: 1 },
			],
			{
				duration: 1200,
			}
		);
	}

	async function generateImage() {
		if (!prompt.trim()) return;

		const imageId = generateUniqueId();
		const currentPrompt = prompt.trim();
		const currentModel = model.id;
		const currentProvider = provider;
		const startTime = Date.now();

		// Add loading item
		images.push({
			id: imageId,
			isLoading: true,
			prompt: currentPrompt,
			model: currentModel,
			provider: currentProvider,
			startTime,
		});

		try {
			const client = new InferenceClient(token.value);

			const image = (await client.textToImage({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				provider: provider as any,
				model: model.id,
				inputs: currentPrompt,
				parameters: { num_inference_steps: 4 },
			})) as unknown as Blob;

			const endTime = Date.now();
			const generationTimeMs = endTime - startTime;

			// Find the image item by ID and update it
			const imageItem = images.find(img => img.id === imageId);
			if (imageItem) {
				imageItem.blob = image;
				imageItem.isLoading = false;
				imageItem.generationTimeMs = generationTimeMs;
			}
		} catch (error) {
			// Remove the failed image item
			const index = images.findIndex(img => img.id === imageId);
			if (index !== -1) {
				images.splice(index, 1);
			}
			console.error("Image generation failed:", error);
		}
	}

	async function mockGenerateImage() {
		// if (!prompt.trim()) return;

		const imageId = generateUniqueId();
		const currentPrompt = prompt.trim();
		const startTime = Date.now();

		// Add loading item
		images.push({
			id: imageId,
			isLoading: true,
			prompt: currentPrompt,
			model: "Mock Model",
			provider: "mock",
			startTime,
		});

		try {
			// Random delay
			const min = 1000;
			const max = 4000;
			const delay = Math.random() * (max - min) + min;
			await new Promise(resolve => setTimeout(resolve, delay));

			// Fetch image blob directly from proxy
			const response = await fetch("/api/sb-image");

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const imageBlob = await response.blob();
			const endTime = Date.now();
			const generationTimeMs = endTime - startTime;

			// Find the image item by ID and update it
			const imageItem = images.find(img => img.id === imageId);
			if (imageItem) {
				imageItem.blob = imageBlob;
				imageItem.isLoading = false;
				imageItem.generationTimeMs = generationTimeMs;
			}
		} catch (error) {
			// Remove the failed image item
			const index = images.findIndex(img => img.id === imageId);
			if (index !== -1) {
				images.splice(index, 1);
			}
			console.error("Mock image generation failed:", error);
		}
	}

	function deleteImage(imageId: string) {
		const index = images.findIndex(img => img.id === imageId);
		if (index !== -1) {
			images.splice(index, 1);
		}
	}

	const splitterSize = new PersistedState("sidebar-width", 400);
	const updateSplitterSize = useDebounce((v: number) => {
		splitterSize.current = v;
	});
	const splitter = new Splitter({
		min: 240,
		value: splitterSize.current,
		onValueChange(v) {
			updateSplitterSize(v);
		},
		max: 1200,
	});

	onMount(() => {
		[...new Array(8)].forEach(_ => mockGenerateImage());
	});

	let inputContainer = $state<HTMLElement>();
</script>

<svelte:window
	onkeydown={e => {
		if (e.key === "Escape" && expandedImage) {
			closeExpandedImage();
		}
	}}
/>

<div class="flex h-lvh dark:text-white">
	<!-- Sidebar -->
	<div
		class="sidebar flex h-full flex-col border-r border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800"
		style="min-width: {splitter.value}px;width: {splitter.value}px;"
	>
		<div class="sidebar-header border-b border-gray-200 p-4 dark:border-gray-700">
			<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Image Generation</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">Configure your settings</p>
		</div>

		<div class="sidebar-content flex-1 p-4">
			<div
				class="space-y-4 rounded-sm outline-2 outline-offset-8 outline-transparent outline-dashed"
				bind:this={inputContainer}
			>
				<div class="flex items-end gap-2">
					<div class="space-y-2">
						<label for="model" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
						<select
							class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
							id="model"
							bind:value={model}
						>
							{#each data.models
								.toSorted((a, b) => a.id.localeCompare(b.id))
								.filter(m => m.pipeline_tag === filterTag) as model (model)}
								<option value={model}>{model.id}</option>
							{/each}
						</select>
					</div>

					<div
						class="relative flex h-9.5 rounded-lg border border-gray-200/20 bg-gray-800 p-0.5 shadow-lg dark:border-gray-700/30"
					>
						<!-- Sliding background indicator -->
						<div
							class="absolute top-0.5 h-8 rounded-md bg-gray-700 shadow-md transition-all duration-150 ease-out"
							style="width: calc(50% - 4px); transform: translateX({filterTag === PipelineTag.TextToImage
								? '0'
								: 'calc(100% + 4px)'})"
						></div>

						{#snippet radio(tag: PipelineTag, Icon: typeof IconImage)}
							<label
								class="group relative z-10 flex flex-1 cursor-pointer items-center justify-center rounded-lg px-4 py-2 transition-all duration-300 ease-out"
								class:text-white={filterTag === tag}
								class:text-gray-400={filterTag !== tag}
								class:hover:text-gray-200={filterTag !== tag}
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

				<label class="block space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					<p>Prompt</p>
					<textarea
						class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
						bind:value={prompt}
						placeholder="Describe the image you want to generate..."
						rows="4"
						{@attach autosized.attachment}
					></textarea>
				</label>

				<label for="columns" class="block space-y-2 text-sm font-medium text-gray-700 dark:text-gray-300">
					<p>Columns</p>
					<select
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
						id="columns"
						bind:value={columns}
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

		<div class="sidebar-footer space-y-2 border-t border-gray-200 p-4 dark:border-gray-700">
			<button
				class="btn-depth flex h-10 w-full touch-manipulation items-center justify-center rounded-md px-4 py-2 text-base font-medium tracking-wide whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				onclick={generateImage}
			>
				<IconSparkles class="mr-2 h-4 w-4" />
				Generate
			</button>
			<button
				class="btn-depth btn-depth-gray flex h-10 w-full touch-manipulation items-center justify-center rounded-md px-4 py-2 text-sm text-sm font-medium tracking-wide whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				onclick={mockGenerateImage}
				aria-label="Generate mock image for testing"
			>
				<IconHeart class="mr-2 h-4 w-4" />
				Mock Generate
			</button>
		</div>
	</div>

	<!-- Resize Handle -->
	<div
		class={[
			"relative z-10 w-1 cursor-col-resize outline-hidden transition-colors hover:bg-blue-500 focus-visible:ring-2 dark:hover:bg-blue-400",
			splitter.isResizing ? "bg-blue-500 dark:bg-blue-400" : "bg-gray-300 dark:bg-gray-700",
		]}
		{...splitter.separator}
		{@attach splitter.separator.attach}
		aria-label="Resize sidebar"
	></div>

	<!-- Main content -->
	<main class="dark:bg-lemon-punch-3 flex-1 overflow-auto bg-gray-50 p-6">
		{#if images.length === 0}
			<div class="flex h-full items-center justify-center text-gray-500">
				<div class="text-center">
					<IconPhoto class="mx-auto mb-4 h-16 w-16 text-gray-400" />
					<p class="text-lg font-medium">No images generated yet</p>
					<p class="text-sm">Click "Generate" to create your first image</p>
				</div>
			</div>
		{:else}
			<div
				class="grid grid-cols-[repeat(var(--columns),_1fr)] grid-rows-[masonry] items-start gap-6"
				style="--columns: {columns};"
				role="grid"
				aria-label="Generated images"
				{@attach masonry}
			>
				{#each images as image (image.id)}
					<ImageCard
						{image}
						onDelete={() => deleteImage(image.id)}
						onReuse={() => reuseSettings(image)}
						onExpand={() => expandImage(image)}
					/>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Image Expansion Dialog -->
<dialog
	bind:this={dialogElement}
	class="backdrop:bg-opacity-75 m-auto max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black dark:bg-gray-800"
	aria-labelledby="expanded-image-title"
	onclick={e => {
		// Close dialog when clicking on backdrop
		if (e.target === dialogElement) {
			closeExpandedImage();
		}
	}}
>
	<button
		class="fixed top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
		onclick={closeExpandedImage}
		aria-label="Close expanded image"
	>
		<IconX class="h-6 w-6" />
	</button>
	{#if expandedImage && expandedImage.blob}
		<img
			src={URL.createObjectURL(expandedImage.blob)}
			alt="Expanded view: {expandedImage.prompt}"
			class="max-h-[70vh] max-w-full object-contain"
		/>
	{/if}
</dialog>

<style>
	.sidebar {
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
	}

	.sidebar-header {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
	}

	/* Dialog styles */
	dialog {
		border: none;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.75);
	}
</style>

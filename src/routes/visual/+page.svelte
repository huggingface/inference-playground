<script lang="ts">
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { token } from "$lib/state/token.svelte.js";
	import type { InferenceProviderMapping, Model } from "$lib/types.js";
	import ProviderSelect from "$lib/ui/provider-select.svelte";
	import { InferenceClient } from "@huggingface/inference";
	import IconBolt from "~icons/tabler/bolt";
	import IconDownload from "~icons/tabler/download";
	import IconHeart from "~icons/tabler/heart";
	import IconPhoto from "~icons/tabler/photo";
	import IconRefresh from "~icons/tabler/refresh";
	import IconTrash from "~icons/tabler/trash";
	import IconX from "~icons/tabler/x";
	import IconZoomIn from "~icons/tabler/zoom-in";
	import type { ApiModelsResponse } from "../api/models/+server.js";
	import LoadingAnimation from "./loading-animation.svelte";
	import { Splitter } from "$lib/spells/splitter.svelte.js";
	import Tooltip from "$lib/components/tooltip.svelte";

	let { data }: { data: ApiModelsResponse } = $props();

	let model: Model = $state(data.models[0]!);
	let provider: InferenceProviderMapping["provider"] = $state(data.models[0]!.inferenceProviderMapping[0]!.provider);
	let prompt = $state("");
	let columns = $state(3);
	let expandedImage: ImageItem | null = $state(null);
	let autosized = new TextareaAutosize();

	interface ImageItem {
		id: string;
		blob?: Blob;
		isLoading: boolean;
		prompt: string;
		model?: string;
		provider?: string;
		generationTimeMs?: number;
		startTime?: number;
	}

	const images = $state<ImageItem[]>([]);

	function generateUniqueId(): string {
		return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	function formatGenerationTime(ms: number): string {
		if (ms < 1000) {
			return `${Math.round(ms)}ms`;
		} else {
			return `${(ms / 1000).toFixed(1)}s`;
		}
	}

	function expandImage(imageItem: ImageItem) {
		expandedImage = imageItem;
	}

	function closeExpandedImage() {
		expandedImage = null;
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

	const splitter = new Splitter({
		min: 240,
		value: 400,
		max: 1200,
	});
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

		<div class="sidebar-content flex-1 space-y-4 overflow-y-auto p-4">
			<div class="space-y-2">
				<label for="model" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
				<select
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
					id="model"
					bind:value={model}
				>
					{#each data.models.toSorted((a, b) => a.id.localeCompare(b.id)) as model (model)}
						<option value={model}>{model.id}</option>
					{/each}
				</select>
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

		<div class="sidebar-footer space-y-2 border-t border-gray-200 p-4 dark:border-gray-700">
			<button
				class="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl"
				onclick={generateImage}
				aria-label="Generate image using AI"
			>
				<IconBolt class="mr-2 h-4 w-4" />
				Generate
			</button>
			<button
				class="flex w-full items-center justify-center rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-800 transition-all duration-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
			"w-1 cursor-col-resize transition-colors hover:bg-blue-500 dark:hover:bg-blue-400",
			splitter.isResizing ? "bg-blue-500 dark:bg-blue-400" : "bg-gray-300 dark:bg-gray-700",
		]}
		{...splitter.separator}
		{@attach splitter.separator.attach}
		aria-label="Resize sidebar"
	></div>

	<!-- Main content -->
	<main class="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-gray-900">
		{#if images.length === 0}
			<div class="flex h-full items-center justify-center text-gray-500">
				<div class="text-center">
					<IconPhoto class="mx-auto mb-4 h-16 w-16 text-gray-400" />
					<p class="text-lg font-medium">No images generated yet</p>
					<p class="text-sm">Click "Generate" to create your first image</p>
				</div>
			</div>
		{:else}
			<div class="masonry-grid gap-6" style="--columns: {columns};" role="grid" aria-label="Generated images">
				{#each images as imageItem (imageItem.id)}
					{#if imageItem.isLoading}
						<article
							class="masonry-item overflow-hidden rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800"
							aria-label="Generating image: {imageItem.prompt}"
						>
							<div
								class="flex aspect-square items-center justify-center rounded-t-xl border-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700"
								aria-label="Loading image"
							>
								<LoadingAnimation />
							</div>
							<div class="space-y-3 p-4">
								<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Generating: {imageItem.prompt}</div>
								<div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
									<div>Model: {imageItem.model}</div>
									<div>Provider: {imageItem.provider}</div>
									<div>Time: ...</div>
								</div>
								<div class="flex justify-end gap-2">
									<button
										class="flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700"
										onclick={() => deleteImage(imageItem.id)}
										aria-label="Cancel image generation"
									>
										Cancel
									</button>
								</div>
							</div>
						</article>
					{:else if imageItem.blob}
						<article
							class="masonry-item overflow-hidden rounded-xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-800"
						>
							<button
								class="group relative w-full cursor-pointer border-0 bg-transparent p-0"
								onclick={() => expandImage(imageItem)}
								aria-label="Expand image: {imageItem.prompt}"
							>
								<img
									src={URL.createObjectURL(imageItem.blob)}
									alt="Generated image: {imageItem.prompt}"
									class="block h-auto w-full"
								/>
								<div
									class="bg-opacity-0 group-hover:bg-opacity-30 absolute inset-0 flex items-center justify-center bg-black text-white opacity-0 transition-all duration-300 group-hover:opacity-100"
									aria-hidden="true"
								>
									<IconZoomIn class="h-6 w-6" />
								</div>
							</button>
							<div class="space-y-3 p-4">
								<div class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
									<div>Model: {imageItem.model}</div>
									<div>Provider: {imageItem.provider}</div>
									<div>
										Time: {imageItem.generationTimeMs ? formatGenerationTime(imageItem.generationTimeMs) : "Unknown"}
									</div>
								</div>
								<div class="flex justify-end gap-2" role="group" aria-label="Image actions">
									<Tooltip>
										{#snippet trigger(tooltip)}
											<button
												class="flex items-center justify-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition-all duration-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
												onclick={() => reuseSettings(imageItem)}
												aria-label="Reuse settings from this image"
												{...tooltip.trigger}
											>
												<IconRefresh class="h-4 w-4" />
											</button>
										{/snippet}
										Reuse these settings
									</Tooltip>

									<Tooltip>
										{#snippet trigger(tooltip)}
											<button
												class="flex items-center justify-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition-all duration-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
												onclick={() => {
													const url = URL.createObjectURL(imageItem.blob!);
													const a = document.createElement("a");
													a.href = url;
													a.download = `generated-image-${imageItem.id}.png`;
													a.click();
													URL.revokeObjectURL(url);
												}}
												{...tooltip.trigger}
												aria-label="Download image"
											>
												<IconDownload class="h-4 w-4" />
											</button>
										{/snippet}
										Download image
									</Tooltip>

									<Tooltip>
										{#snippet trigger(tooltip)}
											<button
												class="flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700"
												onclick={() => deleteImage(imageItem.id)}
												{...tooltip.trigger}
												aria-label="Delete image"
											>
												<IconTrash class="h-4 w-4" />
											</button>
										{/snippet}
										Delete image
									</Tooltip>
								</div>
							</div>
						</article>
					{/if}
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Image Expansion Modal -->
{#if expandedImage && expandedImage.blob}
	<div
		class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
		onclick={closeExpandedImage}
		onkeydown={e => {
			if (e.key === "Escape") {
				closeExpandedImage();
			}
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="expanded-image-title"
		tabindex="-1"
	>
		<div
			class="relative max-h-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
			role="document"
		>
			<button
				class="bg-opacity-50 hover:bg-opacity-75 absolute top-4 right-4 z-10 rounded-full bg-black p-2 text-white transition-colors"
				onclick={closeExpandedImage}
				aria-label="Close expanded image"
			>
				<IconX class="h-6 w-6" />
			</button>
			<img
				src={URL.createObjectURL(expandedImage.blob)}
				alt="Expanded view: {expandedImage.prompt}"
				class="max-h-[80vh] max-w-full object-contain"
			/>
			<div class="border-t border-gray-200 p-6 dark:border-gray-700">
				<h3 id="expanded-image-title" class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
					{expandedImage.prompt}
				</h3>
				<div class="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
					<span>Model: {expandedImage.model}</span>
					<span>Provider: {expandedImage.provider}</span>
					<span
						>Time: {expandedImage.generationTimeMs
							? formatGenerationTime(expandedImage.generationTimeMs)
							: "Unknown"}</span
					>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.sidebar {
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
	}

	.sidebar-header {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
	}

	.resize-handle {
		transition: background-color 0.2s;
	}

	.resize-handle.resizing {
		background-color: rgb(59 130 246);
	}

	:global(.dark) .resize-handle.resizing {
		background-color: rgb(96 165 250);
	}

	.masonry-grid {
		display: grid;
		grid-template-columns: repeat(var(--columns), 1fr);
		grid-template-rows: masonry;
		align-items: start;
	}

	@supports not (grid-template-rows: masonry) {
		.masonry-grid {
			display: grid;
			grid-template-columns: repeat(var(--columns), 1fr);
			grid-auto-rows: min-content;
			align-items: start;
		}

		.masonry-item {
			break-inside: avoid;
		}
	}

	@supports not (grid-template-rows: masonry) {
		@media (min-width: 768px) {
			.masonry-grid {
				display: block;
				columns: var(--columns);
				column-gap: 1.5rem;
			}

			.masonry-item {
				display: inline-block;
				width: 100%;
				margin-bottom: 1.5rem;
				break-inside: avoid;
			}
		}
	}
</style>

<script lang="ts">
	import { token } from "$lib/state/token.svelte.js";
	import type { InferenceProviderMapping, Model } from "$lib/types.js";
	import ProviderSelect from "$lib/ui/provider-select.svelte";
	import { InferenceClient } from "@huggingface/inference";
	import type { ApiModelsResponse } from "../api/models/+server.js";
	import LoadingAnimation from "./loading-animation.svelte";

	let { data }: { data: ApiModelsResponse } = $props();

	let model: Model = $state(data.models[0]!);
	let provider: InferenceProviderMapping["provider"] = $state(data.models[0]!.inferenceProviderMapping[0]!.provider);
	let prompt = $state("");

	interface ImageItem {
		id: string;
		blob?: Blob;
		isLoading: boolean;
		prompt: string;
	}

	const images = $state<ImageItem[]>([]);

	function generateUniqueId(): string {
		return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	async function generateImage() {
		if (!prompt.trim()) return;

		const imageId = generateUniqueId();
		const currentPrompt = prompt.trim();

		// Add loading item
		images.push({
			id: imageId,
			isLoading: true,
			prompt: currentPrompt,
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

			// Find the image item by ID and update it
			const imageItem = images.find(img => img.id === imageId);
			if (imageItem) {
				imageItem.blob = image;
				imageItem.isLoading = false;
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
		if (!prompt.trim()) return;

		const imageId = generateUniqueId();
		const currentPrompt = prompt.trim();

		// Add loading item
		images.push({
			id: imageId,
			isLoading: true,
			prompt: currentPrompt,
		});

		try {
			// Random delay between 1-4 seconds
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

			// Find the image item by ID and update it
			const imageItem = images.find(img => img.id === imageId);
			if (imageItem) {
				imageItem.blob = imageBlob;
				imageItem.isLoading = false;
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
</script>

<div class="grid h-lvh grid-cols-12 dark:text-white">
	<!-- Sidebar -->
	<div class="col-span-3 flex h-full flex-col gap-2 border-r p-4">
		<div class="flex flex-col">
			<label for="model">Model</label>
			<select class="border" id="model" bind:value={model}>
				{#each data.models.toSorted((a, b) => a.id.localeCompare(b.id)) as model (model)}
					<option value={model}>{model.id}</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-col">
			<ProviderSelect {model} bind:provider />
		</div>
		<div class="flex flex-col">
			<label>
				<p>Prompt</p>
				<textarea class="w-full border" bind:value={prompt}></textarea>
			</label>
		</div>
		<button class="btn" onclick={generateImage}>Generate</button>
		<button class="btn btn-secondary" onclick={mockGenerateImage}>Mock Generate</button>
	</div>

	<!-- Main content -->
	<div class="col-span-9 overflow-auto p-4">
		{#if images.length === 0}
			<div class="flex h-full items-center justify-center text-gray-500">
				<p>No images generated yet. Click "Generate" to create an image.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each images as imageItem (imageItem.id)}
					{#if imageItem.isLoading}
						<div class="flex flex-col gap-2">
							<div class="grid aspect-square place-items-center rounded border border-dashed border-neutral-500">
								<LoadingAnimation />
							</div>
							<div class="flex gap-2">
								<span class="text-sm text-gray-500">Generating: {imageItem.prompt}</span>
								<button class="btn-sm btn-danger ml-auto" onclick={() => deleteImage(imageItem.id)}> Cancel </button>
							</div>
						</div>
					{:else if imageItem.blob}
						<div class="flex flex-col gap-2">
							<img
								src={URL.createObjectURL(imageItem.blob)}
								alt="Generated image: {imageItem.prompt}"
								class="w-full rounded-lg shadow-md"
							/>
							<div class="flex gap-2">
								<button
									class="btn-sm"
									onclick={() => {
										const url = URL.createObjectURL(imageItem.blob!);
										const a = document.createElement("a");
										a.href = url;
										a.download = `generated-image-${imageItem.id}.png`;
										a.click();
										URL.revokeObjectURL(url);
									}}
								>
									Download
								</button>
								<button class="btn-sm btn-danger" onclick={() => deleteImage(imageItem.id)}> Delete </button>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

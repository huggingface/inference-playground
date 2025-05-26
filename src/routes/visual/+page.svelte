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

	const images = $state<(Blob | "loading")[]>([]);

	async function generateImage() {
		if (!prompt.trim()) return;

		const loadingIndex = images.length;
		images.push("loading");

		try {
			const client = new InferenceClient(token.value);

			const image = (await client.textToImage({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				provider: provider as any,
				model: model.id,
				inputs: prompt,
				parameters: { num_inference_steps: 4 },
			})) as unknown as Blob;

			images[loadingIndex] = image;
		} catch (error) {
			// Remove the loading placeholder on error
			images.splice(loadingIndex, 1);
			console.error("Image generation failed:", error);
		}
	}

	$inspect(images);
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
	</div>

	<!-- Main content -->
	<div class="col-span-9 overflow-auto p-4">
		{#if images.length === 0}
			<div class="flex h-full items-center justify-center text-gray-500">
				<p>No images generated yet. Click "Generate" to create an image.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each images as image, index (index)}
					{#if image === "loading"}
						<LoadingAnimation />
					{:else}
						<div class="flex flex-col gap-2">
							<img
								src={URL.createObjectURL(image)}
								alt="Generated image {index + 1}"
								class="w-full rounded-lg shadow-md"
							/>
							<div class="flex gap-2">
								<button
									class="btn btn-sm"
									onclick={() => {
										const url = URL.createObjectURL(image);
										const a = document.createElement("a");
										a.href = url;
										a.download = `generated-image-${index + 1}.png`;
										a.click();
										URL.revokeObjectURL(url);
									}}
								>
									Download
								</button>
								<button
									class="btn btn-sm btn-danger"
									onclick={() => {
										images.splice(index, 1);
									}}
								>
									Delete
								</button>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

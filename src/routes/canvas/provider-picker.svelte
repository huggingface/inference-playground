<script lang="ts">
	import { models } from "$lib/state/models.svelte.js";
	import { pricing } from "$lib/state/pricing.svelte.js";
	import { isHFModel } from "$lib/types.js";
	import { Select } from "melt/builders";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconProvider from "../../lib/components/icon-provider.svelte";

	interface Props {
		provider?: string;
		modelId?: string;
		onProviderSelect?: (provider: string) => void;
	}

	let { provider = "auto", modelId, onProviderSelect }: Props = $props();

	const selectedModel = $derived.by(() => {
		if (!modelId) return undefined;
		return models.all.find(m => m.id === modelId);
	});

	const availableProviders = $derived.by(() => {
		if (!selectedModel || !isHFModel(selectedModel)) return [{ provider: "auto", providerId: "auto" }];
		if (!selectedModel.inferenceProviderMapping) return [{ provider: "auto", providerId: "auto" }];
		return [...selectedModel.inferenceProviderMapping, { provider: "auto", providerId: "auto" }];
	});

	const select = new Select<string, false>({
		value: () => provider,
		onValueChange(newProvider) {
			if (!newProvider) return;
			onProviderSelect?.(newProvider);
		},
	});

	const nameMap: Record<string, string> = {
		"sambanova": "SambaNova",
		"fal": "fal",
		"cerebras": "Cerebras",
		"replicate": "Replicate",
		"black-forest-labs": "Black Forest Labs",
		"fireworks-ai": "Fireworks",
		"together": "Together AI",
		"nebius": "Nebius AI Studio",
		"hyperbolic": "Hyperbolic",
		"novita": "Novita",
		"cohere": "Cohere",
		"hf-inference": "HF Inference API",
	};

	const UPPERCASE_WORDS = ["hf", "ai"];

	function formatName(provider: string) {
		if (provider in nameMap) return nameMap[provider];

		const words = provider
			.toLowerCase()
			.split("-")
			.map(word => {
				if (UPPERCASE_WORDS.includes(word)) {
					return word.toUpperCase();
				} else {
					return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
				}
			});

		return words.join(" ");
	}

	function getProviderName(provider: string) {
		if (provider in nameMap) return formatName(provider);
		return provider === "auto" ? "Auto" : provider;
	}

	function getProviderPricing(provider: string) {
		if (provider === "auto" || !selectedModel) return null;
		const pd = pricing.getPricing(selectedModel.id, provider);
		return pricing.formatPricing(pd);
	}
</script>

{#snippet providerDisplay(providerValue: string)}
	{@const providerPricing = getProviderPricing(providerValue)}
	<div class="flex flex-col items-start gap-0.5">
		<div class="flex items-center gap-2 text-sm text-gray-900">
			<IconProvider provider={providerValue} />
			<span>{getProviderName(providerValue)}</span>
		</div>
		{#if providerPricing}
			<span class="text-xs text-gray-500">
				In: {providerPricing.input} • Out: {providerPricing.output}
			</span>
		{/if}
	</div>
{/snippet}

<div class="relative w-full">
	<label class="block space-y-1.5 text-xs font-medium text-gray-600">
		<p>Provider</p>

		<button
			{...select.trigger}
			class="relative flex w-full items-center justify-between gap-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-tight whitespace-nowrap shadow-sm transition-colors hover:bg-gray-100 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
		>
			{@render providerDisplay(provider)}
			<div class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs">
				<IconCaret />
			</div>
		</button>
	</label>

	<div
		{...select.content}
		class="absolute z-50 mt-1 hidden w-full !min-w-[300px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg data-[open]:block"
	>
		{#snippet option(providerValue: string)}
			<div {...select.getOption(providerValue)} class="group block w-full p-1 text-sm">
				<div class="rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-100">
					{@render providerDisplay(providerValue)}
				</div>
			</div>
		{/snippet}

		{#each availableProviders as { provider: providerValue } (providerValue)}
			{@render option(providerValue)}
		{/each}
	</div>
</div>

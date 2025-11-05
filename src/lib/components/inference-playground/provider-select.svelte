<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte";
	import { pricing } from "$lib/state/pricing.svelte";
	import type { Model } from "$lib/types.js";
	import { cn } from "$lib/utils/cn.js";
	import { Select } from "melt/builders";
	import { run } from "svelte/legacy";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconProvider from "../icon-provider.svelte";
	import Tooltip from "../tooltip.svelte";
	import IconInfo from "~icons/carbon/information";

	interface Props {
		conversation: ConversationClass & { model: Model };
		class?: string | undefined;
	}

	const { conversation, class: classes = undefined }: Props = $props();

	function reset(providers: typeof conversation.model.inferenceProviderMapping) {
		const validProvider = providers.find(p => p.provider === conversation.data.provider);
		if (validProvider || conversation.data.provider === "auto") return;
		// Default to auto provider if no valid provider is set
		conversation.update({ provider: "auto", autoPolicy: "default" });
	}

	let providers = $derived(conversation.model.inferenceProviderMapping);
	run(() => {
		reset(providers);
	});

	const select = new Select<string, false>({
		value: () => conversation.data.provider,
		onValueChange(v) {
			conversation.update({ provider: v });
		},
	});

	const autoPolicySelect = new Select<"default" | "fastest" | "cheapest", false>({
		value: () => conversation.data.autoPolicy ?? "default",
		onValueChange(v) {
			conversation.update({ autoPolicy: v });
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
		if (provider === "auto") return null;
		const pd = pricing.getPricing(conversation.model.id, provider);
		return pricing.formatPricing(pd);
	}

	function getAutoPolicyLabel(policy: "default" | "fastest" | "cheapest") {
		switch (policy) {
			case "default":
				return "Default";
			case "fastest":
				return "Fastest";
			case "cheapest":
				return "Cheapest";
		}
	}

	function getAutoPolicyDescription(policy: "default" | "fastest" | "cheapest") {
		switch (policy) {
			case "default":
				return "Uses your preference order from Inference Provider settings";
			case "fastest":
				return "Selects the provider with highest throughput";
			case "cheapest":
				return "Selects the provider with lowest price per output token";
		}
	}
</script>

{#snippet providerDisplay(provider: string)}
	{@const providerPricing = getProviderPricing(provider)}
	<div class="flex flex-col items-start gap-0.5">
		<div class="flex items-center gap-2 text-sm">
			<IconProvider {provider} />
			<span>{getProviderName(provider) ?? "loading"}</span>
		</div>
		{#if providerPricing}
			<span class="text-xs text-gray-500 dark:text-gray-400">
				In: {providerPricing.input} • Out: {providerPricing.output}
			</span>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-2">
	<button
		{...select.trigger}
		class={cn(
			"relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
			"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110",
			classes,
		)}
	>
		{@render providerDisplay(conversation.data.provider ?? "")}
		<div
			class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
		>
			<IconCaret />
		</div>
	</button>

	<div {...select.content} class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
		{#snippet option(provider: string)}
			<div {...select.getOption(provider)} class="group block w-full p-1 text-sm dark:text-white">
				<div
					class="rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
				>
					{@render providerDisplay(provider)}
				</div>
			</div>
		{/snippet}
		{#each conversation.model.inferenceProviderMapping as { provider, providerId } (provider + providerId)}
			{@render option(provider)}
		{/each}
		{@render option("auto")}
	</div>

	{#if conversation.data.provider === "auto"}
		<div class="flex flex-col gap-1.5">
			<div class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
				<span>Auto Policy</span>
				<Tooltip>
					{#snippet trigger(tooltip)}
						<button class="flex items-center" {...tooltip.trigger}>
							<IconInfo class="size-3" />
						</button>
					{/snippet}
					{getAutoPolicyDescription(conversation.data.autoPolicy ?? "default")}
				</Tooltip>
			</div>
			<button
				{...autoPolicySelect.trigger}
				class={cn(
					"relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 text-sm leading-tight whitespace-nowrap shadow-sm",
					"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110",
				)}
			>
				{getAutoPolicyLabel(conversation.data.autoPolicy ?? "default")}
				<div
					class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
				>
					<IconCaret />
				</div>
			</button>

			<div {...autoPolicySelect.content} class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
				{#snippet policyOption(policy: "default" | "fastest" | "cheapest", label: string)}
					<div {...autoPolicySelect.getOption(policy)} class="group block w-full p-1 text-sm dark:text-white">
						<div
							class="rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
						>
							<div class="flex flex-col items-start gap-0.5">
								<span>{label}</span>
								<span class="text-xs text-gray-500 dark:text-gray-400">
									{getAutoPolicyDescription(policy)}
								</span>
							</div>
						</div>
					</div>
				{/snippet}
				{@render policyOption("default", "Default")}
				{@render policyOption("fastest", "Fastest")}
				{@render policyOption("cheapest", "Cheapest")}
			</div>
		</div>
	{/if}
</div>

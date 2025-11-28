<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte";
	import { pricing } from "$lib/state/pricing.svelte";
	import type { AutoPolicy, Model } from "$lib/types.js";
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
		compact?: boolean;
	}

	const { conversation, class: classes = undefined, compact = false }: Props = $props();

	function reset(providers: typeof conversation.model.inferenceProviderMapping) {
		const validProvider = providers.find(p => p.provider === conversation.data.provider);
		if (validProvider || conversation.data.provider === "auto") return;
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
		sameWidth: false,
		floatingConfig: {
			computePosition: {
				placement: "bottom-start",
			},
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
			.map(word =>
				UPPERCASE_WORDS.includes(word)
					? word.toUpperCase()
					: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
			);
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

	const autoPolicyLabels: Record<AutoPolicy, string> = {
		default: "Default",
		fastest: "Fastest",
		cheapest: "Cheapest",
	};

	const autoPolicyDescriptions: Record<AutoPolicy, string> = {
		default: "Uses your preference order from Inference Provider settings",
		fastest: "Selects the provider with highest throughput",
		cheapest: "Selects the provider with lowest price per output token",
	};

	const autoPolicyValue = $derived(conversation.data.autoPolicy ?? "default");

	const autoPolicySelect = new Select<AutoPolicy, false>({
		value: () => autoPolicyValue,
		onValueChange(v) {
			conversation.update({ autoPolicy: v });
		},
		sameWidth: false,
		floatingConfig: {
			computePosition: {
				placement: "bottom-start",
			},
		},
	});

	// Shared button styles
	const triggerClass = cn(
		"focus-outline relative flex items-center justify-between overflow-hidden rounded-lg border",
		"bg-gray-100/80 px-3 py-1.5 text-sm leading-tight whitespace-nowrap shadow-sm",
		"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110",
	);

	const dropdownClass = "z-50 rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800";
</script>

{#snippet providerOption(provider: string, showPricing: boolean = true)}
	{@const providerPricing = getProviderPricing(provider)}
	<div {...select.getOption(provider)} class="group block w-full p-1 text-sm dark:text-white">
		<div class="rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700">
			<div class="flex items-center gap-2">
				<IconProvider {provider} />
				<span>{getProviderName(provider)}</span>
			</div>
			{#if showPricing && providerPricing}
				<span class="text-xs text-gray-500 dark:text-gray-400">
					In: {providerPricing.input} • Out: {providerPricing.output}
				</span>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet policyOption(policy: AutoPolicy)}
	<div {...autoPolicySelect.getOption(policy)} class="group block w-full p-1 text-sm dark:text-white">
		<div class="rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700">
			<span>{autoPolicyLabels[policy]}</span>
			<span class="block text-xs text-gray-500 dark:text-gray-400">{autoPolicyDescriptions[policy]}</span>
		</div>
	</div>
{/snippet}

{#if compact}
	<!-- Compact mode: provider and auto-policy side by side, filling width -->
	<div class="flex items-center gap-2">
		<button {...select.trigger} class={cn(triggerClass, "flex-1", classes)}>
			<div class="flex items-center gap-1.5">
				<IconProvider provider={conversation.data.provider ?? ""} />
				<span>{getProviderName(conversation.data.provider ?? "")}</span>
			</div>
			<IconCaret class="size-4 flex-none text-gray-500" />
		</button>

		<div {...select.content} class={dropdownClass}>
			{#each conversation.model.inferenceProviderMapping as { provider, providerId } (provider + providerId)}
				{@render providerOption(provider)}
			{/each}
			{@render providerOption("auto")}
		</div>

		{#if conversation.data.provider === "auto"}
			<Tooltip>
				{#snippet trigger(tooltip)}
					<button {...autoPolicySelect.trigger} class={cn(triggerClass, "flex-1")} {...tooltip.trigger}>
						<span>{autoPolicyLabels[autoPolicyValue]}</span>
						<IconCaret class="size-4 flex-none text-gray-500" />
					</button>
				{/snippet}
				{autoPolicyDescriptions[autoPolicyValue]}
			</Tooltip>

			<div {...autoPolicySelect.content} class={dropdownClass}>
				{@render policyOption("default")}
				{@render policyOption("fastest")}
				{@render policyOption("cheapest")}
			</div>
		{/if}
	</div>
{:else}
	<!-- Full mode for settings panel -->
	<div class="flex flex-col gap-2">
		<button {...select.trigger} class={cn(triggerClass, classes)}>
			<div class="flex items-center gap-2">
				<IconProvider provider={conversation.data.provider ?? ""} />
				<span>{getProviderName(conversation.data.provider ?? "")}</span>
			</div>
			<IconCaret class="size-4 flex-none text-gray-500" />
		</button>

		<div {...select.content} class={dropdownClass}>
			{#each conversation.model.inferenceProviderMapping as { provider, providerId } (provider + providerId)}
				{@render providerOption(provider)}
			{/each}
			{@render providerOption("auto")}
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
						{autoPolicyDescriptions[autoPolicyValue]}
					</Tooltip>
				</div>
				<button {...autoPolicySelect.trigger} class={triggerClass}>
					<span>{autoPolicyLabels[autoPolicyValue]}</span>
					<IconCaret class="size-4 flex-none text-gray-500" />
				</button>

				<div {...autoPolicySelect.content} class={dropdownClass}>
					{@render policyOption("default")}
					{@render policyOption("fastest")}
					{@render policyOption("cheapest")}
				</div>
			</div>
		{/if}
	</div>
{/if}

<script lang="ts">
	import { run } from "svelte/legacy";

	import type { ConversationWithHFModel } from "$lib/types.js";

	import { randomPick } from "$lib/utils/array.js";
	import { cn } from "$lib/utils/cn.js";
	import { Select } from "melt/builders";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconProvider from "../icon-provider.svelte";

	interface Props {
		conversation: ConversationWithHFModel;
		class?: string | undefined;
	}

	let { conversation = $bindable(), class: classes = undefined }: Props = $props();

	function reset(providers: typeof conversation.model.inferenceProviderMapping) {
		const validProvider = providers.find(p => p.provider === conversation.provider);
		if (validProvider) return;
		conversation.provider = randomPick(providers)?.provider;
	}

	let providers = $derived(conversation.model.inferenceProviderMapping);
	run(() => {
		reset(providers);
	});

	const select = new Select<string, false>({
		value: () => conversation.provider,
		onValueChange(v) {
			conversation.provider = v;
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
</script>

<div class="flex flex-col gap-2">
	<!--
	<label class="flex items-baseline gap-2 text-sm font-medium text-gray-900 dark:text-white">
		Providers<span class="text-xs font-normal text-gray-400"></span>
	</label>
	-->

	<button
		{...select.trigger}
		class={cn(
			"relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
			"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110",
			classes
		)}
	>
		<div class="flex items-center gap-1 text-sm">
			<IconProvider provider={conversation.provider} />
			{formatName(conversation.provider ?? "") ?? "loading"}
		</div>
		<div
			class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
		>
			<IconCaret />
		</div>
	</button>

	<div {...select.content} class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
		{#each conversation.model.inferenceProviderMapping as { provider, providerId } (provider + providerId)}
			<div {...select.getOption(provider)} class="group block w-full p-1 text-sm dark:text-white">
				<div
					class="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
				>
					<IconProvider {provider} />
					{formatName(provider)}
				</div>
			</div>
		{/each}
	</div>
</div>

<script lang="ts">
	import { randomPick } from "$lib/utils/array.js";
	import { cn } from "$lib/utils/cn.js";
	import { INFERENCE_PROVIDERS, type InferenceProvider } from "@huggingface/inference";
	import { Select } from "melt/builders";
	import { onMount } from "svelte";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconProvider from "../icon-provider.svelte";

	const providers = [...INFERENCE_PROVIDERS];

	interface Props {
		provider?: InferenceProvider;
		class?: string;
	}

	let { provider = $bindable(), class: classes = undefined }: Props = $props();

	function reset() {
		if (provider !== undefined) return;
		provider = randomPick(providers);
	}

	onMount(reset);

	const select = new Select<InferenceProvider, false>({
		value: () => provider,
		onValueChange(v) {
			provider = v;
		},
	});

	const nameMap: Record<InferenceProvider, string> = {
		"sambanova": "SambaNova",
		"fal-ai": "fal",
		"cerebras": "Cerebras",
		"replicate": "Replicate",
		"black-forest-labs": "Black Forest Labs",
		"fireworks-ai": "Fireworks",
		"together": "Together AI",
		"nebius": "Nebius AI Studio",
		"hyperbolic": "Hyperbolic",
		"novita": "Novita",
		"cohere": "Nohere",
		"hf-inference": "HF Inference API",
		"openai": "OpenAI Compatible",
	};
	const UPPERCASE_WORDS = ["hf", "ai"];

	function formatName(provider: InferenceProvider) {
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

<button
	{...select.trigger}
	class={cn(
		"focus-outline relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
		"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110",
		select.open && "!custom-outline",
		classes
	)}
	type="button"
>
	<div class="flex items-center gap-1 text-sm">
		<IconProvider {provider} />
		{provider && formatName(provider)}
	</div>
	<div
		class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
	>
		<IconCaret />
	</div>
</button>

<div {...select.content} class="rounded-lg border bg-gray-100 outline-hidden dark:border-gray-700 dark:bg-gray-800">
	{#each providers as p}
		<button {...select.getOption(p)} class="group block w-full p-1 text-sm dark:text-white" type="button">
			<div
				class="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
			>
				<IconProvider provider={p} />
				{formatName(p)}
			</div>
		</button>
	{/each}
</div>

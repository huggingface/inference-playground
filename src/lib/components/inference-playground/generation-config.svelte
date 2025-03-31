<script lang="ts">
	import type { Conversation } from "$lib/types.js";

	import { GENERATION_CONFIG_KEYS, GENERATION_CONFIG_SETTINGS } from "./generation-config-settings.js";
	import { customMaxTokens } from "./utils.js";

	interface Props {
		conversation: Conversation;
		classNames?: string;
	}

	let { conversation = $bindable(), classNames = "" }: Props = $props();

	let modelMaxLength = $derived(customMaxTokens[conversation.model.id] ?? 100000);
	let maxTokens = $derived(Math.min(modelMaxLength ?? GENERATION_CONFIG_SETTINGS["max_tokens"].max, 64_000));
</script>

<div class="flex flex-col gap-y-7 {classNames}">
	{#each GENERATION_CONFIG_KEYS as key}
		{@const { label, min, step } = GENERATION_CONFIG_SETTINGS[key]}
		{@const max = key === "max_tokens" ? maxTokens : GENERATION_CONFIG_SETTINGS[key].max}
		<div>
			<div class="flex items-center justify-between">
				<label for="temperature-range" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
					>{label}</label
				>
				<input
					type="number"
					class="w-18 rounded-sm border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
					{min}
					{max}
					{step}
					bind:value={conversation.config[key]}
				/>
			</div>
			<input
				id="temperature-range"
				type="range"
				{min}
				{max}
				{step}
				bind:value={conversation.config[key]}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
			/>
		</div>
	{/each}

	<div class="mt-2">
		<label class="flex cursor-pointer items-center justify-between">
			<input type="checkbox" bind:checked={conversation.streaming} class="peer sr-only" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Streaming</span>
			<div
				class="peer relative h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-black peer-focus:outline-hidden after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
			></div>
		</label>
	</div>
</div>

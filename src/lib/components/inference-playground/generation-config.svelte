<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte.js";
	import { isNumber } from "$lib/utils/is.js";
	import { watch } from "runed";
	import IconX from "~icons/carbon/close";
	import { GENERATION_CONFIG_KEYS, GENERATION_CONFIG_SETTINGS } from "./generation-config-settings.js";
	import StructuredOutputModal from "./structured-output-modal.svelte";
	import { maxAllowedTokens } from "./utils.svelte.js";

	interface Props {
		conversation: ConversationClass;
		classNames?: string;
	}

	const { conversation, classNames = "" }: Props = $props();

	const maxTokens = $derived(maxAllowedTokens(conversation));

	watch(
		() => maxTokens,
		() => {
			const curr = conversation.data.config.max_tokens;
			if (!curr || curr <= maxTokens) return;
			conversation.update({
				config: {
					...conversation.data.config,
					max_tokens: maxTokens,
				},
			});
		}
	);

	type Config = (typeof conversation)["data"]["config"];
	function updateConfigKey<K extends keyof Config>(k: K, v: Config[K]) {
		conversation.update({
			...conversation.data,
			config: {
				...conversation.data.config,
				[k]: v,
			},
		});
	}

	let editingStructuredOutput = $state(false);
</script>

<div class="flex flex-col gap-y-7 {classNames}">
	{#each GENERATION_CONFIG_KEYS as key}
		{@const { label, min, step } = GENERATION_CONFIG_SETTINGS[key]}
		{@const isMaxTokens = key === "max_tokens"}
		{@const max = isMaxTokens ? maxTokens : GENERATION_CONFIG_SETTINGS[key].max}

		<div>
			<div class="flex items-center justify-between">
				<label for={key} class="mb-0.5 block text-sm font-medium text-gray-900 dark:text-white">
					{label}
				</label>
				<div class="flex items-center gap-2">
					{#if !isMaxTokens || isNumber(conversation.data.config[key])}
						<input
							type="number"
							class="w-20 rounded-sm border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
							{min}
							{max}
							{step}
							bind:value={() => conversation.data.config[key], v => updateConfigKey(key, v)}
						/>
					{/if}
					{#if isMaxTokens && isNumber(conversation.data.config[key])}
						<button class="btn-mini" onclick={() => updateConfigKey(key, undefined)}> <IconX /> </button>
					{:else if isMaxTokens}
						<button class="btn-mini" onclick={() => updateConfigKey(key, maxTokens / 2)}> set </button>
					{/if}
				</div>
			</div>
			{#if !isMaxTokens || isNumber(conversation.data.config[key])}
				<input
					id={key}
					type="range"
					{min}
					{max}
					{step}
					bind:value={() => conversation.data.config[key], v => updateConfigKey(key, v)}
					class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
				/>
			{/if}
		</div>
	{/each}

	<label class="mt-2 flex cursor-pointer items-center justify-between">
		<input
			type="checkbox"
			bind:checked={() => conversation.data.streaming, v => conversation.update({ streaming: v })}
			class="peer sr-only"
		/>
		<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Streaming</span>
		<div
			class="peer relative h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-black peer-focus:outline-hidden after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
		></div>
	</label>

	<label class="mt-2 flex cursor-pointer items-center justify-between" for="structured-output">
		<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Structured Output</span>
		<div class="flex items-center gap-2">
			<input
				type="checkbox"
				bind:checked={
					() => conversation.data.structuredOutput?.enabled,
					v => conversation.update({ structuredOutput: { ...conversation.data.structuredOutput, enabled: v ?? false } })
				}
				class="peer sr-only"
				id="structured-output"
			/>
			<button class="btn-mini" type="button" onclick={() => (editingStructuredOutput = true)}> edit </button>
			<div
				class="peer relative h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-black peer-focus:outline-hidden after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
			></div>
		</div>
	</label>
</div>

<StructuredOutputModal {conversation} bind:open={editingStructuredOutput} />

<script lang="ts">
	import { isConversationWithHFModel, type Conversation, type Model } from "$lib/types.js";

	import { createEventDispatcher } from "svelte";

	import { models } from "$lib/state/models.svelte.js";
	import IconCog from "~icons/carbon/settings";
	import Avatar from "../avatar.svelte";
	import GenerationConfig from "./generation-config.svelte";
	import ModelSelectorModal from "./model-selector-modal.svelte";
	import ProviderSelect from "./provider-select.svelte";

	interface Props {
		conversation: Conversation;
		conversationIdx: number;
	}

	let { conversation = $bindable(), conversationIdx }: Props = $props();

	const dispatch = createEventDispatcher<{ close: string }>();

	let modelSelectorOpen = $state(false);

	function changeModel(newModelId: Model["id"]) {
		const model = models.all.find(m => m.id === newModelId);
		if (!model) {
			return;
		}
		conversation.model = model;
		conversation.provider = undefined;
	}

	let nameSpace = $derived(conversation.model.id.split("/")[0] ?? "");
</script>

{#if modelSelectorOpen}
	<ModelSelectorModal {conversation} onModelSelect={changeModel} onClose={() => (modelSelectorOpen = false)} />
{/if}

<div
	class="{conversationIdx === 0
		? 'mr-4 max-sm:ml-4'
		: 'mx-4'} flex h-11 flex-none items-center gap-2 rounded-lg border border-gray-200/80 bg-white pr-2 pl-3 text-sm leading-none whitespace-nowrap shadow-xs *:flex-none max-sm:mt-4 dark:border-white/5 dark:bg-gray-800/70 dark:hover:bg-gray-800"
>
	<Avatar model={conversation.model} orgName={nameSpace} size="md" />
	<button
		class="focus-outline flex-1! self-stretch text-left hover:underline"
		onclick={() => (modelSelectorOpen = true)}>{conversation.model.id}</button
	>
	<button
		class="borderdark:border-white/5 flex size-6 items-center justify-center rounded-sm bg-gray-50 text-xs hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
		onclick={() => dispatch("close", conversation.model.id)}
	>
		✕
	</button>
	<button
		class="borderdark:border-white/5 group relative flex size-6 items-center justify-center rounded-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
	>
		<IconCog />
		<GenerationConfig
			bind:conversation
			classNames="absolute top-7 min-w-[250px] z-10 right-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hidden group-focus:flex hover:flex"
		/>
	</button>
</div>

{#if isConversationWithHFModel(conversation)}
	<div
		class="{conversationIdx === 0
			? 'mr-4 max-sm:ml-4'
			: 'mx-4'}  mt-2 h-11 text-sm leading-none whitespace-nowrap max-sm:mt-4"
	>
		<ProviderSelect
			bind:conversation
			class="rounded-lg border border-gray-200/80 bg-white dark:border-white/5 dark:bg-gray-800/70 dark:hover:bg-gray-800"
		/>
	</div>
{/if}

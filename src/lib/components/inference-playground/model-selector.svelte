<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte";
	import { models } from "$lib/state/models.svelte.js";
	import { isCustomModel, isHFModel, type Model } from "$lib/types.js";
	import IconCaret from "~icons/carbon/chevron-down";
	import Avatar from "../avatar.svelte";
	import ModelSelectorModal from "./model-selector-modal.svelte";
	import ProviderSelect from "./provider-select.svelte";
	import { defaultSystemMessage } from "./utils.svelte.js";

	interface Props {
		conversation: ConversationClass;
	}

	const { conversation }: Props = $props();

	let showModelPickerModal = $state(false);

	// Model
	function changeModel(modelId: Model["id"]) {
		const model = models.all.find(m => m.id === modelId);
		if (!model) {
			return;
		}
		conversation.update({
			modelId: model.id,
			systemMessage: { role: "system", content: defaultSystemMessage?.[modelId] ?? "" },
			provider: undefined,
		});
	}

	const model = $derived(conversation.model);
	const isCustom = $derived(isCustomModel(model));
	const nameSpace = $derived(isCustom ? "Custom endpoint" : (model.id.split("/")[0] ?? ""));
	const modelName = $derived(isCustom ? model.id : (model.id.split("/")[1] ?? ""));
	const id = $props.id();
</script>

<div class="flex flex-col gap-2">
	<label for={id} class="flex items-baseline gap-2 text-sm font-medium text-gray-900 dark:text-white">
		Models<span class="text-xs font-normal text-gray-400">{models.all.length}</span>
	</label>
	<button
		{id}
		class="focus-outline relative flex items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110"
		onclick={() => (showModelPickerModal = true)}
	>
		<div class="overflow-hidden text-start">
			<div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300">
				<Avatar model={conversation.model} orgName={nameSpace} size="sm" />
				{nameSpace}
			</div>
			<div class="truncate">{modelName}</div>
		</div>
		<div
			class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
		>
			<IconCaret />
		</div>
	</button>
</div>

{#if showModelPickerModal}
	<ModelSelectorModal {conversation} onModelSelect={changeModel} onClose={() => (showModelPickerModal = false)} />
{/if}

{#if isHFModel(conversation.model)}
	<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
	<ProviderSelect conversation={conversation as any} />
{/if}

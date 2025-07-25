<script lang="ts" module>
	let open = $state(true); // TODO: revert to false

	export function openExtraParamsModal() {
		open = true;
	}
</script>

<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte.js";
	import { entries, omit } from "$lib/utils/object.svelte";
	import { onchange } from "$lib/utils/template";
	import Dialog from "../dialog.svelte";
	import IconX from "~icons/carbon/close";
	import InfoPopover from "../info-popover.svelte";

	interface Props {
		conversation: ConversationClass;
	}

	let { conversation }: Props = $props();

	function updateParamKey(prevKey: string) {
		return (newKey: string) => {
			conversation.update({
				extraParams: {
					...omit(conversation.data.extraParams ?? {}, prevKey),
					[newKey]: conversation.data.extraParams?.[prevKey] ?? "",
				},
			});
		};
	}

	function updateParamValue(key: string) {
		return (newValue: string) => {
			conversation.update({
				extraParams: {
					...omit(conversation.data.extraParams ?? {}, key),
					[key]: newValue,
				},
			});
		};
	}
</script>

<Dialog class="!w-2xl max-w-[90vw]" title="Edit Extra Parameters" {open} onClose={() => (open = false)}>
	<div class="flex items-center gap-2">
		<h2 class="font-semibold">Parameters</h2>
		<InfoPopover content="These parameters are passed as JSON parameters, as is." />
		<button
			type="button"
			class="btn-sm ml-auto flex items-center justify-center rounded-md"
			onclick={() => {
				const prevLength = Object.keys(conversation.data.extraParams ?? {}).length ?? 0;
				conversation.update({
					extraParams: {
						...conversation.data.extraParams,
						[`newParam${prevLength + 1}`]: "",
					},
				});
			}}
		>
			Add parameter
		</button>
	</div>

	<div class="mt-4 flex flex-col gap-4">
		{#each entries(conversation.data.extraParams ?? {}) as [key, value]}
			<div class="flex items-end gap-2">
				<label class="flex grow flex-col gap-1">
					<p class="text-xs font-medium text-gray-500 dark:text-gray-400">Key</p>
					<input
						type="text"
						class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						value={key}
						{...onchange(updateParamKey(key))}
					/>
				</label>
				<label class="flex grow flex-col gap-1">
					<p class="text-xs font-medium text-gray-500 dark:text-gray-400">Value</p>
					<input
						type="text"
						class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						{value}
						{...onchange(updateParamValue(key))}
					/>
				</label>
				<button
					type="button"
					class="btn-xs rounded-md text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
					onclick={() => {
						conversation.update({ extraParams: { ...conversation.data.extraParams, [key]: "" } });
					}}
				>
					<IconX />
				</button>
			</div>
		{:else}
			<p class="text-sm text-gray-500">No parameters defined yet.</p>
		{/each}
	</div>

	{#snippet footer()}
		<button class="btn ml-auto" onclick={() => (open = false)}> Save </button>
	{/snippet}
</Dialog>

<script lang="ts" module>
	let open = $state(false);

	export function openExtraParamsModal() {
		open = true;
	}
</script>

<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte.js";
	import { Form } from "$lib/utils/form.svelte";
	import { entries, omit, unmutableSet } from "$lib/utils/object.svelte";
	import { onchange } from "$lib/utils/template.js";
	import IconX from "~icons/carbon/close";
	import Dialog from "../dialog.svelte";
	import InfoPopover from "../info-popover.svelte";

	interface Props {
		conversation: ConversationClass;
	}

	let { conversation }: Props = $props();

	function updateParamKey(prevKey: string) {
		return (newKey: string) => {
			if (!newKey) {
				conversation.update({
					extraParams: {
						...omit(conversation.data.extraParams ?? {}, prevKey),
					},
				});
				return;
			}

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
				extraParams: unmutableSet(conversation.data.extraParams ?? {}, key, newValue),
			});
		};
	}

	function deleteParam(key: string) {
		conversation.update({
			extraParams: omit(conversation.data.extraParams ?? {}, key),
		});
	}

	function validateParamValue(v: string) {
		if (!v) return "Value cannot be empty";
		try {
			JSON.parse(v);
		} catch {
			return "Value is not valid JSON";
		}
	}

	const form = new Form();

	async function close() {
		if (!form.valid) return;
		open = false;
	}
</script>

<Dialog class="!w-2xl max-w-[90vw]" title="Edit Extra Parameters" {open} onClose={close}>
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
			{@const field = form.field({ name: key, validate: validateParamValue })}
			<div class="flex items-start gap-2">
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
						class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						{value}
						{...onchange(updateParamValue(key))}
						{...field.attrs}
					/>
					{#if field.msg}
						<p class="text-xs text-red-500">{field.msg}</p>
					{/if}
				</label>
				<button
					type="button"
					class="btn-xs mt-5 rounded-md text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
					onclick={() => deleteParam(key)}
				>
					<IconX />
				</button>
			</div>
		{:else}
			<p class="text-sm text-gray-500">No parameters defined yet.</p>
		{/each}
	</div>

	{#snippet footer()}
		<button class="btn ml-auto" onclick={close}> Save </button>
	{/snippet}
</Dialog>

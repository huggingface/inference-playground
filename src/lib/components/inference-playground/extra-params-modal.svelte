<script lang="ts" module>
	let open = $state(false);

	export function openExtraParamsModal() {
		open = true;
	}
</script>

<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte.js";
	import { createFieldValidation } from "$lib/utils/form.svelte";
	import { deleteKey, entries, renameKey } from "$lib/utils/object.svelte";
	import { onchange } from "$lib/utils/template.js";
	import IconX from "~icons/carbon/close";
	import Dialog from "../dialog.svelte";
	import InfoPopover from "../info-popover.svelte";
	import { watch } from "runed";

	interface Props {
		conversation: ConversationClass;
	}

	let { conversation }: Props = $props();

	type Field = {
		value: string;
	} & ReturnType<typeof createFieldValidation>;

	let fields = $state<Record<string, Field>>({});

	watch(
		() => open,
		() => {
			if (!open) return;
			// Sync with conversation.extraParams
			fields = Object.fromEntries(
				entries(conversation.data.extraParams ?? {}).map(([key, value]) => [
					key,
					Object.assign(createFieldValidation({ validate: validateParamValue }), { value }),
				]),
			);
		},
	);

	function validateParamValue(v: string) {
		if (!v) return "Value cannot be empty";
		try {
			JSON.parse(v);
		} catch {
			return "Value is not valid JSON";
		}
	}

	async function close() {
		fields = {};
		open = false;
	}

	async function save() {
		Object.values(fields).forEach(f => f.validate());
		if (!Object.values(fields).every(f => f.valid)) return;
		open = false;
		// Set conversation.extraParams
		conversation.update({
			extraParams: Object.fromEntries(entries(fields).map(([key, field]) => [key, field.value])),
		});
	}
</script>

<Dialog
	class="!w-2xl max-w-[90vw]"
	title="Edit Extra Parameters"
	{open}
	onClose={() => {
		close();
	}}
	onSubmit={e => {
		e.preventDefault();
	}}
>
	<div class="flex items-center gap-2">
		<h2 class="font-semibold">Parameters</h2>
		<InfoPopover content="These parameters are passed as JSON parameters, as is." />
		<button
			type="button"
			class="btn-sm ml-auto flex items-center justify-center rounded-md"
			onclick={() => {
				const prevLength = Object.keys(fields).length ?? 0;
				const key = `newParam${prevLength + 1}`;
				fields[key] = Object.assign(createFieldValidation({ validate: validateParamValue }), { value: "" });
			}}
		>
			Add parameter
		</button>
	</div>

	<div class="mt-4 flex flex-col gap-4">
		{#each entries(fields) as [key, field]}
			<div class="flex items-start gap-2">
				<label class="flex grow flex-col gap-1">
					<p class="text-xs font-medium text-gray-500 dark:text-gray-400">Key</p>
					<input
						type="text"
						class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						value={key}
						{...onchange(k => (fields = renameKey(fields, key, k)))}
					/>
				</label>
				<label class="flex grow flex-col gap-1">
					<p class="text-xs font-medium text-gray-500 dark:text-gray-400">Value</p>
					<input
						type="text"
						class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						{...field.attrs}
						bind:value={field.value}
					/>
					{#if field.msg}
						<p class="text-xs text-red-500">{field.msg}</p>
					{/if}
				</label>
				<button
					type="button"
					class="btn-xs mt-5 rounded-md text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
					onclick={() => (fields = deleteKey(fields, key))}
				>
					<IconX />
				</button>
			</div>
		{:else}
			<p class="text-sm text-gray-500">No parameters defined yet.</p>
		{/each}
	</div>

	{#snippet footer()}
		<button class="btn ml-auto" onclick={save}> Save </button>
	{/snippet}
</Dialog>

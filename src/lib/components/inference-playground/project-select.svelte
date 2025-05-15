<script lang="ts">
	import { autofocus } from "$lib/attachments/autofocus.js";
	import { checkpoints } from "$lib/state/checkpoints.svelte";
	import { cn } from "$lib/utils/cn.js";
	import { Select } from "melt/builders";
	import type { EventHandler } from "svelte/elements";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconCross from "~icons/carbon/close";
	import IconEdit from "~icons/carbon/edit";
	import IconHistory from "~icons/carbon/recently-viewed";
	import IconSave from "~icons/carbon/save";
	import IconDelete from "~icons/carbon/trash-can";
	import Dialog from "../dialog.svelte";
	import { prompt } from "../prompts.svelte";
	import Tooltip from "../tooltip.svelte";
	import CheckpointsMenu from "./checkpoints-menu.svelte";
	import { projects } from "$lib/state/projects.svelte";

	interface Props {
		class?: string;
	}

	let { class: classNames = "" }: Props = $props();

	const isDefault = $derived(projects.activeId === "default");

	const select = new Select({
		value: () => projects.activeId,
		onValueChange(v) {
			if (v) projects.activeId = v;
		},
		sameWidth: true,
	});

	type SaveDialogState = {
		open: boolean;
		moveCheckpoints: boolean;
		name: string;
	};

	const defaultSdState: SaveDialogState = {
		open: false,
		moveCheckpoints: true,
		name: "",
	};

	let sdState = $state(defaultSdState);
	const projectPlaceholder = $derived(`Project #${projects.all.length}`);

	function openSaveDialog() {
		sdState = { ...defaultSdState, open: true };
	}

	const saveDialog = async function (e) {
		e.preventDefault();
		projects.saveProject({
			...sdState,
			name: sdState.name || projectPlaceholder,
		});

		sdState = { ...defaultSdState };
	} satisfies EventHandler<SubmitEvent>;
</script>

<div class={cn("flex w-full items-stretch gap-2 ", classNames)}>
	<button
		{...select.trigger}
		class={cn(
			"relative flex grow items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
			"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110"
		)}
	>
		<div class="flex items-center gap-1 text-sm">
			{projects.current?.name}
		</div>
		<div
			class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
		>
			<IconCaret />
		</div>
	</button>

	<div class="flex items-center gap-2">
		<CheckpointsMenu />
		{#if isDefault}
			<Tooltip>
				{#snippet trigger(tooltip)}
					<button class="btn size-[32px] p-0" {...tooltip.trigger} onclick={openSaveDialog}>
						<IconSave />
					</button>
				{/snippet}
				Save as project
			</Tooltip>
		{:else}
			<Tooltip>
				{#snippet trigger(tooltip)}
					<button class="btn size-[32px] p-0" {...tooltip.trigger} onclick={() => (projects.activeId = "default")}>
						<IconCross />
					</button>
				{/snippet}
				Close project
			</Tooltip>
		{/if}
	</div>
</div>

<div {...select.content} class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
	{#each projects.all as { name, id } (id)}
		{@const option = select.getOption(id)}
		{@const hasCheckpoints = checkpoints.for(id).length > 0}
		<div {...option} class="group block w-full p-1 text-sm dark:text-white">
			<div
				class="flex items-center gap-2 rounded-md py-1.5 pr-1 pl-2 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
			>
				<div class="flex items-center gap-2">
					{name}
					{#if hasCheckpoints}
						<div
							class="text-3xs grid aspect-square place-items-center rounded bg-yellow-300 p-0.5 text-yellow-700 dark:bg-yellow-400/25 dark:text-yellow-400"
							aria-label="Project has checkpoints"
						>
							<IconHistory />
						</div>
					{/if}
				</div>
				{#if id !== "default"}
					<div class="ml-auto flex items-center gap-1">
						<button
							class="grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
							onclick={async e => {
								e.stopPropagation();
								projects.update({ id, name: (await prompt("Edit project name", name)) || name });
							}}
						>
							<IconEdit />
						</button>
						<button
							class="grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
							onclick={e => {
								e.stopPropagation();
								projects.delete(id);
							}}
						>
							<IconDelete />
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

<Dialog title="Set project name" open={sdState.open} onClose={() => (sdState.open = false)} onSubmit={saveDialog}>
	<label class="flex flex-col gap-2 font-medium text-gray-900 dark:text-white">
		<p>Project name</p>
		<input
			bind:value={sdState.name}
			placeholder={projectPlaceholder}
			type="text"
			class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
			{@attach autofocus()}
		/>
	</label>
	<label class="mt-4 flex gap-2 font-medium text-gray-900 dark:text-white">
		<input bind:checked={sdState.moveCheckpoints} type="checkbox" />
		<p>Move checkpoints over</p>
	</label>

	{#snippet footer()}
		<button
			type="submit"
			class="ml-auto rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
		>
			Submit
		</button>
	{/snippet}
</Dialog>

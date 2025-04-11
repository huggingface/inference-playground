<script lang="ts">
	import { session } from "$lib/state/session.svelte.js";
	import { cn } from "$lib/utils/cn.js";
	import { Select } from "melt/builders";
	import IconHistory from "~icons/carbon/recently-viewed";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconCross from "~icons/carbon/close";
	import IconEdit from "~icons/carbon/edit";
	import IconSave from "~icons/carbon/save";
	import IconDelete from "~icons/carbon/trash-can";
	import { prompt } from "../prompts.svelte";
	import Tooltip from "../tooltip.svelte";
	import CheckpointsMenu from "./checkpoints-menu.svelte";
	import { checkpoints } from "$lib/state/checkpoints.svelte";

	interface Props {
		class?: string;
	}

	let { class: classNames = "" }: Props = $props();

	const isDefault = $derived(session.$.activeProjectId === "default");

	const select = new Select({
		value: () => session.$.activeProjectId,
		onValueChange(v) {
			if (v) session.$.activeProjectId = v;
		},
		sameWidth: true,
	});

	async function saveProject() {
		session.saveProject((await prompt("Set project name")) || "Project #" + (session.$.projects.length + 1));
	}
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
			{session.project.name}
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
					<button class="btn size-[32px] p-0" {...tooltip.trigger} onclick={saveProject}>
						<IconSave />
					</button>
				{/snippet}
				Save to Project
			</Tooltip>
		{:else}
			<Tooltip>
				{#snippet trigger(tooltip)}
					<button
						class="btn size-[32px] p-0"
						{...tooltip.trigger}
						onclick={() => (session.$.activeProjectId = "default")}
					>
						<IconCross />
					</button>
				{/snippet}
				Close project
			</Tooltip>
		{/if}
	</div>
</div>

<div {...select.content} class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
	{#each session.$.projects as { name, id } (id)}
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
							class="text-3xs grid aspect-square place-items-center rounded bg-yellow-400/25 p-0.5 text-yellow-400"
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
								session.updateProject(id, { name: (await prompt("Edit project name", name)) || name });
							}}
						>
							<IconEdit />
						</button>
						<button
							class="grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
							onclick={e => {
								e.stopPropagation();
								session.deleteProject(id);
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

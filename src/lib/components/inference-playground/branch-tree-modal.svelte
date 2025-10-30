<script lang="ts">
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import { projects } from "$lib/state/projects.svelte";
	import { conversations } from "$lib/state/conversations.svelte";
	import { Popover } from "melt/builders";
	import IconBranch from "~icons/carbon/branch";
	import IconTree from "~icons/carbon/tree-view";
	import IconChevronRight from "~icons/carbon/chevron-right";

	interface BranchNode {
		project: NonNullable<typeof projects.current>;
		children: BranchNode[];
		depth: number;
	}

	const popover = new Popover({
		floatingConfig: {
			offset: { crossAxis: -12 },
		},
		onOpenChange: open => {
			if (open) dialog?.showModal();
			else dialog?.close();
		},
	});

	let dialog = $state<HTMLDialogElement>();

	const buildTree = $derived.by(() => {
		const allProjects = projects.all;
		const nodeMap = $state(new Map<string, BranchNode>());

		allProjects.forEach(project => {
			if (!nodeMap.has(project.id)) {
				nodeMap.set(project.id, { project, children: [], depth: 0 });
			}
		});

		const roots: BranchNode[] = [];

		allProjects.forEach(project => {
			const node = nodeMap.get(project.id)!;

			if (project.branchedFromId) {
				const parent = nodeMap.get(project.branchedFromId);
				if (parent) {
					parent.children.push(node);
					node.depth = parent.depth + 1;
				} else {
					roots.push(node);
				}
			} else {
				roots.push(node);
			}
		});

		const sortNodes = (nodes: BranchNode[]) => {
			nodes.sort((a, b) => a.project.name.localeCompare(b.project.name));
			nodes.forEach(node => sortNodes(node.children));
		};
		sortNodes(roots);

		return roots;
	});

	function switchToProject(projectId: string) {
		projects.activeId = projectId;
		popover.open = false;
	}

	function getBranchStats(projectId: string) {
		const convs = conversations.for(projectId);
		const totalMessages = convs.reduce((sum, c) => sum + (c.data.messages?.length || 0), 0);
		return { conversations: convs.length, messages: totalMessages };
	}
</script>

<button class="btn relative size-[32px] p-0" {...popover.trigger} title="View branch tree">
	<IconTree />
	{#if buildTree.length > 1 || buildTree.some(n => n.children.length > 0)}
		<div class="absolute -top-1 -right-1 size-2.5 rounded-full bg-green-500" aria-label="Project has branches"></div>
	{/if}
</button>

<dialog
	bind:this={dialog}
	class="mb-2 !overflow-visible rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
	{@attach clickOutside(() => (popover.open = false))}
	{...popover.content}
>
	<div
		class="size-4 translate-x-3 rounded-tl border-t border-l border-gray-200 dark:border-gray-700"
		{...popover.arrow}
	></div>
	<div class="max-h-120 w-96 overflow-x-clip overflow-y-auto p-4">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="flex items-center gap-2 text-sm font-semibold dark:text-white">
				<IconTree class="text-base" />
				Branch Tree
			</h3>
		</div>

		{#if buildTree.length === 0}
			<div class="flex flex-col items-center gap-2 py-3">
				<span class="text-sm text-gray-500">No projects found</span>
			</div>
		{:else}
			<div class="space-y-1">
				{#each buildTree as root}
					{@render treeNode(root)}
				{/each}
			</div>
		{/if}
	</div>
</dialog>

{#snippet treeNode(node: BranchNode)}
	{@const isActive = projects.activeId === node.project.id}
	{@const stats = getBranchStats(node.project.id)}
	{@const isBranch = node.project.branchedFromId !== null && node.project.branchedFromId !== undefined}

	<div class="flex flex-col">
		<button
			class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors {isActive
				? 'bg-blue-100 dark:bg-blue-900/30'
				: 'hover:bg-gray-100 dark:hover:bg-gray-700'}"
			onclick={() => switchToProject(node.project.id)}
			style="padding-left: {node.depth * 1.5 + 0.75}rem"
		>
			{#if node.depth > 0}
				<div class="flex-none text-gray-400">
					<IconChevronRight class="text-xs" />
				</div>
			{/if}

			<div class="flex-none text-base">
				{#if isBranch}
					<IconBranch class="text-green-600 dark:text-green-400" />
				{:else}
					📁
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<div
					class="truncate text-sm font-medium {isActive
						? 'text-blue-700 dark:text-blue-300'
						: 'text-gray-900 dark:text-gray-100'}"
				>
					{node.project.name}
					{#if isActive}
						<span class="text-2xs ml-1.5 font-semibold text-blue-600 dark:text-blue-400">ACTIVE</span>
					{/if}
				</div>
				<div class="text-2xs mt-0.5 flex items-center gap-2 text-gray-500">
					<span>{stats.messages} msg{stats.messages === 1 ? "" : "s"}</span>
					{#if isBranch && typeof node.project.branchedFromMessageIndex === "number"}
						<span>•</span>
						<span>from msg {node.project.branchedFromMessageIndex + 1}</span>
					{/if}
				</div>
			</div>
		</button>

		{#if node.children.length > 0}
			<div class="ml-3 border-l-2 border-gray-200 dark:border-gray-700">
				{#each node.children as child}
					{@render treeNode(child)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

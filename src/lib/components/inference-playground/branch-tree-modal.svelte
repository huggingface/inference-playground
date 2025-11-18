<script lang="ts">
	import { conversations } from "$lib/state/conversations.svelte";
	import { projects } from "$lib/state/projects.svelte";
	import { Popover, Tree, type TreeItem } from "melt/builders";
	import { watch } from "runed";
	import { SvelteMap } from "svelte/reactivity";
	import IconBranch from "~icons/carbon/branch";
	import IconChevronDown from "~icons/carbon/chevron-down";
	import IconChevronRight from "~icons/carbon/chevron-right";
	import IconLiteralTree from "~icons/carbon/tree";
	import IconTree from "~icons/carbon/tree-view";

	interface ProjectTreeItem extends TreeItem {
		id: string;
		value: string;
		project: NonNullable<typeof projects.current>;
		children?: ProjectTreeItem[];
	}

	const treeItems = $derived.by((): ProjectTreeItem[] => {
		// Get the root of the current active project
		const currentRoot = projects.getBranchRoot(projects.activeId);
		if (!currentRoot) return [];

		// Get all projects in this tree (same root)
		const treeProjects = projects.getAllBranchesInTree(currentRoot.id);
		const nodeMap = new SvelteMap<string, ProjectTreeItem>();

		treeProjects.forEach(project => {
			if (!nodeMap.has(project.id)) {
				nodeMap.set(project.id, {
					id: project.id,
					value: project.id,
					project,
					children: [],
				});
			}
		});

		const roots: ProjectTreeItem[] = [];

		treeProjects.forEach(project => {
			const node = nodeMap.get(project.id)!;

			if (project.branchedFromId) {
				const parent = nodeMap.get(project.branchedFromId);
				if (parent) {
					parent.children!.push(node);
				} else {
					roots.push(node);
				}
			} else {
				roots.push(node);
			}
		});

		const sortNodes = (nodes: ProjectTreeItem[]) => {
			nodes.sort((a, b) => a.project.name.localeCompare(b.project.name));
			nodes.forEach(node => {
				if (node.children && node.children.length > 0) {
					sortNodes(node.children);
				}
			});
		};
		sortNodes(roots);

		return roots;
	});

	const tree = new Tree({
		items: () => treeItems,
		selected: () => projects.activeId,
		onSelectedChange: value => {
			if (value) {
				projects.activeId = value;
				popover.open = false;
			}
		},
		expandOnClick: false,
	});

	let initExpanded = false;
	watch(
		() => treeItems,
		() => {
			if (treeItems.length === 0 || initExpanded) return;
			tree.expandAll();
			initExpanded = true;
		},
	);

	const popover = new Popover({
		floatingConfig: {
			offset: { crossAxis: -12 },
		},
		focus: {
			onOpen: () => `#${contentId} [data-melt-tree-item]`,
		},
	});
	const contentId: string = $derived(popover.ids.content);

	function getBranchStats(projectId: string) {
		const convs = conversations.for(projectId);
		const totalMessages = convs.reduce((sum, c) => sum + (c.data.messages?.length || 0), 0);
		return { conversations: convs.length, messages: totalMessages };
	}
</script>

<button class="btn relative size-[32px] shrink-0 p-0" {...popover.trigger}>
	<IconTree />
	{#if treeItems.length > 1 || treeItems.some(n => (n.children?.length ?? 0) > 0)}
		<div class="absolute -top-1 -right-1 size-2.5 rounded-full bg-blue-500" aria-label="Project has branches"></div>
	{/if}
</button>

<div
	class="mb-2 !overflow-visible rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
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

		{#if treeItems.length === 0}
			<div class="flex flex-col items-center gap-2 py-3">
				<span class="text-sm text-gray-500">No projects found</span>
			</div>
		{:else}
			<div {...tree.root}>
				{@render treeNode(tree.children)}
			</div>
		{/if}
	</div>
</div>

{#snippet treeNode(items: typeof tree.children)}
	{#each items as item (item.id)}
		{@const project = item.item.project}
		{@const isActive = tree.isSelected(item.id)}
		{@const isExpanded = tree.isExpanded(item.id)}
		{@const stats = getBranchStats(project.id)}
		{@const isBranch = project.branchedFromId !== null && project.branchedFromId !== undefined}
		{@const hasChildren = item.children && item.children.length > 0}

		<div class="group">
			<div
				{...item.attrs}
				class="flex w-full items-center rounded-lg px-1 py-2 text-left transition-colors {isActive
					? 'bg-blue-100 dark:bg-blue-900/30'
					: 'hover:bg-gray-100 dark:hover:bg-gray-700'}"
			>
				{#if hasChildren}
					<button
						onclick={e => {
							e.stopPropagation();
							tree.toggleExpand(item.id);
						}}
						class="flex-none p-2 text-gray-500 transition-transform hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						aria-label={isExpanded ? "Collapse" : "Expand"}
					>
						{#if isExpanded}
							<IconChevronDown class="size-4" />
						{:else}
							<IconChevronRight class="size-4" />
						{/if}
					</button>
				{:else}
					<div class="size-4 flex-none"></div>
				{/if}

				<div class="flex-none text-base">
					{#if isBranch}
						<IconBranch class="text-blue-600 dark:text-blue-400" />
					{:else}
						<IconLiteralTree class="text-blue-600 dark:text-blue-400" />
					{/if}
				</div>

				<div class="ml-2 min-w-0 flex-1">
					<div
						class="truncate text-sm font-medium {isActive
							? 'text-blue-700 dark:text-blue-300'
							: 'text-gray-900 dark:text-gray-100'}"
					>
						{project.name}
						{#if isActive}
							<span class="text-2xs ml-1.5 font-semibold text-blue-600 dark:text-blue-400">ACTIVE</span>
						{/if}
					</div>
					<div class="text-2xs mt-0.5 flex items-center gap-2 text-gray-500">
						<span>{stats.messages} msg{stats.messages === 1 ? "" : "s"}</span>
						{#if isBranch && typeof project.branchedFromMessageIndex === "number"}
							<span>•</span>
							<span>from msg {project.branchedFromMessageIndex + 1}</span>
						{/if}
					</div>
				</div>
			</div>

			{#if hasChildren && isExpanded}
				<div {...tree.group} class="ml-6 border-l-2 border-gray-200 pl-2 dark:border-gray-700">
					{@render treeNode(item.children)}
				</div>
			{/if}
		</div>
	{/each}
{/snippet}

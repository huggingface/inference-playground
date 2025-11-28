<script lang="ts">
	import { conversations } from "$lib/state/conversations.svelte.js";
	import { projects } from "$lib/state/projects.svelte.js";
	import { checkpoints } from "$lib/state/checkpoints.svelte.js";
	import { cn } from "$lib/utils/cn.js";
	import { Tree, type TreeItem } from "melt/builders";
	import { watch } from "runed";
	import { SvelteMap } from "svelte/reactivity";
	import IconBranch from "~icons/carbon/branch";
	import IconChevronDown from "~icons/carbon/chevron-down";
	import IconChevronRight from "~icons/carbon/chevron-right";
	import IconFolder from "~icons/carbon/folder";
	import IconFolderOpen from "~icons/carbon/folder-open";
	import IconPlus from "~icons/carbon/add";
	import IconEdit from "~icons/carbon/edit";
	import IconDelete from "~icons/carbon/trash-can";
	import IconHistory from "~icons/carbon/recently-viewed";
	import IconSidebarCollapse from "~icons/carbon/side-panel-close";
	import IconSidebarExpand from "~icons/carbon/side-panel-open";
	import { prompt } from "../prompts.svelte";
	import Tooltip from "../tooltip.svelte";

	interface ProjectTreeItem extends TreeItem {
		id: string;
		value: string;
		project: NonNullable<typeof projects.current>;
		children?: ProjectTreeItem[];
	}

	const MIN_WIDTH = 200;
	const MAX_WIDTH = 400;
	const DEFAULT_WIDTH = 256;
	const COLLAPSED_WIDTH = 48;

	interface Props {
		collapsed?: boolean;
		width?: number;
		onToggleCollapse?: () => void;
		onWidthChange?: (width: number) => void;
	}

	let { collapsed = false, width = DEFAULT_WIDTH, onToggleCollapse, onWidthChange }: Props = $props();

	// Resize state
	let is_resizing = $state(false);
	let resize_start_x = $state(0);
	let resize_start_width = $state(0);

	function handle_resize_start(e: MouseEvent) {
		if (collapsed) return;
		is_resizing = true;
		resize_start_x = e.clientX;
		resize_start_width = width;
		document.addEventListener("mousemove", handle_resize_move);
		document.addEventListener("mouseup", handle_resize_end);
		document.body.style.cursor = "ew-resize";
		document.body.style.userSelect = "none";
	}

	function handle_resize_move(e: MouseEvent) {
		if (!is_resizing) return;
		const delta = e.clientX - resize_start_x;
		const new_width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resize_start_width + delta));
		onWidthChange?.(new_width);
	}

	function handle_resize_end() {
		is_resizing = false;
		document.removeEventListener("mousemove", handle_resize_move);
		document.removeEventListener("mouseup", handle_resize_end);
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	}

	// Build tree structure from projects
	const tree_items = $derived.by((): ProjectTreeItem[] => {
		const all_projects = projects.all;
		const node_map = new SvelteMap<string, ProjectTreeItem>();

		// Create nodes for all projects
		all_projects.forEach(project => {
			node_map.set(project.id, {
				id: project.id,
				value: project.id,
				project,
				children: [],
			});
		});

		// Build tree structure
		const roots: ProjectTreeItem[] = [];

		all_projects.forEach(project => {
			const node = node_map.get(project.id)!;

			if (project.branchedFromId) {
				const parent = node_map.get(project.branchedFromId);
				if (parent) {
					parent.children!.push(node);
				} else {
					// Parent doesn't exist, make it a root
					roots.push(node);
				}
			} else {
				// No parent, it's a root
				roots.push(node);
			}
		});

		// Sort nodes alphabetically
		const sort_nodes = (nodes: ProjectTreeItem[]) => {
			nodes.sort((a, b) => {
				// Default project always comes first
				if (a.project.id === "default") return -1;
				if (b.project.id === "default") return 1;
				return a.project.name.localeCompare(b.project.name);
			});
			nodes.forEach(node => {
				if (node.children && node.children.length > 0) {
					sort_nodes(node.children);
				}
			});
		};
		sort_nodes(roots);

		return roots;
	});

	const tree = new Tree({
		items: () => tree_items,
		selected: () => projects.activeId,
		onSelectedChange: value => {
			if (value) {
				projects.activeId = value;
			}
		},
		expandOnClick: false,
	});

	// Auto-expand tree on first load
	let init_expanded = false;
	watch(
		() => tree_items,
		() => {
			if (tree_items.length === 0 || init_expanded) return;
			tree.expandAll();
			init_expanded = true;
		},
	);

	function get_branch_stats(project_id: string) {
		const convs = conversations.for(project_id);
		const total_messages = convs.reduce((sum, c) => sum + (c.data.messages?.length || 0), 0);
		const has_checkpoints = checkpoints.for(project_id).length > 0;
		return { conversations: convs.length, messages: total_messages, has_checkpoints };
	}

	async function handle_edit_project(e: MouseEvent, id: string, current_name: string) {
		e.stopPropagation();
		const new_name = await prompt("Edit project name", current_name);
		if (new_name && new_name !== current_name) {
			const project = projects.all.find(p => p.id === id);
			if (project) {
				projects.update({ ...project, name: new_name });
			}
		}
	}

	async function handle_delete_project(e: MouseEvent, id: string) {
		e.stopPropagation();
		if (confirm("Are you sure you want to delete this project? This cannot be undone.")) {
			projects.delete(id);
		}
	}

	async function handle_new_project() {
		const name = await prompt("New project name");
		if (name) {
			const id = await projects.create({ name, systemMessage: "" });
			projects.activeId = id;
		}
	}
</script>

<aside
	class={cn(
		"relative flex h-full flex-col overflow-hidden border-r border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50",
		!is_resizing && "transition-[width] duration-200 ease-out",
	)}
	style="width: {collapsed ? COLLAPSED_WIDTH : width}px"
>
	{#if !collapsed}
		<div class="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
			<h2 class="text-sm font-semibold text-gray-700 uppercase dark:text-gray-300">Projects</h2>
			<div class="flex items-center gap-1">
				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							onclick={handle_new_project}
							class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
							aria-label="New project"
							{...tooltip.trigger}
						>
							<IconPlus class="size-4" />
						</button>
					{/snippet}
					New project
				</Tooltip>
				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							onclick={onToggleCollapse}
							class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
							aria-label="Collapse sidebar"
							{...tooltip.trigger}
						>
							<IconSidebarCollapse class="size-4" />
						</button>
					{/snippet}
					Collapse sidebar
				</Tooltip>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto p-2" {...tree.root}>
			{#if tree_items.length === 0}
				<div class="flex flex-col items-center gap-2 py-8 text-center">
					<span class="text-sm text-gray-500">No projects yet</span>
					<button
						onclick={handle_new_project}
						class="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
					>
						<IconPlus class="size-3" />
						Create Project
					</button>
				</div>
			{:else}
				{@render tree_node(tree.children)}
			{/if}
		</div>
	{:else}
		<!-- Collapsed state - show expand button and project icons -->
		<div class="flex flex-col items-center py-2">
			<Tooltip>
				{#snippet trigger(tooltip)}
					<button
						onclick={onToggleCollapse}
						class="mb-2 grid size-8 place-items-center rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
						aria-label="Expand sidebar"
						{...tooltip.trigger}
					>
						<IconSidebarExpand class="size-4" />
					</button>
				{/snippet}
				Expand sidebar
			</Tooltip>
			<div class="h-px w-6 bg-gray-200 dark:bg-gray-700"></div>
			<div class="mt-2 flex flex-col items-center gap-1">
				{#each tree_items as item}
					{@const is_active = tree.isSelected(item.id)}
					{@const is_branch = item.project.branchedFromId !== null}
					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								onclick={() => tree.toggleSelect(item.id)}
								class={cn(
									"grid size-8 place-items-center rounded-md transition-colors",
									is_active
										? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
										: "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700",
								)}
								{...tooltip.trigger}
							>
								{#if is_branch}
									<IconBranch class="size-4" />
								{:else}
									<IconFolder class="size-4" />
								{/if}
							</button>
						{/snippet}
						{item.project.name}
					</Tooltip>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Resize handle -->
	{#if !collapsed}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class={cn(
				"absolute top-0 right-0 h-full w-1 cursor-ew-resize transition-colors",
				"hover:bg-blue-400 dark:hover:bg-blue-500",
				is_resizing && "bg-blue-500 dark:bg-blue-400",
			)}
			onmousedown={handle_resize_start}
		></div>
	{/if}
</aside>

{#snippet tree_node(items: typeof tree.children)}
	{#each items as item (item.id)}
		{@const project = item.item.project}
		{@const is_active = tree.isSelected(item.id)}
		{@const is_expanded = tree.isExpanded(item.id)}
		{@const stats = get_branch_stats(project.id)}
		{@const is_branch = project.branchedFromId !== null && project.branchedFromId !== undefined}
		{@const has_children = item.children && item.children.length > 0}
		{@const is_default = project.id === "default"}

		<div class="select-none">
			<div
				{...item.attrs}
				class={cn(
					"group flex w-full items-center rounded-md px-1 py-1.5 text-left transition-colors",
					is_active
						? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
						: "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
				)}
			>
				<!-- Expand/collapse button -->
				{#if has_children}
					<button
						onclick={e => {
							e.stopPropagation();
							tree.toggleExpand(item.id);
						}}
						class="flex-none p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						aria-label={is_expanded ? "Collapse" : "Expand"}
					>
						{#if is_expanded}
							<IconChevronDown class="size-3" />
						{:else}
							<IconChevronRight class="size-3" />
						{/if}
					</button>
				{:else}
					<div class="size-5 flex-none"></div>
				{/if}

				<!-- Icon -->
				<div class="mr-2 flex-none text-base">
					{#if is_branch}
						<IconBranch class="size-4 text-blue-600 dark:text-blue-400" />
					{:else if is_expanded}
						<IconFolderOpen class="size-4 text-gray-600 dark:text-gray-400" />
					{:else}
						<IconFolder class="size-4 text-gray-600 dark:text-gray-400" />
					{/if}
				</div>

				<!-- Project name and stats -->
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-1">
						<span class="truncate text-sm font-medium">
							{project.name}
						</span>
						{#if stats.has_checkpoints}
							<IconHistory class="size-3 flex-none text-yellow-600 dark:text-yellow-400" aria-label="Has checkpoints" />
						{/if}
					</div>
					{#if stats.messages > 0}
						<div class="text-2xs text-gray-500 dark:text-gray-500">
							{stats.messages} msg{stats.messages === 1 ? "" : "s"}
						</div>
					{/if}
				</div>

				<!-- Actions -->
				{#if !is_default}
					<div class="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
						<button
							onclick={e => handle_edit_project(e, project.id, project.name)}
							class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
							aria-label="Edit project name"
						>
							<IconEdit class="size-3" />
						</button>
						<button
							onclick={e => handle_delete_project(e, project.id)}
							class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-red-400"
							aria-label="Delete project"
						>
							<IconDelete class="size-3" />
						</button>
					</div>
				{/if}
			</div>

			<!-- Children -->
			{#if has_children && is_expanded}
				<div {...tree.group} class="ml-3 border-l-2 border-gray-200 pl-1 dark:border-gray-700">
					{@render tree_node(item.children)}
				</div>
			{/if}
		</div>
	{/each}
{/snippet}

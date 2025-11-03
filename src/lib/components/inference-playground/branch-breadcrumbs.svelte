<script lang="ts">
	import { projects } from "$lib/state/projects.svelte";
	import IconChevronRight from "~icons/carbon/chevron-right";
	import IconBranch from "~icons/carbon/branch";

	const breadcrumbs = $derived.by(() => {
		const trail: NonNullable<typeof projects.current>[] = [];
		let current = projects.current;

		while (current) {
			trail.unshift(current);
			if (current.branchedFromId) {
				current = projects.all.find(p => p.id === current?.branchedFromId);
			} else {
				current = undefined;
			}
		}

		return trail;
	});

	const showBreadcrumbs = $derived(breadcrumbs.length > 1);
</script>

{#if showBreadcrumbs}
	<div class="flex items-start gap-1 px-2 text-xs text-gray-600 dark:text-gray-400">
		<IconBranch class="mt-1 text-blue-600 dark:text-blue-400" />
		<div class="flex items-center gap-1 overflow-x-auto pb-3">
			{#each breadcrumbs as project, i}
				{#if i > 0}
					<IconChevronRight class="text-2xs flex-none text-gray-400" />
				{/if}
				<button
					class="flex-none rounded px-1.5 py-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 {project.id ===
					projects.activeId
						? 'font-semibold text-blue-600 dark:text-blue-400'
						: 'text-gray-600 dark:text-gray-400'}"
					onclick={() => (projects.activeId = project.id)}
				>
					{project.name}
				</button>
			{/each}
		</div>
	</div>
{/if}

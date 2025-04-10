<script lang="ts">
	import { checkpoints } from "$lib/state/checkpoints.svelte";
	import { session } from "$lib/state/session.svelte.js";
	import { Popover } from "melt/builders";
	import { Tooltip } from "melt/components";
	import { fly } from "svelte/transition";
	import IconHistory from "~icons/carbon/recently-viewed";
	import IconDelete from "~icons/carbon/trash-can";
	import IconStar from "~icons/carbon/star";
	import IconStarFilled from "~icons/carbon/star-filled";

	const popover = new Popover();
</script>

<button class="btn size-[32px] p-0" {...popover.trigger}>
	<IconHistory />
</button>

<div
	class="mb-2 max-h-120 w-80 rounded-xl border border-gray-200 bg-white p-3 pb-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
	{...popover.content}
>
	<div {...popover.arrow}></div>

	<div class="mb-2 flex items-center justify-between px-1">
		<h3 class="text-sm font-medium dark:text-white">Checkpoints</h3>
		<button
			class="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
			onclick={() => checkpoints.commit(session.project.id)}
		>
			Create new
		</button>
	</div>

	{#each checkpoints.for(session.project.id) as checkpoint (checkpoint.id)}
		{@const state = checkpoint.projectState}
		{@const msgs = state.conversations[0].messages.filter(m => m.content?.trim())}
		{@const sliced = msgs.slice(0, 4)}
		<Tooltip
			openDelay={0}
			floatingConfig={{
				computePosition: {
					placement: "right",
				},
				offset: {
					mainAxis: 16,
				},
			}}
			forceVisible
		>
			{#snippet children(tooltip)}
				<div
					class="mb-2 flex w-full items-center rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
					{...tooltip.trigger}
				>
					<button
						class="flex flex-1 flex-col text-left text-sm transition-colors"
						onclick={() => checkpoints.restore(session.project.id, checkpoint)}
					>
						<span class="font-medium text-gray-400">{checkpoint.timestamp}</span>
						<span class="text-sm text-gray-200">
							{msgs.length} messages
						</span>
					</button>

					<button
						class="grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
						onclick={e => {
							e.stopPropagation();
							checkpoints.toggleFavorite(session.project.id, checkpoint);
						}}
					>
						{#if checkpoint.favorite}
							<IconStarFilled class="text-yellow-500" />
						{:else}
							<IconStar />
						{/if}
					</button>
					<button
						class="grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
						onclick={e => {
							e.stopPropagation();
							checkpoints.delete(session.project.id, checkpoint);
						}}
					>
						<IconDelete />
					</button>
				</div>

				{#if tooltip.open && msgs.length > 0}
					<div
						class="w-80 rounded-xl border border-gray-700 bg-gray-800 p-2 shadow"
						{...tooltip.content}
						transition:fly={{ x: -2 }}
					>
						<div class="size-4 rounded-tl border-t border-l border-gray-700" {...tooltip.arrow}></div>
						<p class="text-2xs pl-1.5 font-mono font-medium text-gray-500 uppercase">
							temperature: {state.conversations[0].config.temperature} | max tokens: {state.conversations[0].config
								.max_tokens}
						</p>
						{#each sliced as msg, i}
							{@const isLast = i === sliced.length - 1}
							<div class="flex flex-col gap-1 p-2">
								<p class="font-mono text-xs font-medium text-gray-400 uppercase">{msg.role}</p>
								<p class="line-clamp-2 text-sm">{msg.content}</p>
							</div>
							{#if !isLast}
								<div class="my-2 h-px w-full bg-gray-200 dark:bg-gray-700"></div>
							{/if}
						{/each}
					</div>
				{/if}
			{/snippet}
		</Tooltip>
	{:else}
		<div class="flex flex-col items-center gap-2 py-3">
			<span class="text-gray-500 text-sm">No checkpoints available</span>
		</div>
	{/each}
</div>

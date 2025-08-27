<script lang="ts">
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import { checkpoints } from "$lib/state/checkpoints.svelte";
	import { projects } from "$lib/state/projects.svelte";
	import { iterate } from "$lib/utils/array.js";
	import { formatDateTime } from "$lib/utils/date.js";
	import { Popover } from "melt/builders";
	import { Tooltip } from "melt/components";
	import { fly } from "svelte/transition";
	import IconCompare from "~icons/carbon/compare";
	import IconHistory from "~icons/carbon/recently-viewed";
	import IconStar from "~icons/carbon/star";
	import IconStarFilled from "~icons/carbon/star-filled";
	import IconDelete from "~icons/carbon/trash-can";
	import { TEST_IDS } from "$lib/constants.js";

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

	const projCheckpoints = $derived(checkpoints.for(projects.activeId));
</script>

<button class="btn relative size-[32px] p-0" {...popover.trigger} data-test-id={TEST_IDS.checkpoints_trigger}>
	<IconHistory />
	{#if projCheckpoints.length > 0}
		<div class="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500" aria-label="Project has checkpoints"></div>
	{/if}
</button>

<dialog
	bind:this={dialog}
	class="mb-2 !overflow-visible rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
	{@attach clickOutside(() => (popover.open = false))}
	{...popover.content}
	data-test-id={TEST_IDS.checkpoints_menu}
>
	<div
		class="size-4 translate-x-3 rounded-tl border-t border-l border-gray-200 dark:border-gray-700"
		{...popover.arrow}
	></div>
	<div class="max-h-120 w-80 overflow-x-clip overflow-y-auto p-3 pb-1">
		<div class="mb-2 flex items-center justify-between px-1">
			<h3 class="text-sm font-medium dark:text-white">Checkpoints</h3>
			<button
				class="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
				onclick={() => checkpoints.commit(projects.activeId)}
			>
				Create new
			</button>
		</div>

		{#each projCheckpoints as checkpoint (checkpoint.id)}
			{@const conversations = checkpoint.conversations}
			{@const multiple = conversations.length > 1}
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
						class="mb-2 flex w-full items-center rounded-md px-3 hover:bg-gray-100 dark:hover:bg-gray-700"
						{...tooltip.trigger}
						data-test-id={TEST_IDS.checkpoint}
					>
						<button
							class="flex flex-1 flex-col py-2 text-left text-sm transition-colors"
							onclick={e => {
								e.stopPropagation();
								checkpoints.restore(checkpoint);
							}}
						>
							<span class="font-medium text-gray-400">{formatDateTime(checkpoint.timestamp)}</span>

							<p class="mt-0.5 flex items-center gap-2 text-sm">
								{#if multiple}
									<IconCompare class="text-xs text-gray-400" />
								{/if}
								{#each conversations as { messages }, i}
									<span class={["text-gray-800 dark:text-gray-200"]}>
										{messages?.length || 0} message{(messages?.length || 0) === 1 ? "" : "s"}
									</span>
									{#if multiple && i === 0}
										<span class="text-gray-500">|</span>
									{/if}
								{/each}
							</p>
						</button>

						<button
							class="mr-0.5 grid place-items-center rounded-md p-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
							onclick={e => {
								e.stopPropagation();
								checkpoints.toggleFavorite(checkpoint);
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
								checkpoints.delete(checkpoint);
							}}
						>
							<IconDelete />
						</button>
					</div>

					{#if tooltip.open}
						<div
							class={[
								"flex rounded-xl border border-gray-100 bg-gray-50 p-2 shadow dark:border-gray-700 dark:bg-gray-800",
							]}
							{...tooltip.content}
							transition:fly={{ x: -2 }}
						>
							<div
								class="size-4 rounded-tl border-t border-l border-gray-200 dark:border-gray-700"
								{...tooltip.arrow}
							></div>
							{#each conversations as conversation, i}
								{@const msgs = conversation.messages || []}
								{@const sliced = msgs.slice(0, 4)}
								<div
									class={[
										"p-2",
										multiple ? "w-52" : "w-72",
										i === 0 && multiple && "border-r border-gray-200 dark:border-gray-700",
									]}
								>
									<p class="text-2xs pl-1.5 font-mono font-medium text-gray-500 uppercase">
										temp: {conversation.config.temperature}
										{#if conversation.config.max_tokens}
											| max tokens: {conversation.config.max_tokens}
										{/if}
										{#if conversation.structuredOutput?.enabled}
											| structured output
										{/if}
									</p>
									{#each iterate(sliced) as [msg, isLast]}
										<div class="flex flex-col gap-1 p-2">
											<p class="font-mono text-xs font-medium text-gray-400 uppercase">{msg.role}</p>
											{#if msg.content?.trim()}
												<p class="line-clamp-2 text-sm">{msg.content.trim()}</p>
											{:else}
												<p class="text-sm text-gray-500 italic">No content</p>
											{/if}
										</div>
										{#if !isLast}
											<div class="my-2 h-px w-full bg-gray-200 dark:bg-gray-700"></div>
										{/if}
									{/each}
								</div>
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
</dialog>

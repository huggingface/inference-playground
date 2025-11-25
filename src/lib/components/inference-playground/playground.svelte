<script lang="ts">
	import { TEST_IDS } from "$lib/constants.js";
	import { conversations } from "$lib/state/conversations.svelte";
	import { projects } from "$lib/state/projects.svelte";
	import { isHFModel } from "$lib/types.js";
	import { iterate } from "$lib/utils/array.js";
	import { atLeastNDecimals } from "$lib/utils/number.js";
	import { Popover } from "melt/builders";
	import IconExternal from "~icons/carbon/arrow-up-right";
	import IconWaterfall from "~icons/carbon/chart-waterfall";
	import IconCode from "~icons/carbon/code";
	import IconCompare from "~icons/carbon/compare";
	import IconInfo from "~icons/carbon/information";
	import IconSettings from "~icons/carbon/settings";
	import IconShare from "~icons/carbon/share";
	import IconSidebarCollapse from "~icons/carbon/side-panel-close";
	import IconSidebarExpand from "~icons/carbon/side-panel-open";
	import { default as IconDelete } from "~icons/carbon/trash-can";
	import BillingIndicator from "../billing-indicator.svelte";
	import { showShareModal } from "../share-modal.svelte";
	import Toaster from "../toaster.svelte";
	import Tooltip from "../tooltip.svelte";
	import BillingModal from "./billing-modal.svelte";
	import PlaygroundConversationHeader from "./conversation-header.svelte";
	import PlaygroundConversation from "./conversation.svelte";
	import GenerationConfig from "./generation-config.svelte";
	import MessageTextarea from "./message-textarea.svelte";
	import ModelSelectorModal from "./model-selector-modal.svelte";
	import ModelSelector from "./model-selector.svelte";
	import ProjectTreeSidebar from "./project-tree-sidebar.svelte";
	import CheckpointsMenu from "./checkpoints-menu.svelte";

	let viewCode = $state(false);
	let sidebarCollapsed = $state(false);
	let billingModalOpen = $state(false);
	let selectCompareModelOpen = $state(false);
	let settingsPopoverOpen = $state(false);

	const compareActive = $derived(conversations.active.length === 2);

	// Settings popover
	const settingsPopover = new Popover({
		open: () => settingsPopoverOpen,
		onOpenChange: value => {
			settingsPopoverOpen = value;
		},
	});
</script>

<div
	class={[
		"motion-safe:animate-fade-in flex h-dvh overflow-hidden bg-gray-100/50",
		"dark:bg-gray-900 dark:text-gray-300 dark:[color-scheme:dark]",
	]}
>
	<!-- Project tree sidebar -->
	<ProjectTreeSidebar collapsed={sidebarCollapsed} />

	<!-- Main content area -->
	<div class="relative flex flex-1 flex-col overflow-hidden">
		<!-- Top bar -->
		<header
			class="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900"
		>
			<div class="flex items-center gap-3">
				<!-- Sidebar toggle -->
				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
							class="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
							aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
							{...tooltip.trigger}
						>
							{#if sidebarCollapsed}
								<IconSidebarExpand class="size-5" />
							{:else}
								<IconSidebarCollapse class="size-5" />
							{/if}
						</button>
					{/snippet}
					{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				</Tooltip>

				<!-- Project name and checkpoints -->
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold">{projects.current?.name}</span>
					<CheckpointsMenu />
				</div>
			</div>

			<!-- Right side of top bar -->
			<div class="flex items-center gap-3">
				<!-- Model selector -->
				{#if !compareActive && conversations.active[0]}
					<div class="flex items-center gap-2">
						<ModelSelector conversation={conversations.active[0]} compact />
						<button
							class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
							onclick={() => (selectCompareModelOpen = true)}
						>
							<IconCompare class="size-4" />
							Compare
						</button>
					</div>
				{/if}

				<!-- Settings button with popover -->
				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							{...settingsPopover.trigger}
							class="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
							aria-label="Settings"
							{...tooltip.trigger}
						>
							<IconSettings class="size-5" />
						</button>
					{/snippet}
					Settings
				</Tooltip>

				<!-- Share button -->
				<button
					onclick={() => projects.current && showShareModal(projects.current)}
					class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
				>
					<IconShare class="size-4" />
					Share
				</button>

				<!-- Billing indicator -->
				<BillingIndicator showModal={() => (billingModalOpen = true)} />
			</div>
		</header>

		<!-- Conversations area -->
		<div class="relative flex flex-1 flex-col overflow-hidden">
			<Toaster />
			<div class="flex flex-1 divide-x divide-gray-200 overflow-x-auto overflow-y-hidden *:w-full dark:divide-gray-800">
				{#each conversations.active as conversation, conversationIdx (conversation.data.id)}
					<div class="flex h-full flex-col overflow-hidden">
						{#if compareActive}
							<PlaygroundConversationHeader
								{conversationIdx}
								{conversation}
								on:close={() => conversations.delete(conversation.data)}
							/>
						{/if}
						<PlaygroundConversation
							{conversation}
							{viewCode}
							onCloseCode={() => (viewCode = false)}
							showSystemPrompt={true}
						/>
					</div>
				{/each}
			</div>

			{#if !viewCode}
				<MessageTextarea />
			{/if}

			<!-- Bottom bar -->
			<div
				class="relative flex h-12 shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900"
			>
				<div class="flex items-center gap-2">
					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								type="button"
								onclick={conversations.reset}
								class="btn size-[28px]! p-0!"
								{...tooltip.trigger}
								data-test-id={TEST_IDS.reset}
							>
								<IconDelete />
							</button>
						{/snippet}
						Clear conversation
					</Tooltip>
				</div>

				<!-- Stats in center -->
				<div
					class="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-x-8 text-center text-sm text-gray-500 max-lg:hidden"
				>
					{#each iterate(conversations.generationStats) as [{ latency, tokens, cost }]}
						<span>
							{tokens} tokens · Latency {latency}ms · Cost ${atLeastNDecimals(cost ?? 0, 1)}
						</span>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<button type="button" onclick={() => (viewCode = !viewCode)} class="btn h-[28px]! px-2!">
						<IconCode />
						{!viewCode ? "View Code" : "Hide Code"}
					</button>
				</div>
			</div>
		</div>

		<!-- Footer links -->
		<div class="absolute bottom-3 left-4 flex items-center gap-2 text-xs">
			<a
				target="_blank"
				href="https://huggingface.co/docs/inference-providers/tasks/chat-completion"
				class="flex items-center gap-1 text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
			>
				<IconInfo class="size-3" />
				View Docs
			</a>
			<span class="text-gray-500 dark:text-gray-500">·</span>
			<a
				target="_blank"
				href="https://huggingface.co/spaces/huggingface/inference-playground/discussions/1"
				class="flex items-center gap-1 text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
			>
				Give feedback
			</a>
			<span class="text-gray-500 dark:text-gray-500">·</span>
			<a
				href="https://huggingface.co/inference/models"
				target="_blank"
				class="flex items-center gap-1 text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
			>
				<IconWaterfall class="size-3" />
				Metrics
			</a>
		</div>
	</div>
</div>

<!-- Settings popover content -->
<div
	{...settingsPopover.content}
	class="z-50 max-h-[600px] w-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
>
	<h3 class="mb-4 text-sm font-semibold text-gray-700 uppercase dark:text-gray-300">Generation Settings</h3>
	{#if conversations.active[0]}
		<GenerationConfig conversation={conversations.active[0]} />

		{#if isHFModel(conversations.active[0]?.model)}
			<div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
				<a
					href="https://huggingface.co/{conversations.active[0]?.model.id}?inference_provider={conversations.active[0]
						.data.provider}"
					target="_blank"
					class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
				>
					<IconExternal class="size-3" />
					View model page
				</a>
			</div>
		{/if}
	{/if}
</div>

<!-- Model selection modal -->
{#if selectCompareModelOpen}
	<ModelSelectorModal
		conversation={conversations.active[0]!}
		onModelSelect={m => {
			const data = {
				...conversations.active[0]?.data,
				projectId: projects.activeId,
				modelId: m,
			};
			delete data.id;
			conversations.create(data);
		}}
		onClose={() => (selectCompareModelOpen = false)}
	/>
{/if}

<!-- Billing modal -->
{#if billingModalOpen}
	<BillingModal onClose={() => (billingModalOpen = false)} />
{/if}

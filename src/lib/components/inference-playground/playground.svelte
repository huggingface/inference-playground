<script lang="ts">
	import { TEST_IDS } from "$lib/constants.js";
	import { conversations } from "$lib/state/conversations.svelte";
	import { projects } from "$lib/state/projects.svelte";
	import { isHFModel } from "$lib/types.js";
	import { iterate } from "$lib/utils/array.js";
	import { atLeastNDecimals } from "$lib/utils/number.js";
	import { isMac } from "$lib/utils/platform.js";
	import { Popover } from "melt/builders";
	import { onMount } from "svelte";
	import IconExternal from "~icons/carbon/arrow-up-right";
	import IconWaterfall from "~icons/carbon/chart-waterfall";
	import IconCode from "~icons/carbon/code";
	import IconCompare from "~icons/carbon/compare";
	import IconInfo from "~icons/carbon/information";
	import IconSettings from "~icons/carbon/settings";
	import IconShare from "~icons/carbon/share";
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
	import ProviderSelect from "./provider-select.svelte";
	import ProjectTreeSidebar from "./project-tree-sidebar.svelte";
	import CheckpointsMenu from "./checkpoints-menu.svelte";

	// LocalStorage keys
	const SIDEBAR_COLLAPSED_KEY = "playground:sidebar:collapsed";
	const SIDEBAR_WIDTH_KEY = "playground:sidebar:width";
	const DEFAULT_SIDEBAR_WIDTH = 256;

	// Initialize from localStorage or defaults
	function get_initial_collapsed(): boolean {
		if (typeof localStorage === "undefined") return false;
		const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
		return stored === "true";
	}

	function get_initial_width(): number {
		if (typeof localStorage === "undefined") return DEFAULT_SIDEBAR_WIDTH;
		const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
		const parsed = stored ? parseInt(stored, 10) : NaN;
		return isNaN(parsed) ? DEFAULT_SIDEBAR_WIDTH : parsed;
	}

	let viewCode = $state(false);
	let sidebarCollapsed = $state(get_initial_collapsed());
	let sidebarWidth = $state(get_initial_width());
	let billingModalOpen = $state(false);
	let selectCompareModelOpen = $state(false);
	let settingsPopoverOpen = $state(false);

	const compareActive = $derived(conversations.active.length === 2);

	// Persist sidebar state to localStorage
	function toggle_sidebar_collapsed() {
		sidebarCollapsed = !sidebarCollapsed;
		localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
	}

	function handle_sidebar_width_change(width: number) {
		sidebarWidth = width;
		localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
	}

	// Keyboard shortcut for toggling sidebar (Cmd+B / Ctrl+B)
	function handle_keydown(e: KeyboardEvent) {
		const mod_key = isMac() ? e.metaKey : e.ctrlKey;
		if (mod_key && e.key === "b") {
			e.preventDefault();
			toggle_sidebar_collapsed();
		}
	}

	onMount(() => {
		document.addEventListener("keydown", handle_keydown);
		return () => {
			document.removeEventListener("keydown", handle_keydown);
		};
	});

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
	<ProjectTreeSidebar
		collapsed={sidebarCollapsed}
		width={sidebarWidth}
		onToggleCollapse={toggle_sidebar_collapsed}
		onWidthChange={handle_sidebar_width_change}
	/>

	<!-- Main content area -->
	<div class="relative flex flex-1 flex-col overflow-hidden">
		<!-- Top bar -->
		<header
			class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900"
		>
			<!-- Left side: Model selector, provider selector, and compare -->
			<div class="flex items-center gap-3">
				{#if !compareActive && conversations.active[0]}
					<!-- Model and provider stacked vertically with fixed width -->
					<div class="flex w-72 flex-col gap-1">
						<ModelSelector conversation={conversations.active[0]} compact />
						{#if isHFModel(conversations.active[0].model)}
							<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
							<ProviderSelect conversation={conversations.active[0] as any} compact />
						{/if}
					</div>
					<button
						class="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
						onclick={() => (selectCompareModelOpen = true)}
					>
						<IconCompare class="size-4" />
						Compare
					</button>
				{/if}
			</div>

			<!-- Right side: Actions -->
			<div class="flex items-center gap-3">
				<!-- Checkpoints menu -->
				<CheckpointsMenu />

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
				<div class="flex items-center gap-4">
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

					<!-- Footer links - moved here to avoid overlap -->
					<div class="flex items-center gap-2 text-xs max-md:hidden">
						<a
							target="_blank"
							href="https://huggingface.co/docs/inference-providers/tasks/chat-completion"
							class="flex items-center gap-1 text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
						>
							<IconInfo class="size-3" />
							Docs
						</a>
						<span class="text-gray-400 dark:text-gray-600">·</span>
						<a
							target="_blank"
							href="https://huggingface.co/spaces/huggingface/inference-playground/discussions/1"
							class="text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
						>
							Feedback
						</a>
						<span class="text-gray-400 dark:text-gray-600">·</span>
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

				<!-- Stats in center -->
				<div
					class="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-x-8 text-center text-sm text-gray-500 max-xl:hidden"
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

<script lang="ts">
	import { ScrollState } from "$lib/spells/scroll-state.svelte";
	import { type ConversationClass } from "$lib/state/conversations.svelte";
	import { projects } from "$lib/state/projects.svelte";
	import { isSystemPromptSupported } from "$lib/utils/business.svelte.js";
	import { cn } from "$lib/utils/cn.js";
	import { watch } from "runed";
	import { tick } from "svelte";
	import IconSystem from "~icons/carbon/bot";
	import IconEdit from "~icons/carbon/edit";
	import IconCheck from "~icons/carbon/checkmark";
	import IconClose from "~icons/carbon/close";
	import CodeSnippets from "./code-snippets.svelte";
	import Message from "./message.svelte";

	interface Props {
		conversation: ConversationClass;
		viewCode: boolean;
		onCloseCode: () => void;
		showSystemPrompt?: boolean;
	}

	const { conversation, viewCode, onCloseCode, showSystemPrompt = false }: Props = $props();

	let messageContainer: HTMLDivElement | null = $state(null);
	let editingSystemPrompt = $state(false);
	let systemPromptText = $state(projects.current?.systemMessage ?? "");

	const systemPromptSupported = $derived(isSystemPromptSupported(conversation.model));
	const hasSystemPrompt = $derived(!!projects.current?.systemMessage?.trim());

	const scrollState = new ScrollState({
		element: () => messageContainer,
		offset: { bottom: 100 },
	});
	const atBottom = $derived(scrollState.arrived.bottom);

	watch(
		() => conversation.data.messages?.at(-1)?.content,
		() => {
			const shouldScroll = atBottom && !scrollState.isScrolling;
			if (!shouldScroll) return;
			try {
				tick().then(() => {
					scrollState.scrollToBottom();
				});
			} catch {
				// noop
			}
		},
	);

	watch(
		() => projects.current?.systemMessage,
		() => {
			systemPromptText = projects.current?.systemMessage ?? "";
		},
	);

	async function regenMessage(idx: number) {
		// TODO: migrate to new logic
		const msg = conversation.data.messages?.[idx];
		if (!msg) return;
		if (msg.role === "user") {
			await conversation.deleteMessages(idx + 1);
		} else {
			await conversation.deleteMessages(idx);
		}

		conversation.stopGenerating();
		conversation.genNextMessage();
	}

	function saveSystemPrompt() {
		if (!projects.current) return;
		projects.update({ ...projects.current, systemMessage: systemPromptText });
		editingSystemPrompt = false;
	}

	function cancelSystemPromptEdit() {
		systemPromptText = projects.current?.systemMessage ?? "";
		editingSystemPrompt = false;
	}
</script>

<div
	class="@container flex h-full flex-col overflow-x-hidden overflow-y-auto"
	class:animate-pulse={conversation.generating && !conversation.data.streaming}
	bind:this={messageContainer}
>
	{#if !viewCode}
		{#if showSystemPrompt && systemPromptSupported}
			<!-- System prompt as first message -->
			<div
				class={cn(
					"border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50",
					!hasSystemPrompt && !editingSystemPrompt && "opacity-60",
				)}
			>
				{#if editingSystemPrompt}
					<div class="px-4 py-3">
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<IconSystem class="size-5 text-blue-600 dark:text-blue-400" />
								<span class="text-sm font-semibold text-gray-700 uppercase dark:text-gray-300">System</span>
							</div>
							<div class="flex items-center gap-1">
								<button
									onclick={saveSystemPrompt}
									class="rounded p-1 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
									aria-label="Save"
								>
									<IconCheck class="size-4" />
								</button>
								<button
									onclick={cancelSystemPromptEdit}
									class="rounded p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
									aria-label="Cancel"
								>
									<IconClose class="size-4" />
								</button>
							</div>
						</div>
						<textarea
							bind:value={systemPromptText}
							placeholder="Enter a system prompt to define the assistant's behavior..."
							class="w-full resize-none rounded-lg border border-gray-300 bg-white p-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-blue-400"
							rows="3"
						></textarea>
					</div>
				{:else}
					<div class="group relative px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800">
						<button class="w-full text-left" onclick={() => (editingSystemPrompt = true)}>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<IconSystem class="size-5 text-blue-600 dark:text-blue-400" />
									<span class="text-sm font-semibold text-gray-700 uppercase dark:text-gray-300">System</span>
								</div>
								<div class="rounded p-1 text-gray-400 opacity-0 group-hover:opacity-100">
									<IconEdit class="size-4" />
								</div>
							</div>
							{#if hasSystemPrompt}
								<p class="mt-2 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
									{projects.current?.systemMessage}
								</p>
							{:else}
								<p class="mt-2 text-sm text-gray-500 italic">Click to add a system prompt...</p>
							{/if}
						</button>
					</div>
				{/if}
			</div>
		{/if}

		{#if conversation.data.messages && conversation.data.messages.length > 0}
			{#each conversation.data.messages as message, index}
				<Message
					{message}
					{index}
					{conversation}
					onDelete={() => conversation.deleteMessage(index)}
					onRegen={() => regenMessage(index)}
				/>
			{/each}
		{:else}
			<div class="m-auto flex flex-col items-center gap-2 px-4 text-center text-balance">
				<h1 class="text-2xl font-semibold">Welcome to Hugging Face Inference Playground</h1>
				<p class="text-lg text-gray-500">Try hundreds of models on different providers</p>
			</div>
		{/if}
	{:else}
		<CodeSnippets {conversation} {onCloseCode} />
	{/if}
</div>

<script lang="ts">
	import { ScrollState } from "$lib/spells/scroll-state.svelte";
	import { conversations, type ConversationClass } from "$lib/state/conversations.svelte";
	import { cmdOrCtrl } from "$lib/utils/platform.js";
	import { watch } from "runed";
	import { tick } from "svelte";
	import IconPlus from "~icons/carbon/add";
	import { addToast } from "../toaster.svelte.js";
	import CodeSnippets from "./code-snippets.svelte";
	import Message from "./message.svelte";
	import { randomPick } from "$lib/utils/array.js";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { autofocus } from "$lib/attachments/autofocus.js";

	interface Props {
		conversation: ConversationClass;
		conversationIdx: number;
		viewCode: boolean;
		onCloseCode: () => void;
	}

	const { conversation, viewCode, onCloseCode, conversationIdx }: Props = $props();

	const multiple = $derived(conversations.active.length > 1);
	const loading = $derived(conversations.generating);

	let messageContainer: HTMLDivElement | null = $state(null);
	const scrollState = new ScrollState({
		element: () => messageContainer,
		offset: { bottom: 100 },
	});
	const atBottom = $derived(scrollState.arrived.bottom);

	watch(
		() => conversation.data.messages.at(-1)?.content,
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
		}
	);

	function addMessage() {
		const msgs = conversation.data.messages.slice();
		conversation.update({
			...conversation.data,
			messages: [
				...msgs,
				{
					role: msgs.at(-1)?.role === "user" ? "assistant" : "user",
					content: "",
				},
			],
		});
	}

	async function regenMessage(idx: number) {
		// TODO: migrate to new logic
		const msg = conversation.data.messages[idx];
		if (!msg) return;
		if (msg.role === "user") {
			await conversation.deleteMessages(idx + 1);
		} else {
			await conversation.deleteMessages(idx);
		}

		conversation.stopGenerating();
		conversation.genNextMessage();
	}

	let input = $state("");

	function onKeydown(event: KeyboardEvent) {
		const ctrlOrMeta = event.ctrlKey || event.metaKey;

		if (ctrlOrMeta && event.key === "Enter") {
			const lastMessage = conversation.data.messages.at(-1);
			if (lastMessage?.role === "user") {
				addToast({
					title: "Cannot add message",
					description: "Cannot have multiple user messages in a row",

					variant: "error",
				});
			} else {
				conversation.addMessage({ role: "user", content: input });
				input = "";
			}
		}
	}

	const placeholderMessages = [
		"What is the capital of France?",
		"What is HuggingFace?",
		"What is the best way to learn machine learning?",
		"What is Gradio?",
		"What is Svelte?",
		"How do I create agents in HuggingFace?",
	];

	const placeholder = randomPick(placeholderMessages);

	const autosized = new TextareaAutosize();
</script>

<svelte:window onkeydown={onKeydown} />

<div
	class="@container flex h-full flex-col overflow-x-hidden overflow-y-auto"
	class:animate-pulse={conversation.generating && !conversation.data.streaming}
	bind:this={messageContainer}
>
	{#if !viewCode}
		{#each conversation.data.messages as message, index}
			<Message
				{message}
				{index}
				{conversation}
				onDelete={() => conversation.deleteMessage(index)}
				onRegen={() => regenMessage(index)}
			/>
		{/each}

		<button
			class="flex px-3.5 py-6 hover:bg-gray-50 md:px-6 dark:hover:bg-gray-800/50"
			onclick={addMessage}
			disabled={conversation.generating}
		>
			<div class="flex items-center gap-2 p-0! text-sm font-semibold">
				<div class="text-lg">
					<IconPlus />
				</div>
				Add message
			</div>
		</button>

		<div class="mt-auto p-2">
			<label
				class="flex w-full items-end rounded-[32px] p-2 pl-8 outline-offset-2 outline-blue-500 focus-within:outline-2 dark:bg-neutral-800"
			>
				<textarea
					{placeholder}
					class="max-h-100 flex-1 resize-none self-center outline-none"
					bind:value={input}
					{@attach autosized.attachment}
					{@attach autofocus()}
				></textarea>
				<button
					onclick={() => {
						conversations.genOrStop();
					}}
					type="button"
					class={[
						"flex items-center justify-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium text-white focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:focus:ring-gray-700",
						loading && "bg-red-900 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700",
						!loading && "bg-black hover:bg-gray-900 dark:bg-blue-600 dark:hover:bg-blue-700",
					]}
				>
					{#if loading}
						<div class="flex flex-none items-center gap-[3px]">
							<span class="mr-2">
								{#if conversations.active.some(c => c.data.streaming)}
									Stop
								{:else}
									Cancel
								{/if}
							</span>
							{#each { length: 3 } as _, i}
								<div
									class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-100"
									style="animation-delay: {(i + 1) * 0.25}s;"
								></div>
							{/each}
						</div>
					{:else}
						{multiple ? "Run all" : "Run"}
						<span
							class="inline-flex gap-0.5 rounded-sm border border-white/20 bg-white/10 px-0.5 text-xs text-white/70"
						>
							{cmdOrCtrl}<span class="translate-y-px">↵</span>
						</span>
					{/if}
				</button>
			</label>
		</div>
	{:else}
		<CodeSnippets {conversation} {onCloseCode} />
	{/if}
</div>

<script lang="ts">
	import { ScrollState } from "$lib/spells/scroll-state.svelte";
	import { type ConversationClass } from "$lib/state/conversations.svelte";
	import { watch } from "runed";
	import { tick } from "svelte";
	import IconPlus from "~icons/carbon/add";
	import CodeSnippets from "./code-snippets.svelte";
	import Message from "./message.svelte";

	interface Props {
		conversation: ConversationClass;
		viewCode: boolean;
		onCloseCode: () => void;
	}

	const { conversation, viewCode, onCloseCode }: Props = $props();
	let messageContainer: HTMLDivElement | null = $state(null);
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
		}
	);

	function addMessage() {
		const msgs = conversation.data.messages?.slice() || [];
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
</script>

<div
	class="@container flex flex-col overflow-x-hidden overflow-y-auto"
	class:animate-pulse={conversation.generating && !conversation.data.streaming}
	bind:this={messageContainer}
>
	{#if !viewCode}
		{#each conversation.data.messages || [] as message, index}
			<Message
				{message}
				{index}
				{conversation}
				autofocus={index === (conversation.data.messages?.length || 0) - 1}
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
	{:else}
		<CodeSnippets {conversation} {onCloseCode} />
	{/if}
</div>

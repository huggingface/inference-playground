<script lang="ts">
	import { type Conversation } from "$lib/types.js";

	import { ScrollState } from "$lib/spells/scroll-state.svelte";
	import { watch } from "runed";
	import { tick } from "svelte";
	import IconPlus from "~icons/carbon/add";
	import CodeSnippets from "./code-snippets.svelte";
	import Message from "./message.svelte";
	import { iterate } from "$lib/utils/array.js";
	import { session } from "$lib/state/session.svelte";

	interface Props {
		conversation: Conversation;
		loading: boolean;
		viewCode: boolean;
	}

	let { conversation = $bindable(), loading, viewCode }: Props = $props();
	let messageContainer: HTMLDivElement | null = $state(null);
	const scrollState = new ScrollState({
		element: () => messageContainer,
		offset: { bottom: 100 },
	});
	const atBottom = $derived(scrollState.arrived.bottom);

	watch(
		() => conversation.messages.at(-1)?.content,
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
		const msgs = conversation.messages.slice();
		conversation.messages = [
			...msgs,
			{
				role: msgs.at(-1)?.role === "user" ? "assistant" : "user",
				content: "",
			},
		];
		conversation = conversation;
	}

	function deleteMessage(idx: number) {
		conversation.messages = conversation.messages.slice(0, idx);
	}

	function regenMessage(idx: number) {
		const msg = conversation.messages[idx];
		if (!msg) return;
		if (msg.role === "user") {
			conversation.messages = conversation.messages.slice(0, idx + 1);
		} else {
			conversation.messages = conversation.messages.slice(0, idx);
		}

		session.stopGenerating();
		session.run(conversation);
	}
</script>

<div
	class="@container flex flex-col overflow-x-hidden overflow-y-auto"
	class:animate-pulse={loading && !conversation.streaming}
	bind:this={messageContainer}
	id="test-this"
>
	{#if !viewCode}
		{#each iterate(conversation.messages) as [_msg, { isLast }], idx}
			<Message
				bind:message={conversation.messages[idx]!}
				{conversation}
				autofocus={idx === conversation.messages.length - 1}
				{loading}
				onDelete={() => deleteMessage(idx)}
				onRegen={() => regenMessage(idx)}
				{isLast}
			/>
		{/each}

		<button
			class="flex px-3.5 py-6 hover:bg-gray-50 md:px-6 dark:hover:bg-gray-800/50"
			onclick={addMessage}
			disabled={loading}
		>
			<div class="flex items-center gap-2 p-0! text-sm font-semibold">
				<div class="text-lg">
					<IconPlus />
				</div>
				Add message
			</div>
		</button>
	{:else}
		<CodeSnippets {conversation} on:closeCode />
	{/if}
</div>

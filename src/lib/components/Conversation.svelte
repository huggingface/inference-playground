<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import CodeSnippets from '$lib/components/CodeSnippets.svelte';
	import Message from '$lib/components/Message.svelte';
	import PlaygroundOptions from '$lib/components/GenerationConfig.svelte';

	export let loading;
	export let conversation;
	export let index;
	export let viewCode;
	export let sideBySide = false;

	const dispatch = createEventDispatcher<{
		addMessage: void;
		deleteMessage: number;
		deleteConversation: number;
	}>();

	let messageContainer: HTMLDivElement | null = null;

	function scrollToBottom() {
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}

	$: {
		if (conversation.messages.at(-1)) {
			scrollToBottom();
		}
	}
</script>

<div
	class="flex max-h-[calc(100dvh-5.8rem)] flex-col overflow-y-auto overflow-x-hidden @container"
	class:pointer-events-none={loading}
	class:animate-pulse={loading && !conversation.config.streaming}
	bind:this={messageContainer}
>
	{#if sideBySide}
		<div
			class="sticky top-0 flex h-11 flex-none items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200/80 bg-white pl-3 pr-2 text-sm leading-none shadow-sm *:flex-none dark:border-gray-800 dark:bg-gray-800/70 dark:hover:bg-gray-800"
			class:mr-3={index === 0}
			class:mx-3={index === 1}
		>
			<div class="size-3.5 rounded bg-black dark:bg-gray-400"></div>
			<div>{conversation.model}</div>
			<button
				class="ml-auto flex size-6 items-center justify-center rounded bg-gray-50 text-xs hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
				on:click={() => dispatch('deleteConversation', index)}
			>
				✕
			</button>
			<button
				class="group relative flex size-6 items-center justify-center rounded bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"
					><path
						fill="currentColor"
						d="M27 16.76v-1.53l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4a2 2 0 0 0-1.73-1a2 2 0 0 0-.64.1l-2.43.82a11.35 11.35 0 0 0-1.31-.75l-.51-2.52a2 2 0 0 0-2-1.61h-4.68a2 2 0 0 0-2 1.61l-.51 2.52a11.48 11.48 0 0 0-1.32.75l-2.38-.86A2 2 0 0 0 6.79 6a2 2 0 0 0-1.73 1L2.7 11a2 2 0 0 0 .41 2.51L5 15.24v1.53l-1.89 1.68A2 2 0 0 0 2.7 21l2.36 4a2 2 0 0 0 1.73 1a2 2 0 0 0 .64-.1l2.43-.82a11.35 11.35 0 0 0 1.31.75l.51 2.52a2 2 0 0 0 2 1.61h4.72a2 2 0 0 0 2-1.61l.51-2.52a11.48 11.48 0 0 0 1.32-.75l2.42.82a2 2 0 0 0 .64.1a2 2 0 0 0 1.73-1l2.28-4a2 2 0 0 0-.41-2.51ZM25.21 24l-3.43-1.16a8.86 8.86 0 0 1-2.71 1.57L18.36 28h-4.72l-.71-3.55a9.36 9.36 0 0 1-2.7-1.57L6.79 24l-2.36-4l2.72-2.4a8.9 8.9 0 0 1 0-3.13L4.43 12l2.36-4l3.43 1.16a8.86 8.86 0 0 1 2.71-1.57L13.64 4h4.72l.71 3.55a9.36 9.36 0 0 1 2.7 1.57L25.21 8l2.36 4l-2.72 2.4a8.9 8.9 0 0 1 0 3.13L27.57 20Z"
					/><path
						fill="currentColor"
						d="M16 22a6 6 0 1 1 6-6a5.94 5.94 0 0 1-6 6Zm0-10a3.91 3.91 0 0 0-4 4a3.91 3.91 0 0 0 4 4a3.91 3.91 0 0 0 4-4a3.91 3.91 0 0 0-4-4Z"
					/></svg
				>
				<PlaygroundOptions
					bind:config={conversation.config}
					classNames="absolute top-8 right-0 w-56 invisible group-focus:visible hover:visible border border-gray-200/80 bg-white z-10 px-4 py-6 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-800 rounded-xl"
				/>
			</button>
		</div>
	{/if}
	{#if !viewCode}
		{#each conversation.messages as message, messageIdx}
			<Message
				class="border-b"
				{message}
				conversationIdx={index}
				{messageIdx}
				on:messageValueChanged
				on:delete={() => dispatch('deleteMessage', messageIdx)}
				autofocus={!sideBySide && !loading && messageIdx === conversation.messages.length - 1}
			/>
		{/each}

		<button
			class="flex px-6 py-6 hover:bg-gray-50 dark:hover:bg-gray-800/50"
			on:click={() => dispatch('addMessage')}
			disabled={loading}
		>
			<div class="flex items-center gap-2 !p-0 text-sm font-semibold">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="1em"
					height="1em"
					viewBox="0 0 32 32"
					class="text-lg"
					><path
						fill="currentColor"
						d="M16 2A14.172 14.172 0 0 0 2 16a14.172 14.172 0 0 0 14 14a14.172 14.172 0 0 0 14-14A14.172 14.172 0 0 0 16 2Zm8 15h-7v7h-2v-7H8v-2h7V8h2v7h7Z"
					/><path fill="none" d="M24 17h-7v7h-2v-7H8v-2h7V8h2v7h7v2z" /></svg
				>Add message
			</div>
		</button>
	{:else}
		<CodeSnippets {conversation} />
	{/if}
</div>

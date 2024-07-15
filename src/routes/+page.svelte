<script lang="ts">
	import {
		createHfInference,
		prepareRequestMessages,
		handleStreamingResponse,
		handleNonStreamingResponse
	} from '$lib/components/playgroundUtils';
	import PlaygroundOptions from '$lib/components/GenerationConfig.svelte';
	import PlaygroundTokenModal from '$lib/components/HFTokenModal.svelte';
	import PlaygroundModelSelector from '$lib/components/ModelSelector.svelte';
	import Conversation from '$lib/components/Conversation.svelte';
	import { onMount } from 'svelte';
	import { type ModelEntry } from '@huggingface/hub';
	import { type ChatCompletionInputMessage } from '@huggingface/tasks';

	let compatibleModels: ModelEntry[] = [];

	const startMessages: ChatCompletionInputMessage[] = [{ role: 'user', content: '' }];

	let conversations: Conversation[] = [
		{
			id: String(Math.random()),
			model: '01-ai/Yi-1.5-34B-Chat',
			config: { temperature: 0.5, maxTokens: 2048, streaming: true, jsonMode: false },
			messages: startMessages
		}
	];

	$: if (conversations.length > 1) {
		viewCode = false;
	}

	let systemMessage: ChatCompletionInputMessage = { role: 'system', content: '' };
	let hfToken: string | null = import.meta.env.VITE_HF_TOKEN;
	let viewCode = false;
	let showTokenModal = false;
	let loading = false;
	let tokens = 0;
	let latency = 0;
	let abortControllers: AbortController[] = [];
	let waitForNonStreaming = true;

	onMount(() => {
		(async () => {
			// TODO: use hfjs.hub listModels after https://github.com/huggingface/huggingface.js/pull/795
			const res = await fetch(
				'https://huggingface.co/api/models?pipeline_tag=text-generation&inference=Warm&other=conversational'
			);
			compatibleModels = (await res.json()) as ModelEntry[];
			compatibleModels.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));
		})();

		return () => {
			for (const abortController of abortControllers) {
				abortController.abort();
			}
		};
	});

	function addMessage() {
		conversations = conversations.map((conversation) => {
			conversation.messages = [
				...conversation.messages,
				{
					role: conversation.messages.at(-1)?.role === 'user' ? 'assistant' : 'user',
					content: ''
				}
			];
			return conversation;
		});
	}

	function updateMessage(value: string, conversationIdx: number, messageIdx: number) {
		const lastMsgIdx = conversations[0].messages.length - 1;
		const msg = conversations[conversationIdx].messages[messageIdx];
		msg.content = value;
		const { role } = msg;
		if (messageIdx === lastMsgIdx && role === 'user') {
			conversations = conversations.map((conversation) => {
				conversation.messages[messageIdx].content = value;
				return conversation;
			});
		}
		conversations = conversations;
	}

	function deleteAndGetItem<T>(array: T[], index: number) {
		if (index >= 0 && index < array.length) {
			return array.splice(index, 1)[0];
		}
		return undefined;
	}

	function deleteMessage(idx: number) {
		conversations = conversations.map((conversation) => {
			const deletedMsg = deleteAndGetItem<ChatCompletionInputMessage>(conversation.messages, idx);
			// delete messages in user/assistant pairs. otherwise, the chat template will be broken
			if (deletedMsg) {
				const { role } = deletedMsg;
				const pairIdx = role === 'user' ? idx : idx - 1;
				deleteAndGetItem<ChatCompletionInputMessage>(conversation.messages, pairIdx);
			}
			return conversation;
		});
	}

	function deleteConversation(idx: number) {
		deleteAndGetItem(conversations, idx);
		conversations = conversations;
	}

	function reset() {
		systemMessage.content = '';
		conversations = conversations.map((conversation) => {
			conversation.messages = [...startMessages];
			return conversation;
		});
	}

	function abort() {
		if (abortControllers.length) {
			for (const abortController of abortControllers) {
				abortController.abort();
			}
			abortControllers = [];
		}
		loading = false;
		waitForNonStreaming = false;
	}

	async function runInference(conversation: Conversation) {
		const startTime = performance.now();
		const hf = createHfInference(hfToken);
		const requestMessages = prepareRequestMessages(systemMessage, conversation.messages);

		if (conversation.config.streaming) {
			const streamingMessage = { role: 'assistant', content: '' };
			conversation.messages = [...conversation.messages, streamingMessage];
			const abortController = new AbortController();
			abortControllers.push(abortController);

			await handleStreamingResponse(
				hf,
				conversation.model,
				requestMessages,
				conversation.config.temperature,
				conversation.config.maxTokens,
				conversation.config.jsonMode,
				(content) => {
					if (streamingMessage) {
						streamingMessage.content = content;
						conversation.messages = [...conversation.messages];
						conversations = conversations;
					}
				},
				abortController
			);
		} else {
			waitForNonStreaming = true;
			const newMessage = await handleNonStreamingResponse(
				hf,
				conversation.model,
				requestMessages,
				conversation.config.temperature,
				conversation.config.maxTokens,
				conversation.config.jsonMode
			);
			// check if the user did not abort the request
			if (waitForNonStreaming) {
				conversation.messages = [...conversation.messages, newMessage];
				conversations = conversations;
			}
		}

		const endTime = performance.now();
		latency = Math.round(endTime - startTime);
	}

	async function submit() {
		// // last message has to be from user
		// if (currentConversation.messages?.at(-1)?.role !== 'user') {
		// 	addMessage();
		// 	return;
		// }
		if (!hfToken) {
			showTokenModal = true;
			return;
		}
		(document.activeElement as HTMLElement).blur();
		loading = true;

		try {
			const promises = conversations.map((conversation) => runInference(conversation));
			await Promise.all(promises);
			addMessage();
		} catch (error) {
			if (error.name !== 'AbortError') {
				alert('error: ' + (error as Error).message);
			}
		} finally {
			loading = false;
			abortControllers = [];
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (!event.shiftKey && event.key === 'Enter') {
			submit();
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

{#if showTokenModal}
	<PlaygroundTokenModal
		on:close={() => (showTokenModal = false)}
		on:submit={(e) => {
			const formData = new FormData(e.target);
			hfToken = formData.get('hf-token');
			submit();
			showTokenModal = false;
		}}
	/>
{/if}

<div
	class="w-dvh grid divide-gray-200 overflow-hidden bg-gray-100/50 max-md:divide-y md:h-dvh dark:[color-scheme:dark]
	{conversations.length === 1
		? 'md:grid-cols-[clamp(220px,20%,350px),minmax(0,1fr),clamp(270px,25%,300px)]'
		: 'md:grid-cols-[clamp(220px,20%,350px),minmax(0,1fr),0]'}
	
	 dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300"
>
	<div class=" flex flex-col overflow-y-auto py-3 pr-3">
		<div
			class="relative flex flex-1 flex-col gap-6 overflow-y-hidden rounded-r-xl border-x border-y border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
		>
			<div class="pb-2 text-sm font-semibold">SYSTEM</div>
			<textarea
				name=""
				id=""
				placeholder="Enter a custom prompt"
				bind:value={systemMessage.content}
				class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent px-3 pt-10 text-sm outline-none"
			></textarea>
		</div>
	</div>
	<div class="relative divide-y divide-gray-200 pt-3 dark:divide-gray-800">
		<div
			class="flex h-[calc(100dvh-5rem)] divide-x divide-gray-200 {conversations.length === 2
				? '*:w-1/2'
				: conversations.length == 3
					? '*:w-1/3'
					: '*:w-full'} dark:divide-gray-800"
		>
			{#each conversations as conversation, index}
				<Conversation
					{loading}
					{conversation}
					{index}
					{viewCode}
					sideBySide={conversations.length > 1}
					on:addMessage={addMessage}
					on:messageValueChanged={(e) => {
						const { conversationIdx, messageIdx, value } = e.detail;
						updateMessage(value, conversationIdx, messageIdx);
					}}
					on:deleteMessage={(e) => deleteMessage(e.detail)}
					on:deleteConversation={(e) => deleteConversation(e.detail)}
				/>
			{/each}
		</div>
		<div
			class="fixed inset-x-0 bottom-0 flex h-20 items-center gap-2 overflow-hidden whitespace-nowrap px-3 md:absolute"
		>
			<button
				type="button"
				class="flex h-[39px] flex-none gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<div
					class="flex size-5 items-center justify-center rounded border border-black/5 bg-black/5 text-xs"
				>
					<svg
						width="1em"
						height="1em"
						viewBox="0 0 24 25"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M5.41 9.41L4 8L12 0L20 8L18.59 9.41L13 3.83L13 17.5H11L11 3.83L5.41 9.41ZM22 17.5V23H2V17.5H0V23C0 23.5304 0.210714 24.0391 0.585786 24.4142C0.960859 24.7893 1.46957 25 2 25H22C22.5304 25 23.0391 24.7893 23.4142 24.4142C23.7893 24.0391 24 23.5304 24 23V17.5H22Z"
							fill="currentColor"
						/>
					</svg>
				</div>

				Share</button
			>

			<button
				type="button"
				on:click={reset}
				class="flex size-[39px] flex-none items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"
					><path fill="currentColor" d="M12 12h2v12h-2zm6 0h2v12h-2z" /><path
						fill="currentColor"
						d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"
					/></svg
				></button
			>
			<div class="flex-1 items-center justify-center text-center text-sm text-gray-500">
				<span class="max-xl:hidden">0 tokens · Latency {latency}ms</span>
			</div>
			<button
				type="button"
				on:click={() => (viewCode = !viewCode)}
				class="flex h-[39px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="1em"
					height="1em"
					class="text-base"
					viewBox="0 0 32 32"
					><path
						fill="currentColor"
						d="m31 16l-7 7l-1.41-1.41L28.17 16l-5.58-5.59L24 9l7 7zM1 16l7-7l1.41 1.41L3.83 16l5.58 5.59L8 23l-7-7zm11.42 9.484L17.64 6l1.932.517L14.352 26z"
					/></svg
				>
				{!viewCode ? 'View Code' : 'Hide Code'}</button
			>
			<button
				on:click={() => {
					viewCode = false;
					loading ? abort() : submit();
				}}
				type="button"
				class="flex h-[39px] w-24 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:focus:ring-gray-700 {loading
					? 'bg-red-900 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700'
					: 'bg-black hover:bg-gray-900 dark:bg-blue-600 dark:hover:bg-blue-700'}"
			>
				{#if loading}
					<div class="flex flex-none items-center gap-[3px]">
						<span class="mr-2">Cancel</span>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-100"
							style="animation-delay: 0.25s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-100"
							style="animation-delay: 0.5s;"
						/>
						<div
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-500 dark:bg-gray-100"
							style="animation-delay: 0.75s;"
						/>
					</div>
				{:else}
					Run <span
						class="inline-flex gap-0.5 rounded border border-white/20 bg-white/10 px-0.5 text-xs text-white/70"
						>↵</span
					>
				{/if}
			</button>
		</div>
	</div>
	{#if conversations.length === 1}
		<div class="flex flex-col p-3">
			<div
				class="flex flex-1 flex-col gap-6 overflow-y-hidden rounded-xl border border-gray-200/80 bg-gradient-to-b from-white via-white p-3 shadow-sm dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
			>
				<PlaygroundModelSelector {compatibleModels} bind:currentModel={conversations[0].model} />
				<div
					class="group relative -mt-4 flex h-[26px] w-full items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-gray-700"
				>
					Compare with...
					<svg
						class="ml-0.5 flex-none opacity-50 group-hover:opacity-100"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						aria-hidden="true"
						role="img"
						width="1em"
						height="1em"
						preserveAspectRatio="xMidYMid meet"
						viewBox="0 0 24 24"
						><path
							d="M16.293 9.293L12 13.586L7.707 9.293l-1.414 1.414L12 16.414l5.707-5.707z"
							fill="currentColor"
						></path></svg
					>
					<select
						class="absolute inset-0 border-none bg-white text-base opacity-0 outline-none"
						on:change|preventDefault={(e) => {
							conversations = [
								...conversations,
								{
									id: String(Math.random()),
									model: e.target.value,
									config: { temperature: 0.5, maxTokens: 2048, streaming: true, jsonMode: false },
									messages: [...conversations[0].messages]
								}
							];
						}}
					>
						{#each compatibleModels as model}
							<option value={model.id}>{model.id}</option>
						{/each}
					</select>
				</div>

				<PlaygroundOptions bind:config={conversations[0].config} />
				<div class="mt-auto">
					<div class="mb-3 flex items-center justify-between gap-2">
						<label
							for="default-range"
							class="block text-sm font-medium text-gray-900 dark:text-white">API Quota</label
						>
						<span
							class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
							>Free</span
						>

						<div class="ml-auto w-12 text-right text-sm">76%</div>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
						<div class="h-2 rounded-full bg-black dark:bg-gray-400" style="width: 75%"></div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

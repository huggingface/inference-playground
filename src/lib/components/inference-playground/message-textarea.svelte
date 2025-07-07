<script lang="ts">
	import { autofocus } from "$lib/attachments/autofocus.js";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { conversations } from "$lib/state/conversations.svelte";
	import { cmdOrCtrl } from "$lib/utils/platform.js";
	import { addToast } from "../toaster.svelte.js";

	const multiple = $derived(conversations.active.length > 1);
	const loading = $derived(conversations.generating);

	let input = $state("");

	async function onKeydown(event: KeyboardEvent) {
		if (loading) return;
		const ctrlOrMeta = event.ctrlKey || event.metaKey;

		if (ctrlOrMeta && event.key === "Enter") {
			const c = conversations.active;
			const isValid = c.every(c => c.data.messages?.at(-1)?.role !== "user");

			if (!isValid) {
				addToast({
					title: "Cannot add message",
					description: "Cannot have multiple user messages in a row",

					variant: "error",
				});
			} else {
				await Promise.all(c.map(c => c.addMessage({ role: "user", content: input })));
				c.forEach(c => c.genNextMessage());
				input = "";
			}
		}
	}

	const autosized = new TextareaAutosize();
</script>

<svelte:window onkeydown={onKeydown} />

<div class="mt-auto p-2">
	<label
		class="flex w-full items-end rounded-[32px] bg-gray-200 p-2 pl-8 outline-offset-2 outline-blue-500 focus-within:outline-2 dark:bg-gray-800"
	>
		<textarea
			placeholder="Enter your message"
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
							class="h-1 w-1 flex-none animate-bounce rounded-full bg-gray-200 dark:bg-gray-100"
							style="animation-delay: {(i + 1) * 0.25}s;"
						></div>
					{/each}
				</div>
			{:else}
				{multiple ? "Run all" : "Run"}
				<span class="inline-flex gap-0.5 rounded-sm border border-white/20 bg-white/10 px-0.5 text-xs text-white/70">
					{cmdOrCtrl}<span class="translate-y-px">↵</span>
				</span>
			{/if}
		</button>
	</label>
</div>

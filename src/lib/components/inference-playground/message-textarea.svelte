<script lang="ts">
	import { autofocus } from "$lib/attachments/autofocus.js";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { conversations } from "$lib/state/conversations.svelte";
	import { images } from "$lib/state/images.svelte";
	import type { ConversationMessage } from "$lib/types.js";
	import { fileToDataURL } from "$lib/utils/file.js";
	import { omit } from "$lib/utils/object.svelte";
	import { cmdOrCtrl } from "$lib/utils/platform.js";
	import { FileUpload } from "melt/builders";
	import { fade } from "svelte/transition";
	import IconImage from "~icons/carbon/image-reference";
	import IconMaximize from "~icons/carbon/maximize";
	import Tooltip from "../tooltip.svelte";
	import { previewImage } from "./img-preview.svelte";

	const multiple = $derived(conversations.active.length > 1);
	const loading = $derived(conversations.generating);

	let input = $state("");

	async function onKeydown(event: KeyboardEvent) {
		if (loading) return;
		const ctrlOrMeta = event.ctrlKey || event.metaKey;

		if (ctrlOrMeta && event.key === "Enter") {
			sendMessage();
		}
	}

	async function uploadImages() {
		const keys: string[] = [];
		const files = Array.from(fileUpload.selected);
		await Promise.all(
			files.map(async file => {
				const key = await images.upload(file);
				keys.push(key);
			}),
		);
		return keys;
	}

	async function sendMessage() {
		const c = conversations.active;

		let images: string[] | undefined;
		if (canUploadImgs) {
			images = await uploadImages();
		}

		const message: ConversationMessage = { role: "user", content: input };
		if (images) {
			message.images = images;
		}

		await Promise.all(c.map(c => c.addMessage(message)));
		conversations.genNextMessages();
		input = "";

		fileUpload.clear();
	}

	const canUploadImgs = $derived(conversations.active.every(c => c.supportsImgUpload));

	const fileUpload = new FileUpload({
		accept: "image/*",
		multiple: true,
		disabled: () => !canUploadImgs,
	});

	const autosized = new TextareaAutosize();
</script>

<svelte:window onkeydown={onKeydown} />

<div class="relative mt-auto px-2 pt-1">
	<label
		class="relative block rounded-[32px] bg-gray-200 p-2 pl-6 outline-gray-400 focus-within:outline-2 dark:bg-gray-800"
		{...omit(fileUpload.dropzone, "onclick")}
	>
		{#if fileUpload.isDragging}
			<div
				class="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[32px] bg-gray-800/50 backdrop-blur-md"
				transition:fade={{ duration: 100 }}
			>
				<IconImage />
				<p>Drop the image here to upload</p>
			</div>
		{/if}

		<div class="flex w-full items-end">
			<textarea
				placeholder="Enter your message"
				class="max-h-100 flex-1 resize-none self-center outline-none"
				bind:value={input}
				{@attach autosized.attachment}
				{@attach autofocus()}
			></textarea>
			{#if canUploadImgs}
				<Tooltip openDelay={250}>
					{#snippet trigger(tooltip)}
						<button
							tabindex="0"
							type="button"
							class="mr-2 mb-1.5 grid size-7 place-items-center rounded-full bg-white text-xs font-medium text-gray-900
					hover:bg-gray-100
					hover:text-blue-700 focus:z-10 focus:ring-4
					focus:ring-gray-100 focus:outline-hidden
					dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
							{...tooltip.trigger}
							{...fileUpload.trigger}
						>
							<IconImage />
						</button>
						<input {...fileUpload.input} />
					{/snippet}
					Add image
				</Tooltip>
			{/if}
			<button
				onclick={() => {
					if (loading) conversations.stopGenerating();
					else sendMessage();
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
		</div>

		<div class="flex w-full items-center gap-2">
			{#each fileUpload.selected as file}
				<div class="group/img relative">
					<button
						aria-label="expand"
						class="absolute inset-0 z-10 grid place-items-center bg-gray-800/70 opacity-0 group-hover/img:opacity-100"
						onclick={() => {
							fileToDataURL(file).then(src => previewImage(src));
						}}
					>
						<IconMaximize />
					</button>
					<img src={await fileToDataURL(file)} alt="uploaded" class="size-12 rounded-md object-cover" />
					<button
						aria-label="remove"
						type="button"
						onclick={async e => {
							e.stopPropagation();
							fileUpload.remove(file);
						}}
						class="invisible absolute -top-1 -right-1 z-20 grid size-5 place-items-center rounded-full bg-gray-800 text-xs text-white group-hover/img:visible hover:bg-gray-700"
					>
						✕
					</button>
				</div>
			{/each}
		</div>
	</label>
</div>

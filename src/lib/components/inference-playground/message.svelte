<script lang="ts">
	import { autofocus as autofocusAction } from "$lib/actions/autofocus.js";
	import Tooltip from "$lib/components/tooltip.svelte";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { PipelineTag, type Conversation, type ConversationMessage } from "$lib/types.js";
	import { fileToDataURL } from "$lib/utils/file.js";
	import { FileUpload } from "melt/builders";
	import { fade } from "svelte/transition";
	import IconImage from "~icons/carbon/image-reference";
	import IconMaximize from "~icons/carbon/maximize";
	import IconCustom from "../icon-custom.svelte";
	import ImgPreview from "./img-preview.svelte";

	type Props = {
		conversation: Conversation;
		message: ConversationMessage;
		loading?: boolean;
		autofocus?: boolean;
		onDelete?: () => void;
		onRegen?: () => void;
		isLast?: boolean;
	};

	let { message = $bindable(), conversation, loading, autofocus, onDelete, onRegen, isLast }: Props = $props();

	let element = $state<HTMLTextAreaElement>();
	new TextareaAutosize({
		element: () => element,
		input: () => message.content ?? "",
	});

	const canUploadImgs = $derived(
		message.role === "user" &&
			"pipeline_tag" in conversation.model &&
			conversation.model.pipeline_tag === PipelineTag.ImageTextToText
	);
	const fileUpload = new FileUpload({
		accept: "image/*",
		async onAccept(file) {
			if (!message.images) message.images = [];

			const dataUrl = await fileToDataURL(file);
			if (message.images.includes(dataUrl)) return;

			message.images.push(await fileToDataURL(file));
			// We're dealing with files ourselves, so we don't want fileUpload to have any internal state,
			// to avoid conflicts
			fileUpload.clear();
		},
		disabled: () => !canUploadImgs,
	});

	let previewImg = $state<string>();

	const regenLabel = $derived.by(() => {
		if (message.role === "assistant") return "Regenerate";
		return isLast ? "Generate from here" : "Regenerate from here";
	});
</script>

<div
	class="group/message group relative flex flex-col items-start gap-x-4 gap-y-2 border-b px-3.5 pt-4 pb-6 hover:bg-gray-100/70
	 @2xl:px-6 dark:border-gray-800 dark:hover:bg-gray-800/30"
	class:pointer-events-none={loading}
	{...fileUpload.dropzone}
	onclick={undefined}
>
	<div class=" flex w-full flex-col items-start gap-x-4 gap-y-2 @2xl:flex-row">
		{#if fileUpload.isDragging}
			<div
				class="absolute inset-2 z-10 flex flex-col items-center justify-center rounded-xl bg-gray-800/50 backdrop-blur-md"
				transition:fade={{ duration: 100 }}
			>
				<IconImage />
				<p>Drop the image here to upload</p>
			</div>
		{/if}

		<div class="pt-3 text-sm font-semibold uppercase @2xl:basis-[130px]">
			{message.role}
		</div>
		<div class="flex w-full gap-4">
			<textarea
				bind:this={element}
				use:autofocusAction={autofocus}
				bind:value={message.content}
				placeholder="Enter {message.role} message"
				class="grow resize-none overflow-hidden rounded-lg bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:bg-white focus:bg-white focus:ring-3 @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
				rows="1"
				data-message
			></textarea>

			{#if canUploadImgs}
				<Tooltip openDelay={250}>
					{#snippet trigger(tooltip)}
						<button
							tabindex="0"
							type="button"
							class="mt-1.5 -mr-2 grid size-8 place-items-center rounded-lg border border-gray-200 bg-white text-xs font-medium
			text-gray-900 group-focus-within/message:visible group-hover/message:visible
			hover:bg-gray-100 hover:text-blue-700 focus:z-10
			focus:ring-4 focus:ring-gray-100 focus:outline-hidden sm:invisible dark:border-gray-600
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

			<Tooltip>
				{#snippet trigger(tooltip)}
					<button
						tabindex="0"
						onclick={onRegen}
						type="button"
						class="mt-1.5 -mr-2 grid size-8 place-items-center rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900
			group-focus-within/message:visible group-hover/message:visible hover:bg-gray-100
			hover:text-blue-700 focus:z-10 focus:ring-4
			focus:ring-gray-100 focus:outline-hidden sm:invisible dark:border-gray-600 dark:bg-gray-800
			dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
						{...tooltip.trigger}
					>
						<IconCustom icon="regen" />
					</button>
				{/snippet}
				{regenLabel}
			</Tooltip>

			<Tooltip>
				{#snippet trigger(tooltip)}
					<button
						tabindex="0"
						onclick={onDelete}
						type="button"
						class="mt-1.5 size-8 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-900
			group-focus-within/message:visible group-hover/message:visible hover:bg-gray-100
			hover:text-blue-700 focus:z-10 focus:ring-4
			focus:ring-gray-100 focus:outline-hidden sm:invisible dark:border-gray-600 dark:bg-gray-800
			dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
						{...tooltip.trigger}
					>
						✕
					</button>
				{/snippet}
				Delete
			</Tooltip>
		</div>
	</div>

	{#if message.images?.length}
		<div class="mt-2">
			<div class="flex items-center gap-2">
				{#each message.images as img (img)}
					<div class="group/img relative">
						<button
							aria-label="expand"
							class="absolute inset-0 z-10 grid place-items-center bg-gray-800/70 opacity-0 group-hover/img:opacity-100"
							onclick={() => (previewImg = img)}
						>
							<IconMaximize />
						</button>
						<img src={img} alt="uploaded" class="size-12 rounded-lg object-cover" />
						<button
							aria-label="remove"
							type="button"
							onclick={e => {
								e.stopPropagation();
								message.images = message.images?.filter(i => i !== img);
							}}
							class="invisible absolute -top-1 -right-1 z-20 grid size-5 place-items-center rounded-full bg-gray-800 text-xs text-white group-hover/img:visible hover:bg-gray-700"
						>
							✕
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<ImgPreview bind:img={previewImg} />

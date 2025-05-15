<script lang="ts">
	import { autofocus as autofocusAction } from "$lib/attachments/autofocus.js";
	import Tooltip from "$lib/components/tooltip.svelte";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { type ConversationClass } from "$lib/state/conversations.svelte.js";
	import { images } from "$lib/state/images.svelte";
	import { PipelineTag, type ConversationMessage } from "$lib/types.js";
	import { copyToClipboard } from "$lib/utils/copy.js";
	import { FileUpload } from "melt/builders";
	import { fade } from "svelte/transition";
	import IconCopy from "~icons/carbon/copy";
	import IconImage from "~icons/carbon/image-reference";
	import IconMaximize from "~icons/carbon/maximize";
	import IconCustom from "../icon-custom.svelte";
	import LocalToasts from "../local-toasts.svelte";
	import ImgPreview from "./img-preview.svelte";
	import { AsyncQueue } from "$lib/utils/queue.js";

	type Props = {
		conversation: ConversationClass;
		message: ConversationMessage;
		index: number;
		autofocus?: boolean;
		onDelete?: () => void;
		onRegen?: () => void;
	};

	const { index, conversation, message, autofocus, onDelete, onRegen }: Props = $props();
	const isLast = $derived(index === conversation.data.messages.length - 1);

	let element = $state<HTMLTextAreaElement>();
	const autosized = new TextareaAutosize({
		element: () => element,
		input: () => message?.content ?? "",
	});
	const shouldStick = $derived(autosized.textareaHeight > 92);

	const canUploadImgs = $derived(
		message.role === "user" &&
			"pipeline_tag" in conversation.model &&
			conversation.model.pipeline_tag === PipelineTag.ImageTextToText
	);

	const fileQueue = new AsyncQueue();
	const fileUpload = new FileUpload({
		accept: "image/*",
		multiple: true,
		async onAccept(file) {
			if (!message?.images) {
				conversation.updateMessage({ index, message: { images: [] } });
			}

			fileQueue.add(async () => {
				const key = await images.upload(file);

				const prev = message.images ?? [];
				await conversation.updateMessage({ index, message: { images: [...prev, key] } });
				// We're dealing with files ourselves, so we don't want fileUpload to have any internal state,
				// to avoid conflicts
				if (fileQueue.queue.length <= 1) fileUpload.clear();
			});
		},
		disabled: () => !canUploadImgs,
	});

	let previewImg = $state<string>();

	const regenLabel = $derived.by(() => {
		if (message?.role === "assistant") return "Regenerate";
		return isLast ? "Generate from here" : "Regenerate from here";
	});
</script>

<div
	class="group/message group relative flex flex-col items-start gap-x-4 gap-y-2 border-b bg-white px-3.5 pt-4 pb-6 hover:bg-gray-100/70
	 @2xl:px-6 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/30"
	class:pointer-events-none={conversation.generating}
	{...fileUpload.dropzone}
	onclick={undefined}
>
	<div class="flex w-full flex-col items-start gap-x-4 gap-y-2 max-md:text-sm @2xl:flex-row">
		{#if fileUpload.isDragging}
			<div
				class="absolute inset-2 z-10 flex flex-col items-center justify-center rounded-xl bg-gray-800/50 backdrop-blur-md"
				transition:fade={{ duration: 100 }}
			>
				<IconImage />
				<p>Drop the image here to upload</p>
			</div>
		{/if}

		<div
			class={[
				"top-8 z-10 bg-inherit pt-3 text-sm font-semibold uppercase @2xl:basis-[130px] @2xl:self-start",
				shouldStick && "@min-2xl:sticky",
			]}
		>
			{message?.role}
		</div>
		<div class="flex w-full gap-4">
			<textarea
				bind:this={element}
				value={message?.content}
				onchange={e => {
					const el = e.target as HTMLTextAreaElement;
					const content = el?.value;
					if (!message || !content) return;
					conversation.updateMessage({ index, message: { ...message, content } });
				}}
				placeholder="Enter {message?.role} message"
				class="grow resize-none overflow-hidden rounded-lg bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:bg-white focus:bg-white focus:ring-3 @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
				rows="1"
				data-message
				{@attach autofocusAction(autofocus)}
			></textarea>

			<!-- Sticky wrapper for action buttons -->
			<div class={["top-8 z-10 self-start", shouldStick && "sticky"]}>
				<div
					class="flex flex-none flex-col items-start @2xl:flex-row @max-2xl:[&>button]:-my-px @2xl:[&>button]:-mx-px @max-2xl:[&>button:first-of-type]:rounded-t-md @2xl:[&>button:first-of-type]:rounded-l-md @max-2xl:[&>button:last-of-type]:rounded-b-md @2xl:[&>button:last-of-type]:rounded-r-md"
				>
					{#if canUploadImgs}
						<Tooltip openDelay={250}>
							{#snippet trigger(tooltip)}
								<button
									tabindex="0"
									type="button"
									class="grid size-7 place-items-center border border-gray-200 bg-white text-xs font-medium text-gray-900
					hover:bg-gray-100
					hover:text-blue-700 focus:z-10 focus:ring-4
					focus:ring-gray-100 focus:outline-hidden dark:border-gray-600
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
							<LocalToasts>
								{#snippet children({ trigger, addToast })}
									<button
										tabindex="0"
										onclick={() => {
											copyToClipboard(message.content ?? "");
											addToast({ data: { content: "✓", variant: "info" } });
										}}
										type="button"
										class="grid size-7 place-items-center border border-gray-200 bg-white text-xs font-medium text-gray-900 hover:bg-gray-100
					hover:text-blue-700
					focus:z-10 focus:ring-4 focus:ring-gray-100
					focus:outline-hidden dark:border-gray-600 dark:bg-gray-800
					dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
										{...tooltip.trigger}
										{...trigger}
									>
										<IconCopy />
									</button>
								{/snippet}
							</LocalToasts>
						{/snippet}
						Copy
					</Tooltip>

					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								tabindex="0"
								onclick={onRegen}
								type="button"
								class="grid size-7 place-items-center border border-gray-200 bg-white text-xs font-medium text-gray-900 hover:bg-gray-100
					hover:text-blue-700
					focus:z-10 focus:ring-4 focus:ring-gray-100
					focus:outline-hidden dark:border-gray-600 dark:bg-gray-800
					dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
								{...tooltip.trigger}
							>
								<IconCustom icon={message.role === "user" ? "regen" : "refresh"} />
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
								class="grid size-7 place-items-center border border-gray-200 bg-white text-xs font-medium text-gray-900 hover:bg-gray-100
					hover:text-blue-700
					focus:z-10 focus:ring-4 focus:ring-gray-100
					focus:outline-hidden dark:border-gray-600 dark:bg-gray-800
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
		</div>
	</div>

	<div class="mt-2">
		<div class="flex items-center gap-2">
			{#each message.images ?? [] as imgKey (imgKey)}
				{#await images.get(imgKey)}
					<!-- nothing -->
				{:then imgSrc}
					<div class="group/img relative">
						<button
							aria-label="expand"
							class="absolute inset-0 z-10 grid place-items-center bg-gray-800/70 opacity-0 group-hover/img:opacity-100"
							onclick={() => (previewImg = imgSrc)}
						>
							<IconMaximize />
						</button>
						<img src={imgSrc} alt="uploaded" class="size-12 rounded-md object-cover" />
						<button
							aria-label="remove"
							type="button"
							onclick={async e => {
								e.stopPropagation();
								await conversation.updateMessage({
									index,
									message: { images: message.images?.filter(i => i !== imgKey) },
								});
								images.delete(imgKey);
							}}
							class="invisible absolute -top-1 -right-1 z-20 grid size-5 place-items-center rounded-full bg-gray-800 text-xs text-white group-hover/img:visible hover:bg-gray-700"
						>
							✕
						</button>
					</div>
				{/await}
			{/each}
		</div>
	</div>
</div>

<ImgPreview bind:img={previewImg} />

<script lang="ts">
	import Tooltip from "$lib/components/tooltip.svelte";
	import { TEST_IDS } from "$lib/constants.js";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte.js";
	import { type ConversationClass } from "$lib/state/conversations.svelte.js";
	import { images } from "$lib/state/images.svelte";
	import { type ConversationMessage } from "$lib/types.js";
	import { copyToClipboard } from "$lib/utils/copy.js";
	import { cmdOrCtrl } from "$lib/utils/platform.js";
	import { AsyncQueue } from "$lib/utils/queue.js";
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import { FileUpload } from "melt/builders";
	import { fade } from "svelte/transition";
	import IconCopy from "~icons/carbon/copy";
	import IconImage from "~icons/carbon/image-reference";
	import IconMaximize from "~icons/carbon/maximize";
	import IconEdit from "~icons/carbon/edit";
	import IconCustom from "../icon-custom.svelte";
	import LocalToasts from "../local-toasts.svelte";
	import { previewImage } from "./img-preview.svelte";
	import { marked } from "marked";
	import { parseThinkingTokens } from "$lib/utils/thinking.js";
	import IconChevronDown from "~icons/carbon/chevron-down";
	import IconChevronRight from "~icons/carbon/chevron-right";
	import ArrowSplitRounded from "~icons/material-symbols/arrow-split-rounded";
	import { addToast } from "$lib/components/toaster.svelte.js";
	import { projects } from "$lib/state/projects.svelte";

	type Props = {
		conversation: ConversationClass;
		message: ConversationMessage;
		index: number;
		onDelete?: () => void;
		onRegen?: () => void;
	};

	const { index, conversation, message, onDelete, onRegen }: Props = $props();
	const isLast = $derived(index === (conversation.data.messages?.length || 0) - 1);

	const autosized = new TextareaAutosize();
	const reasoningAutosized = new TextareaAutosize();
	const shouldStick = $derived(autosized.textareaHeight > 92);

	const canUploadImgs = $derived(message.role === "user" && conversation.supportsImgUpload);

	let isEditing = $state(false);
	let isReasoningExpanded = $state(false);

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

	const regenLabel = $derived.by(() => {
		if (message?.role === "assistant") return "Regenerate";
		return isLast ? "Generate from here" : "Regenerate from here";
	});

	const parsedMessage = $derived.by(() => {
		const content = message?.content ?? "";
		return parseThinkingTokens(content);
	});

	const parsedContent = $derived.by(() => {
		if (!conversation.data.parseMarkdown || !parsedMessage.content) {
			return parsedMessage.content;
		}
		return marked(parsedMessage.content);
	});

	const parsedReasoning = $derived.by(() => {
		if (!conversation.data.parseMarkdown || !parsedMessage.thinking) {
			return parsedMessage.thinking;
		}
		return marked(parsedMessage.thinking);
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
			<!-- Content column (reasoning + main content) -->
			<div class="flex w-full flex-col gap-2">
				<!-- Reasoning section (if present) -->
				{#if parsedMessage.thinking && message?.role === "assistant"}
					<div class="flex w-full flex-col gap-2">
						<button
							onclick={() => (isReasoningExpanded = !isReasoningExpanded)}
							class="flex items-center gap-2 self-start rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
						>
							{#if isReasoningExpanded}
								<IconChevronDown class="size-4" />
							{:else}
								<IconChevronRight class="size-4" />
							{/if}
							Reasoning
						</button>

						{#if isReasoningExpanded}
							{#if conversation.data.parseMarkdown && !isEditing}
								<div
									class="relative w-full max-w-none rounded-lg bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:bg-white @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900"
								>
									<div class="prose prose-sm dark:prose-invert">
										{@html parsedReasoning}
									</div>
								</div>
							{:else}
								<textarea
									value={parsedMessage.thinking}
									onchange={e => {
										const el = e.target as HTMLTextAreaElement;
										const reasoningContent = el?.value ?? "";
										if (!message) return;
										// Reconstruct the full message with updated reasoning
										const newContent = reasoningContent
											? `<think>${reasoningContent}</think>\n\n${parsedMessage.content}`
											: parsedMessage.content;
										conversation.updateMessage({ index, message: { ...message, content: newContent } });
									}}
									onkeydown={e => {
										if ((e.ctrlKey || e.metaKey) && e.key === "g") {
											e.preventDefault();
											e.stopPropagation();
											onRegen?.();
										}
									}}
									placeholder="Enter reasoning content"
									class="w-full resize-none overflow-hidden rounded-lg bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:bg-white focus:bg-white focus:ring-3 @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
									rows="1"
									{@attach reasoningAutosized.attachment}
								></textarea>
							{/if}
						{/if}
					</div>
				{/if}

				<!-- Main content section -->
				{#if conversation.data.parseMarkdown && message?.role === "assistant"}
					<div
						class="relative max-w-none grow rounded-lg bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:bg-white @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900"
						data-message
						data-test-id={TEST_IDS.message}
						{@attach clickOutside(() => (isEditing = false))}
					>
						<Tooltip>
							{#snippet trigger(tooltip)}
								<button
									tabindex="0"
									onclick={() => {
										isEditing = !isEditing;
									}}
									type="button"
									class="absolute top-1 right-1 grid size-6 place-items-center rounded border border-gray-200 bg-white text-xs transition-opacity hover:bg-gray-100 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white {isEditing
										? 'opacity-100'
										: 'opacity-0 group-hover/message:opacity-100'}"
									{...tooltip.trigger}
								>
									<IconEdit />
								</button>
							{/snippet}
							{isEditing ? "Stop editing" : "Edit"}
						</Tooltip>

						{#if !isEditing}
							<div class="prose prose-sm dark:prose-invert">
								{@html parsedContent}
							</div>
						{:else}
							<textarea
								value={message?.content}
								onchange={e => {
									const el = e.target as HTMLTextAreaElement;
									const content = el?.value;
									if (!message || !content) return;
									conversation.updateMessage({ index, message: { ...message, content } });
								}}
								onkeydown={e => {
									if ((e.ctrlKey || e.metaKey) && e.key === "g") {
										e.preventDefault();
										e.stopPropagation();
										onRegen?.();
									}
								}}
								placeholder="Enter {message?.role} message"
								class="w-full resize-none overflow-hidden border-none bg-transparent outline-none"
								rows="1"
								{@attach autosized.attachment}
							></textarea>
						{/if}
					</div>
				{:else}
					<textarea
						value={parsedMessage.thinking ? parsedMessage.content : (message?.content ?? "")}
						onchange={e => {
							const el = e.target as HTMLTextAreaElement;
							const content = el?.value;
							if (!message || content === undefined) return;
							// If there was reasoning content, we need to preserve it when editing the main content
							const finalContent = parsedMessage.thinking
								? `<think>${parsedMessage.thinking}</think>\n\n${content}`
								: content;
							conversation.updateMessage({ index, message: { ...message, content: finalContent } });
						}}
						onkeydown={e => {
							if ((e.ctrlKey || e.metaKey) && e.key === "g") {
								e.preventDefault();
								e.stopPropagation();
								onRegen?.();
							}
						}}
						placeholder="Enter {message?.role} message"
						class="grow resize-none overflow-hidden rounded-lg bg-transparent px-2 py-2.5 ring-gray-100 outline-none group-hover/message:ring-3 hover:bg-white focus:bg-white focus:ring-3 @2xl:px-3 dark:ring-gray-600 dark:hover:bg-gray-900 dark:focus:bg-gray-900"
						rows="1"
						data-message
						data-test-id={TEST_IDS.message}
						{@attach autosized.attachment}
					></textarea>
				{/if}
			</div>

			<!-- Sticky wrapper for action buttons -->
			<div
				class={[
					"top-8 z-10 flex flex-none flex-col items-start self-start @2xl:flex-row @max-2xl:[&>button]:-my-px @2xl:[&>button]:-mx-px @max-2xl:[&>button:first-of-type]:rounded-t-md @2xl:[&>button:first-of-type]:rounded-l-md @max-2xl:[&>button:last-of-type]:rounded-b-md @2xl:[&>button:last-of-type]:rounded-r-md",
					shouldStick && "sticky",
				]}
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
					<div class="flex items-center gap-2">
						{regenLabel}

						<span
							class="inline-flex items-center gap-0.5 rounded-sm border border-white/20 bg-white/10 px-0.5 text-xs text-white/70"
						>
							{cmdOrCtrl}<span class="">G</span>
						</span>
					</div>
				</Tooltip>

				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							tabindex="0"
							onclick={async () => {
								try {
									await projects.branch(projects.activeId, index);
								} catch (error) {
									addToast({
										title: "Error",
										description: error instanceof Error ? error.message : "Failed to create branch",
										variant: "error",
									});
								}
							}}
							type="button"
							class="grid size-7 place-items-center border border-gray-200 bg-white text-xs font-medium text-gray-900 hover:bg-gray-100
					hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100
					focus:outline-hidden dark:border-gray-600 dark:bg-gray-800
					dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
							{...tooltip.trigger}
						>
							<ArrowSplitRounded />
						</button>
					{/snippet}
					Branch from here
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
							onclick={() => previewImage(imgSrc)}
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

{#if projects.current?.branchedFromId && projects.current?.branchedFromMessageIndex === index}
	<div class="mt-4 flex items-center justify-center">
		<div
			class="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400"
		>
			<ArrowSplitRounded class="mr-1 size-4" />
			<span>Branched from</span>
			<button
				onclick={() => {
					if (!projects.current?.branchedFromId) return;
					projects.activeId = projects.current.branchedFromId;
				}}
				class="font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
			>
				{projects.getBranchedFromProject(projects.current.id)?.name || "original project"}
			</button>
		</div>
	</div>
{/if}

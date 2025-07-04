<script lang="ts">
	import { observe, observed, ObservedElements } from "$lib/attachments/observe.svelte.js";
	import { conversations } from "$lib/state/conversations.svelte";
	import { projects } from "$lib/state/projects.svelte";
	import { token } from "$lib/state/token.svelte.js";
	import { isHFModel } from "$lib/types.js";
	import { iterate } from "$lib/utils/array.js";
	import { isSystemPromptSupported } from "$lib/utils/business.svelte.js";
	import IconExternal from "~icons/carbon/arrow-up-right";
	import IconWaterfall from "~icons/carbon/chart-waterfall";
	import IconCode from "~icons/carbon/code";
	import IconCompare from "~icons/carbon/compare";
	import IconInfo from "~icons/carbon/information";
	import IconSettings from "~icons/carbon/settings";
	import IconShare from "~icons/carbon/share";
	import { default as IconDelete } from "~icons/carbon/trash-can";
	import { showShareModal } from "../share-modal.svelte";
	import Toaster from "../toaster.svelte";
	import Tooltip from "../tooltip.svelte";
	import PlaygroundConversationHeader from "./conversation-header.svelte";
	import PlaygroundConversation from "./conversation.svelte";
	import GenerationConfig from "./generation-config.svelte";
	import HFTokenModal from "./hf-token-modal.svelte";
	import ModelSelectorModal from "./model-selector-modal.svelte";
	import ModelSelector from "./model-selector.svelte";
	import ProjectSelect from "./project-select.svelte";
	import { TEST_IDS } from "$lib/constants.js";
	import MessageTextarea from "./message-textarea.svelte";

	let viewCode = $state(false);
	let viewSettings = $state(false);

	let selectCompareModelOpen = $state(false);

	const systemPromptSupported = $derived(conversations.active.some(c => isSystemPromptSupported(c.model)));
	const compareActive = $derived(conversations.active.length === 2);

	function handleTokenSubmit(e: Event) {
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const submittedHfToken = (formData.get("hf-token") as string).trim() ?? "";
		const RE_HF_TOKEN = /\bhf_[a-zA-Z0-9]{34}\b/;
		if (RE_HF_TOKEN.test(submittedHfToken)) {
			token.value = submittedHfToken;
			// TODO: Only submit when previous action was trying to submit
			// submit();
		} else {
			alert("Please provide a valid HF token.");
		}
	}
</script>

{#if token.showModal}
	<HFTokenModal
		bind:storeLocallyHfToken={token.writeToLocalStorage}
		on:close={() => (token.showModal = false)}
		on:submit={handleTokenSubmit}
	/>
{/if}

<div
	class={[
		"motion-safe:animate-fade-in grid h-dvh divide-gray-200 overflow-hidden bg-gray-100/50",
		"max-md:grid-rows-[120px_1fr] max-md:divide-y",
		"dark:divide-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:[color-scheme:dark]",
		compareActive
			? "md:grid-cols-[clamp(220px,20%,350px)_minmax(0,1fr)]"
			: "md:grid-cols-[clamp(220px,20%,350px)_minmax(0,1fr)_clamp(270px,25%,300px)]",
	]}
>
	<!-- First column -->
	<div class="flex flex-col gap-2 overflow-y-auto py-3 pr-3 max-md:pl-3">
		<div class="md:pl-2">
			<ProjectSelect />
		</div>
		<div
			class="relative flex flex-1 flex-col gap-6 overflow-y-hidden rounded-r-xl border-x border-y border-gray-200/80 bg-linear-to-b from-white via-white p-3 shadow-xs max-md:rounded-xl dark:border-white/5 dark:from-gray-800/40 dark:via-gray-800/40"
			class:pointer-events-none={!systemPromptSupported}
			class:opacity-70={!systemPromptSupported}
		>
			<div class="pb-2 text-sm font-semibold uppercase">system</div>
			<textarea
				name=""
				id=""
				placeholder={systemPromptSupported
					? "Enter a custom prompt"
					: "System prompt is not supported with the chosen model."}
				value={systemPromptSupported ? (projects.current?.systemMessage ?? "") : ""}
				onchange={e => {
					if (!projects.current) return;
					projects.update({ ...projects.current, systemMessage: e.currentTarget.value });
				}}
				class="absolute inset-x-0 bottom-0 h-full resize-none bg-transparent px-3 pt-10 text-sm outline-hidden"
			></textarea>
		</div>
	</div>

	<!-- Center column -->
	<div class="relative flex h-full flex-col overflow-hidden">
		<Toaster />
		<div
			class="flex flex-1 divide-x divide-gray-200 overflow-x-auto overflow-y-hidden *:w-full max-sm:w-dvw md:pt-3 dark:divide-gray-800"
		>
			{#each conversations.active as conversation, conversationIdx (conversation)}
				<div class="flex h-full flex-col overflow-hidden max-sm:min-w-full">
					{#if compareActive}
						<PlaygroundConversationHeader
							{conversationIdx}
							{conversation}
							on:close={() => conversations.delete(conversation.data)}
						/>
					{/if}
					<PlaygroundConversation {conversation} {viewCode} onCloseCode={() => (viewCode = false)} />
				</div>
			{/each}
		</div>

		<MessageTextarea />

		<!-- Bottom bar -->
		<div
			class="relative mt-auto flex h-20 shrink-0 items-center justify-center gap-2 overflow-hidden border-t border-gray-200 px-3 whitespace-nowrap dark:border-gray-800"
		>
			<div class="flex flex-1 justify-start gap-x-2">
				{#if !compareActive}
					<button
						type="button"
						onclick={() => (viewSettings = !viewSettings)}
						class="flex h-[39px] items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 focus:outline-hidden md:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
					>
						<div class="text-black dark:text-white">
							<IconSettings />
						</div>
						{!viewSettings ? "Settings" : "Hide"}
					</button>
				{/if}
				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							type="button"
							onclick={conversations.reset}
							class="btn size-[39px]"
							{...tooltip.trigger}
							data-test-id={TEST_IDS.reset}
						>
							<IconDelete />
						</button>
					{/snippet}
					Clear conversation
				</Tooltip>
			</div>
			<div
				class="pointer-events-none absolute inset-0 flex flex-1 shrink-0 items-center justify-around gap-x-8 text-center text-sm text-gray-500 max-xl:hidden"
			>
				{#each iterate(conversations.generationStats) as [{ latency, tokens }, isLast]}
					{@const baLeft = observed["bottom-actions"].rect.left}
					{@const tceRight = observed["token-count-end"].offset.right}
					<span
						style:translate={isLast ? (baLeft - 12 < tceRight ? baLeft - tceRight - 12 + "px" : "") : undefined}
						{@attach observe({
							name: isLast ? ObservedElements.TokenCountEnd : ObservedElements.TokenCountStart,
							useRaf: true,
						})}
					>
						{tokens} tokens · Latency {latency}ms
					</span>
				{/each}
			</div>
			<div class="flex flex-1 justify-end gap-x-2">
				<button
					type="button"
					onclick={() => (viewCode = !viewCode)}
					class="btn"
					{@attach observe({ name: ObservedElements.BottomActions, useRaf: true })}
				>
					<IconCode />
					{!viewCode ? "View Code" : "Hide Code"}
				</button>
			</div>
		</div>
	</div>

	<!-- Last column -->
	{#if !compareActive}
		<div class={[viewSettings && "max-md:fixed max-md:inset-0 max-md:bottom-20 max-md:backdrop-blur-lg"]}>
			<div
				class={[
					"flex h-full flex-col p-3 max-md:absolute max-md:inset-x-0 max-md:bottom-0",
					viewSettings ? "max-md:fixed" : "max-md:hidden",
				]}
			>
				<div
					class="flex flex-1 flex-col gap-6 overflow-y-hidden rounded-xl border border-gray-200/80 bg-white bg-linear-to-b from-white via-white p-3 shadow-xs dark:border-white/5 dark:bg-gray-900 dark:from-gray-800/40 dark:via-gray-800/40"
				>
					<div class="flex flex-col gap-2">
						<ModelSelector conversation={conversations.active[0]!} />
						<div class="flex items-center gap-2 self-end px-2 text-xs whitespace-nowrap">
							<button
								class="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
								onclick={() => (selectCompareModelOpen = true)}
							>
								<IconCompare />
								Compare
							</button>
							{#if isHFModel(conversations.active[0]?.model)}
								<a
									href="https://huggingface.co/{conversations.active[0]?.model.id}?inference_provider={conversations
										.active[0].data.provider}"
									target="_blank"
									class="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
								>
									<IconExternal class="text-2xs" />
									Model page
								</a>
							{/if}
						</div>
					</div>

					<GenerationConfig conversation={conversations.active[0]!} />

					<div class="mt-auto flex items-center justify-end gap-4 whitespace-nowrap">
						<button
							onclick={() => projects.current && showShareModal(projects.current)}
							class="flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
						>
							<IconShare class="text-xs" />
							Share
						</button>
						<a
							class="flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
							href="https://huggingface.co/spaces/victor/providers-metrics"
							target="_blank"
						>
							<IconWaterfall class="text-xs" />
							Metrics
						</a>
						{#if token.value}
							<button
								onclick={token.reset}
								class="flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="text-xs" width="1em" height="1em" viewBox="0 0 32 32">
									<path
										fill="currentColor"
										d="M23.216 4H26V2h-7v6h2V5.096A11.96 11.96 0 0 1 28 16c0 6.617-5.383 12-12 12v2c7.72 0 14-6.28 14-14c0-5.009-2.632-9.512-6.784-12"
									/>
									<path fill="currentColor" d="M16 20a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3M15 9h2v9h-2z" /><path
										fill="currentColor"
										d="M16 4V2C8.28 2 2 8.28 2 16c0 4.977 2.607 9.494 6.784 12H6v2h7v-6h-2v2.903A11.97 11.97 0 0 1 4 16C4 9.383 9.383 4 16 4"
									/>
								</svg>
								Reset token
							</button>
						{/if}
					</div>

					<div class="mt-auto hidden">
						<div class="mb-3 flex items-center justify-between gap-2">
							<label for="default-range" class="block text-sm font-medium text-gray-900 dark:text-white"
								>API Quota</label
							>
							<span
								class="rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
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
		</div>
	{/if}
</div>

<div class="absolute bottom-6 left-4 flex items-center gap-2 max-md:hidden">
	<a
		target="_blank"
		href="https://huggingface.co/docs/inference-providers/tasks/chat-completion"
		class="flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
	>
		<div class="text-xs">
			<IconInfo />
		</div>
		View Docs
	</a>
	<span class="dark:text-gray-500">·</span>
	<a
		target="_blank"
		href="https://huggingface.co/spaces/huggingface/inference-playground/discussions/1"
		class="flex items-center gap-1 text-sm text-gray-500 underline decoration-gray-300 hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
	>
		Give feedback
	</a>
</div>

{#if selectCompareModelOpen}
	<ModelSelectorModal
		conversation={conversations.active[0]!}
		onModelSelect={m => {
			const data = {
				...conversations.active[0]?.data,
				projectId: projects.activeId,
				modelId: m,
			};
			delete data.id;
			conversations.create(data);
		}}
		onClose={() => (selectCompareModelOpen = false)}
	/>
{/if}

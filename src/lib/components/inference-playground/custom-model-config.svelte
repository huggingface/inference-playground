<script lang="ts" module>
	let model = $state<Partial<CustomModel> | undefined>(undefined);
	let onSubmit = $state<OpenCustomModelConfigArgs["onSubmit"]>();

	type OpenCustomModelConfigArgs = {
		model?: typeof model;
		onSubmit?: (model: CustomModel) => void;
		onDelete?: () => void;
	};

	export function openCustomModelConfig(args?: OpenCustomModelConfigArgs) {
		model = $state.snapshot(args?.model ?? {});
		onSubmit = args?.onSubmit;
	}

	function close() {
		model = undefined;
		onSubmit = undefined;
	}
</script>

<script lang="ts">
	import { autofocus } from "$lib/actions/autofocus.js";
	import { clickOutside } from "$lib/actions/click-outside.js";
	import { models } from "$lib/state/models.svelte";
	import { PipelineTag, pipelineTagLabel, type Conversation, type CustomModel } from "$lib/types.js";
	import { createFieldValidation } from "$lib/utils/form.svelte.js";
	import { keys } from "$lib/utils/object.svelte.js";
	import { isValidURL } from "$lib/utils/url.js";
	import { Select } from "melt/components";
	import { watch } from "runed";
	import type { HTMLFormAttributes } from "svelte/elements";
	import { fade, scale } from "svelte/transition";
	import typia from "typia";
	import IconCaret from "~icons/carbon/chevron-down";
	import IconCross from "~icons/carbon/close";
	import Tooltip from "../tooltip.svelte";
	import { handleNonStreamingResponse } from "./utils.svelte.js";

	let dialog: HTMLDialogElement | undefined = $state();
	const exists = $derived(!!models.custom.find(m => m._id === model?._id));

	$effect(() => {
		if (model !== undefined) {
			dialog?.showModal();
		} else {
			setTimeout(() => {
				dialog?.close();
				clear();
				endpointValidation.reset();
			}, 250);
		}
	});

	type Message = {
		type: "error" | "success";
		content: string;
	};
	let message = $state<Message | null>(null);

	const error = (content: string) => (message = { type: "error", content }) satisfies Message;
	const success = (content: string) => (message = { type: "success", content }) satisfies Message;
	const clear = () => (message = null);

	watch(
		() => $state.snapshot(model),
		(_, prev) => {
			if (prev === undefined) testSuccessful = exists;
			else testSuccessful = false;
		},
		{ lazy: true }
	);

	let testing = $state(false);
	let testSuccessful = $state(false);
	const onsubmit: HTMLFormAttributes["onsubmit"] = async e => {
		e.preventDefault();
		clear();
		const isTest = e.submitter?.dataset.form === "test";
		if (isTest) {
			testing = true;
			testSuccessful = false;

			const conv: Conversation = {
				model: {
					...model,
					_id: "",
					/** These will never be empty, because of our form validation */
					id: model?.id ?? "",
					endpointUrl: model?.endpointUrl ?? "",
				},
				messages: [
					{
						role: "user",
						content: "test",
					},
				],
				config: {},
				systemMessage: { role: "system", content: "" },
				streaming: false,
			};
			try {
				await handleNonStreamingResponse(conv);
				success("Test successful!");
				testSuccessful = true;
			} catch (err) {
				if (err instanceof Error) {
					error(`Test failed: ${err.message}`);
				} else {
					error(`An unknown error occurred during testing.`);
				}
			} finally {
				testing = false;
			}
		} else {
			const withUUID = { _id: crypto.randomUUID(), ...model };
			if (!typia.is<CustomModel>(withUUID)) return;
			models.upsertCustom(withUUID);
			onSubmit?.(withUUID);
			model = undefined;
		}
	};

	const endpointValidation = createFieldValidation({
		validate: v => {
			if (!v) return "Endpoint URL is required";
			if (!isValidURL(v)) return "Invalid URL";
			if (!v.endsWith("/v1")) return "Endpoint URL should *probably* end with /v1";
		},
	});
</script>

<dialog class="backdrop:bg-transparent" bind:this={dialog} onclose={() => close()}>
	{#if model !== undefined}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<!-- Content -->
			<form
				class="relative w-xl rounded-xl bg-white shadow-sm dark:bg-gray-900"
				use:clickOutside={() => close()}
				transition:scale={{ start: 0.975, duration: 250 }}
				{onsubmit}
			>
				<div class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-800">
					<h2 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">
						Configure custom endpoint
					</h2>
					<button
						type="button"
						class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
						onclick={close}
					>
						<div class="text-xl">
							<IconCross />
						</div>
						<span class="sr-only">Close modal</span>
					</button>
				</div>
				<!-- Modal body -->
				<div class="flex flex-col gap-3 p-4 md:p-5">
					<label class="flex flex-col gap-2">
						<p class="block text-sm font-medium text-gray-900 dark:text-white">
							Model ID <span class="text-red-800 dark:text-red-300">*</span>
						</p>
						<input
							use:autofocus
							bind:value={model.id}
							required
							placeholder="e.g. mistralai/mistral-large-2407"
							type="text"
							class="input block w-full"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<p class="block text-sm font-medium text-gray-900 dark:text-white">
							Endpoint URL <span class="text-red-800 dark:text-red-300">*</span>
						</p>
						<input
							bind:value={model.endpointUrl}
							placeholder="e.g. https://your-provider.com/api/v1"
							required
							type="text"
							class="input block w-full"
							{...endpointValidation.attrs}
						/>
						<p class="text-xs text-red-300">{endpointValidation.msg}</p>
					</label>
					<label class="flex flex-col gap-2">
						<p class="block text-sm font-medium text-gray-900 dark:text-white">Access token</p>
						<input
							bind:value={model.accessToken}
							placeholder="XXXXXXXXXXXXXXXXXXXX"
							type="text"
							class="input block w-full"
						/>
						<p class="text-sm text-gray-500">Stored locally - not sent to our server</p>
					</label>

					<div class="flex flex-col gap-2">
						<Select bind:value={model.pipeline_tag}>
							{#snippet children(select)}
								<label for={select.ids.trigger} class="block text-sm font-medium text-gray-900 dark:text-white">
									Supported task
								</label>

								<button
									{...select.trigger}
									class={[
										"relative flex grow items-center justify-between gap-6 overflow-hidden rounded-lg border bg-gray-100/80 px-3 py-1.5 leading-tight whitespace-nowrap shadow-sm",
										"hover:brightness-95 dark:border-gray-700 dark:bg-gray-800 dark:hover:brightness-110",
									]}
								>
									<div class="flex items-center gap-1 text-sm">
										{pipelineTagLabel[model?.pipeline_tag ?? PipelineTag.TextGeneration]}
									</div>
									<div
										class="absolute right-2 grid size-4 flex-none place-items-center rounded-sm bg-gray-100 text-xs dark:bg-gray-600"
									>
										<IconCaret />
									</div>
								</button>

								<div {...select.content} class="rounded-lg border bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
									{#each keys(PipelineTag) as key (key)}
										{@const tag = PipelineTag[key]}
										{@const label = pipelineTagLabel[tag]}
										{@const option = select.getOption(tag)}
										<div {...option} class="group block w-full p-1 text-sm dark:text-white">
											<div
												class="rounded-md py-1.5 pr-1 pl-2 group-data-[highlighted]:bg-gray-200 dark:group-data-[highlighted]:bg-gray-700"
											>
												<span>
													{label}
												</span>
											</div>
										</div>
									{/each}
								</div>
							{/snippet}
						</Select>
					</div>

					<div class="relative flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="strict"
								name="strict"
								type="checkbox"
								class="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
								bind:checked={model.supports_response_schema}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="strict" class="font-medium text-gray-300">Supports Structured Output</label>
							<p id="strict-description" class="text-gray-500">
								If checked, will allow you to define a JSON response schema.
							</p>
						</div>
					</div>

					{#if message}
						<div
							class={[
								"mt-2 rounded-lg border p-3 text-sm",
								message.type === "error" &&
									"border-red-400 bg-red-100 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300",
								message.type === "success" &&
									"border-green-400 bg-green-100 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300",
							]}
							role="alert"
						>
							{message.content}
						</div>
					{/if}
				</div>

				<!-- Modal footer -->
				<div class="flex gap-2 rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
					{#if exists}
						<button
							type="button"
							class="rounded-lg bg-red-100 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-200 focus:ring-4 focus:ring-red-300 focus:outline-none dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40 dark:focus:ring-red-900"
							onclick={() => {
								if (model?._id) models.removeCustom(model._id);
								close();
							}}
							disabled={testing}
						>
							Delete
						</button>
					{/if}
					<!-- Reverse flex so that submit is the button called on enter -->
					<div class="ml-auto flex flex-row-reverse items-center gap-2">
						<Tooltip disabled={testSuccessful} openDelay={0} closeOnPointerDown={false}>
							{#snippet trigger(tooltip)}
								<button
									data-form="submit"
									type="submit"
									class={[
										"rounded-lg bg-black px-5 py-2.5 text-sm",
										"font-medium text-white",
										"hover:nd:bg-gray-900 focus:ring-4 focus:ring-gray-300",
										"focus:outline-none disabled:cursor-not-allowed disabled:opacity-75",
										"dark:hover:nd:bg-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:focus:ring-gray-700",
									]}
									disabled={testing || !testSuccessful}
									{...tooltip.trigger}
								>
									Submit
								</button>
							{/snippet}
							{#if !testSuccessful}
								<p>Test your model before saving</p>
							{/if}
						</Tooltip>
						<button
							data-form="test"
							type="submit"
							class="flex items-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white
									hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-none
									disabled:!bg-black dark:border-gray-700
									dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:disabled:!bg-gray-800"
							disabled={testing}
						>
							{#if testing}
								<svg
									class="mr-2 h-4 w-4 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Testing...
							{:else}
								Test
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	{/if}
</dialog>

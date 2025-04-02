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
	import { type Conversation, type CustomModel } from "$lib/types.js";
	import type { HTMLFormAttributes } from "svelte/elements";
	import { fade, scale } from "svelte/transition";
	import IconCross from "~icons/carbon/close";
	import typia from "typia";
	import { handleNonStreamingResponse } from "./utils.js";

	let dialog: HTMLDialogElement | undefined = $state();
	const exists = $derived(!!models.custom.find(m => m._id === model?._id));

	$effect(() => {
		if (model !== undefined) {
			dialog?.showModal();
		} else {
			setTimeout(() => {
				dialog?.close();
				clear();
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

	const onsubmit: HTMLFormAttributes["onsubmit"] = async e => {
		e.preventDefault();
		clear();
		const isTest = e.submitter?.dataset.form === "test";
		if (isTest) {
			testing = true;

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

	let testing = $state(false);
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
						/>
					</label>
					<label class="flex flex-col gap-2">
						<p class="block text-sm font-medium text-gray-900 dark:text-white">Access Token</p>
						<input
							bind:value={model.accessToken}
							placeholder="XXXXXXXXXXXXXXXXXXXX"
							type="text"
							class="input block w-full"
						/>
						<p class="text-sm text-gray-500">Stored locally - not sent to our server</p>
					</label>

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
						<button
							data-form="submit"
							type="submit"
							class="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white
									hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-none
									disabled:!bg-black dark:border-gray-700
									dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:disabled:!bg-gray-800"
							disabled={testing}
						>
							Submit
						</button>
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

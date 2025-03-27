<script lang="ts" module>
	let model = $state<CustomModel | undefined>(undefined);

	export function openLocalModelConfig(m?: CustomModel) {
		model = $state.snapshot(m);
	}

	function close() {
		model = undefined;
	}
</script>

<script lang="ts">
	import { autofocus } from "$lib/actions/autofocus.js";

	import { clickOutside } from "$lib/actions/click-outside.js";
	import type { CustomModel } from "$lib/types.js";
	import { fade, scale } from "svelte/transition";
	import IconCross from "~icons/carbon/close";
	import CustomProviderSelect from "./custom-provider-select.svelte";
	import type { HTMLFormAttributes } from "svelte/elements";
	import { models } from "$lib/state/models.svelte";

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (model !== undefined) {
			dialog?.showModal();
		} else {
			setTimeout(() => {
				dialog?.close();
			}, 250);
		}
	});

	const onsubmit: HTMLFormAttributes["onsubmit"] = e => {
		e.preventDefault();
		if (!model) return;
		models.upsertCustom(model);
		model = undefined;
	};
</script>

<dialog class="backdrop:bg-transparent" bind:this={dialog} onclose={() => close()}>
	{#if model}
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
						Configure custom model
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
							placeholder="e.g. HuggingFaceTB/SmolVLM2-2.2B-Instruct"
							type="text"
							class="input block w-full"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<p class="block text-sm font-medium text-gray-900 dark:text-white">
							Provider <span class="text-red-800 dark:text-red-300">*</span>
						</p>
						<CustomProviderSelect bind:provider={model.provider} />
					</label>
					<label class="flex flex-col gap-2">
						<p class="block text-sm font-medium text-gray-900 dark:text-white">
							Endpoint URL <span class="text-xs opacity-75">(optional)</span>
						</p>
						<input
							bind:value={model.endpointUrl}
							placeholder="e.g. https://some-provider.ai/api/v1"
							type="text"
							class="input block w-full"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<p class="block text-sm font-medium text-gray-900 dark:text-white">
							Access Token <span class="text-xs opacity-75">(optional)</span>
						</p>
						<input
							bind:value={model.accessToken}
							placeholder="hf-XXXXXXXXXXXXXXXXXXXX"
							type="text"
							class="input block w-full"
						/>
					</label>
				</div>

				<!-- Modal footer -->
				<div class="flex rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
					<button
						type="submit"
						class="ml-auto rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
					>
						Submit
					</button>
				</div>
			</form>
		</div>
	{/if}
</dialog>

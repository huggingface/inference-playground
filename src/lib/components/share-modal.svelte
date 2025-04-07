<script lang="ts" module>
	let project = $state<Project>();

	export function showShareModal(p: Project) {
		project = p;
	}

	function close() {
		project = undefined;
	}
</script>

<script lang="ts">
	import { clickOutside } from "$lib/actions/click-outside.js";
	import { session } from "$lib/state/session.svelte";
	import type { Project } from "$lib/types.js";
	import { copyToClipboard } from "$lib/utils/copy.js";
	import { decodeString, encodeObject } from "$lib/utils/encode.js";
	import { fade, scale } from "svelte/transition";
	import typia from "typia";
	import IconCross from "~icons/carbon/close";
	import IconCopy from "~icons/carbon/copy";
	import IconSave from "~icons/carbon/save";
	import LocalToasts from "./local-toasts.svelte";
	import { addToast as addToastGlobally } from "./toaster.svelte.js";

	let dialog: HTMLDialogElement | undefined = $state();

	const open = $derived(!!project);
	const encoded = $derived(encodeObject(project));
	let pasted = $state("");

	$effect(() => {
		if (open) {
			dialog?.showModal();
		} else {
			setTimeout(() => {
				dialog?.close();
				pasted = "";
			}, 250);
		}
	});

	const isProject = typia.createIs<Project>();
</script>

<dialog class="backdrop:bg-transparent" bind:this={dialog} onclose={() => close()}>
	{#if open}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<!-- Content -->
			<div
				class="relative w-xl max-w-[calc(100dvw-2rem)] rounded-xl bg-white shadow-sm dark:bg-gray-900"
				use:clickOutside={() => close()}
				transition:scale={{ start: 0.975, duration: 250 }}
			>
				<div class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-800">
					<h2 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">Sharing</h2>
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
				<div class="p-4 md:p-5">
					<h3 class="text-lg font-semibold">Share your project</h3>
					<p>Copy an unique string that shares your entire project until this point.</p>
					<div class="mt-4 flex gap-2">
						<input
							class="grow cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							type="text"
							value={encoded}
							disabled
						/>
						<LocalToasts>
							{#snippet children({ addToast, trigger })}
								<button
									{...trigger}
									class="btn flex items-center gap-2"
									onclick={() => {
										copyToClipboard(encoded);
										addToast({ data: { content: "Copied to clipboard", variant: "info" } });
									}}
								>
									<IconCopy />
									Copy
								</button>
							{/snippet}
						</LocalToasts>
					</div>

					<div class="my-4 flex items-center gap-2">
						<div class="h-px grow bg-neutral-500" aria-hidden="true"></div>
						<span class="text-xs text-neutral-400">or</span>
						<div class="h-px grow bg-neutral-500" aria-hidden="true"></div>
					</div>

					<h3 class="text-lg font-semibold">Save a copied project</h3>
					<p>Paste a copied project string, and save it for your local usage.</p>
					<LocalToasts>
						{#snippet children({ addToast, trigger })}
							<form
								class="mt-4 flex gap-2"
								onsubmit={e => {
									e.preventDefault();
									const decoded = decodeString(pasted);
									if (!isProject(decoded)) {
										addToast({ data: { content: "String isn't valid", variant: "danger" } });
										return;
									}
									session.addProject({ ...decoded, name: `Saved - ${decoded.name}`, id: crypto.randomUUID() });
									addToastGlobally({
										variant: "success",
										title: "Saved project",
										description: "The project you pasted in was successfully saved.",
									});
									close();
								}}
							>
								<input
									class="grow rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
									type="text"
									bind:value={pasted}
								/>
								<button {...trigger} class="btn flex items-center gap-2" type="submit">
									<IconSave />
									Save
								</button>
							</form>
						{/snippet}
					</LocalToasts>
				</div>

				<!-- Modal footer -->
				<!--
				<div class="flex rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
					<button
						type="submit"
						class="ml-auto rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
						>Submit</button
					>
				</div>
				-->
			</div>
		</div>
	{/if}
</dialog>

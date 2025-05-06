<script lang="ts">
	import { dev } from "$app/environment";
	import { models } from "$lib/state/models.svelte";
	import { token } from "$lib/state/token.svelte.js";
	import { compareStr } from "$lib/utils/compare.js";
	import { Popover } from "melt/builders";
	import { openCustomModelConfig } from "./inference-playground/custom-model-config.svelte";
	import { prompt } from "./prompts.svelte";
	import { showQuotaModal } from "./quota-modal.svelte";
	import type { ToastData } from "./toaster.svelte.js";
	import { addToast } from "./toaster.svelte.js";

	let innerWidth = $state<number>();
	let innerHeight = $state<number>();

	function toggleTheme() {
		document.body.classList.toggle("dark");
	}

	const popover = new Popover();

	type Action = {
		label: string;
		cb: () => void;
	};

	const actions: Action[] = [
		{ label: "Toggle Theme", cb: toggleTheme },
		{
			label: "Log models to console",
			cb: () => {
				console.log(models.all);
			},
		},
		{
			label: "Test prompt",
			cb: async () => {
				console.log(await prompt("Test prompt"));
			},
		},
		{
			label: "Show quota modal",
			cb: () => {
				showQuotaModal();
			},
		},
		{
			label: "Show token modal",
			cb: () => {
				token.showModal = true;
			},
		},
		{
			label: "Test toast",
			cb: () => {
				const toastData: ToastData[] = [
					{
						title: "Success",
						description: "Congratulations! It worked!",
						variant: "success",
					},
					{
						title: "Warning",
						description: "Please check again.",
						variant: "warning",
					},
					{
						title: "Error",
						description: "Something did not work!",
						variant: "error",
					},

					{
						title: "Big one",
						description:
							"This one has a lot of text. like seriously. its a lot. so this toast should be really big! and we see how that affects the other ones. ",
						variant: "success",
					},
				];

				addToast(toastData[Math.floor(Math.random() * toastData.length)]!);
			},
		},
		{
			label: "Pre-filled custom model config",
			cb: () => {
				openCustomModelConfig({
					model: {
						id: "google/gemini-2.0-flash-001",
						endpointUrl: "https://openrouter.ai/api",
					},
				});
			},
		},
	].toSorted((a, b) => compareStr(a.label, b.label));
</script>

<svelte:window bind:innerWidth bind:innerHeight />

{#if dev}
	<div class="abs-x-center fixed bottom-0 z-50">
		<button class="rounded-t-md bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600" {...popover.trigger}>
			Debug
		</button>

		<div
			class="mb-2 w-128 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			{...popover.content}
		>
			<h3 class="mb-3 text-lg font-semibold dark:text-white">Debug Menu</h3>

			<div class="space-y-3">
				<div class="text-sm dark:text-gray-300">
					<p>Viewport: {innerWidth}x{innerHeight}</p>
					<p>Environment: {import.meta.env.MODE}</p>
				</div>

				<div class="grid grid-cols-2 gap-2">
					{#each actions as { label, cb }}
						<button
							class="rounded-md bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
							onclick={cb}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Add any additional styles here */
</style>

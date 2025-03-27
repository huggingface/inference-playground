<script lang="ts">
	import { createBubbler, preventDefault } from "svelte/legacy";

	const bubble = createBubbler();
	import { clickOutside } from "$lib/actions/click-outside.js";
	import { createEventDispatcher, onDestroy, onMount } from "svelte";

	import IconCross from "~icons/carbon/close";
	import { autofocus } from "$lib/actions/autofocus.js";

	interface Props {
		storeLocallyHfToken?: boolean;
	}

	let { storeLocallyHfToken = $bindable(false) }: Props = $props();

	let backdropEl = $state<HTMLDivElement>();
	let modalEl = $state<HTMLDivElement>();

	const dispatch = createEventDispatcher<{ close: void }>();

	function handleKeydown(event: KeyboardEvent) {
		const { key } = event;
		if (key === "Escape") {
			event.preventDefault();
			dispatch("close");
		}
	}

	onMount(() => {
		document.getElementById("app")?.setAttribute("inert", "true");
	});

	onDestroy(() => {
		// remove inert attribute if this is the last modal
		if (document.querySelectorAll('[role="dialog"]:not(#app *)').length === 1) {
			document.getElementById("app")?.removeAttribute("inert");
		}
	});
</script>

<div
	id="default-modal"
	aria-hidden="true"
	class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85"
	bind:this={backdropEl}
>
	<div
		role="dialog"
		tabindex="-1"
		class="relative max-h-full w-full max-w-xl p-4 outline-hidden"
		bind:this={modalEl}
		onkeydown={handleKeydown}
		use:clickOutside={() => dispatch("close")}
	>
		<form onsubmit={preventDefault(bubble("submit"))} class="relative rounded-lg bg-white shadow-sm dark:bg-gray-900">
			<div class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-800">
				<h3 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">
					<img
						alt="Hugging Face's logo"
						class="w-7"
						src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
					/> Add a Hugging Face Token
				</h3>
				<button
					type="button"
					onclick={() => dispatch("close")}
					class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
				>
					<div class="text-xl">
						<IconCross />
					</div>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<!-- Modal body -->
			<div class="p-4 md:p-5">
				<p class="mb-5 text-base leading-relaxed text-gray-800 2xl:text-balance dark:text-gray-300">
					You need a free Hugging Face token to use this application. <strong class="font-semibold"
						>Make sure you create a token with Inference API permission.</strong
					><br /> Your token is kept safe by only being used from your browser.
				</p>
				<div>
					<label for="hf-token" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
						Hugging Face Token
					</label>
					<input
						use:autofocus
						required
						placeholder="Enter HF Token"
						type="text"
						id="hf-token"
						name="hf-token"
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
					/>
				</div>
				<label class="mt-4 flex items-center gap-x-1.5 text-gray-900 dark:text-gray-200">
					<input type="checkbox" bind:checked={storeLocallyHfToken} />
					<p class="text-sm leading-none">Save to local storage for future use</p></label
				>
			</div>

			<!-- Modal footer -->
			<div class="flex items-center justify-between rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
				<a
					href="https://huggingface.co/settings/tokens/new?globalPermissions=inference.serverless.write&tokenType=fineGrained"
					tabindex="-1"
					target="_blank"
					class="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
					>Create new token</a
				>

				<button
					type="submit"
					class="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
					>Submit</button
				>
			</div>
		</form>
	</div>
</div>

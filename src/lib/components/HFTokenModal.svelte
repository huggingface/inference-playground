<!-- Main modal -->
<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';

	let backdropEl: HTMLDivElement;
	let modalEl: HTMLDivElement;

	const dispatch = createEventDispatcher<{ close: void }>();

	function handleKeydown(event: KeyboardEvent) {
		// close on ESC
		if (event.key === 'Escape') {
			event.preventDefault();
			dispatch('close');
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (window?.getSelection()?.toString()) {
			return;
		}
		if (event.target === backdropEl) {
			dispatch('close');
		}
	}

	onMount(() => {
		document.getElementById('app')?.setAttribute('inert', 'true');
		modalEl.focus();
	});

	onDestroy(() => {
		if (!browser) return;
		// remove inert attribute if this is the last modal
		if (document.querySelectorAll('[role="dialog"]:not(#app *)').length === 1) {
			document.getElementById('app')?.removeAttribute('inert');
		}
	});
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
	id="default-modal"
	aria-hidden="true"
	class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85"
	bind:this={backdropEl}
	on:click|stopPropagation={handleBackdropClick}
>
	<div
		role="dialog"
		tabindex="-1"
		class="relative max-h-full w-full max-w-xl p-4 outline-none"
		bind:this={modalEl}
		on:keydown={handleKeydown}
	>
		<form on:submit|preventDefault class="relative rounded-lg bg-white shadow dark:bg-gray-900">
			<div
				class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-600"
			>
				<h3 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">
					<img
						alt="Hugging Face's logo"
						class="w-7"
						src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
					/> Use a Hugging Face Token
				</h3>
				<button
					type="button"
					on:click={() => dispatch('close')}
					class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
				>
					<svg
						class="size-3"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 14 14"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
						/>
					</svg>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<!-- Modal body -->
			<div class="space-y-6 p-4 md:p-5">
				<p class="text-base leading-relaxed text-gray-700 2xl:text-balance dark:text-gray-400">
					You need a free Hugging Face token to use this application. <strong class="font-semibold"
						>Make sure you create a token with Inference API permission.</strong
					><br /> Your token is kept safe by only being used from your browser.
				</p>
				<div class="mb-6">
					<label for="hf-token" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
						>Hugging Face Token</label
					>
					<input
						required
						placeholder="Enter HF Token"
						type="text"
						id="hf-token"
						name="hf-token"
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
					/>
				</div>
			</div>

			<!-- Modal footer -->
			<div
				class="flex items-center justify-between rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-600"
			>
				<a
					href="https://huggingface.co/settings/tokens?new_token=true"
					tabindex="-1"
					target="_blank"
					class="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
					>Create new token</a
				>

				<button
					type="submit"
					class="mb-2 me-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
					>Submit</button
				>
			</div>
		</form>
	</div>
</div>

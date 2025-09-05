<script lang="ts" module>
	let img = $state<string>();

	export const previewImage = (i: string) => {
		img = i;
	};
</script>

<script lang="ts">
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import { fade, scale } from "svelte/transition";
	import IconCross from "~icons/carbon/close";

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (img) {
			dialog?.showModal();
		} else {
			setTimeout(() => dialog?.close(), 250);
		}
	});
</script>

<dialog
	class="backdrop:bg-transparent"
	bind:this={dialog}
	onclose={e => {
		e.preventDefault();
		img = undefined;
	}}
>
	{#if img}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<!-- Content -->
			<img
				class="max-h-[calc(100vh-120px)] max-w-[calc(100vw-120px)] object-contain"
				src={img}
				alt=""
				{@attach clickOutside(() => (img = undefined))}
				transition:scale={{ start: 0.975, duration: 250 }}
			/>

			<button
				type="button"
				class="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
				onclick={() => (img = undefined)}
				aria-label="Close modal"
			>
				<div class="text-xl">
					<IconCross />
				</div>
			</button>
		</div>
	{/if}
</dialog>

<script lang="ts">
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import type { Snippet } from "svelte";
	import type { EventHandler } from "svelte/elements";
	import IconCross from "~icons/carbon/close";

	interface Props {
		title: string | Snippet;
		children: Snippet;
		footer?: Snippet;
		onClose?: () => void;
		open: boolean;
		onSubmit?: EventHandler<SubmitEvent>;
		class?: string;
	}

	let { children, onClose, open, title, footer, onSubmit, class: classes }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (open) {
			dialog?.showModal();
		} else {
			dialog?.close();
		}
	});
</script>

<dialog bind:this={dialog} onclose={onClose}>
	{#if open}
		<form class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85" onsubmit={onSubmit}>
			<div
				class={["relative w-xl rounded-xl bg-white shadow-sm dark:bg-gray-900", classes]}
				{@attach clickOutside(() => onClose?.())}
			>
				<div class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-800">
					{#if typeof title === "string"}
						<h3 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">
							{title}
						</h3>
					{:else}
						{@render title()}
					{/if}
					<button
						type="button"
						class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
						onclick={onClose}
					>
						<div class="text-xl">
							<IconCross />
						</div>
						<span class="sr-only">Close modal</span>
					</button>
				</div>
				<!-- Modal body -->
				<div class="p-4 md:p-5">
					{@render children()}
				</div>

				{#if footer}
					<!-- Modal footer -->
					<div class="flex rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
						{@render footer()}
					</div>
				{/if}
			</div>
		</form>
	{/if}
</dialog>

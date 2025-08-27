<script lang="ts">
	import { fly } from "svelte/transition";
	import { toaster } from "./toaster.svelte.js";
	import { Progress } from "melt/components";
	import Close from "~icons/carbon/close";
	import { omit } from "$lib/utils/object.svelte.js";
	import { AnimationFrames } from "runed";
	import { conversations } from "$lib/state/conversations.svelte.js";

	let toastHeights = $state<number[]>([]);
	new AnimationFrames(() => {
		const rootEl = document.getElementById(toaster.root.id);
		if (!rootEl) return;

		const toastEls = Array.from(rootEl.querySelectorAll("[data-melt-toaster-toast-content]"));
		toastHeights = toastEls.map(el => el.clientHeight);
	});

	const isComparing = $derived(conversations.active.length > 1);

	const GAP = 8;

	function getToastStyle(i: number) {
		// Remember, the order is reversed! Meaning i=0 was the first toast, so its the last
		// we want to show.
		const n = toaster.toasts.length - i - 1;
		if (n === 0) return "";
		const reversedHeights = toastHeights.toReversed();
		const yHover = -1 * reversedHeights.slice(0, n).reduce((a, b) => a + b + GAP, 0);

		const y = -n * 10;

		return `
			--y-hover: ${yHover}px;
			--y: ${y}px;
		`;
	}

	function getRootStyle() {
		const heightHover = toastHeights.reduce((a, b) => a + b + GAP, 0);
		return `
			--h-hover: ${heightHover}px;
		`;
	}
</script>

<div
	{...omit(toaster.root, "popover")}
	class={["absolute right-2 bottom-40 flex w-[300px] flex-col ", !isComparing && "md:right-0"]}
	style:--toasts={toaster.toasts.length}
	style={getRootStyle()}
>
	{#each toaster.toasts as toast, i (toast.id)}
		<div
			class="flex w-full flex-col justify-center rounded-xl bg-white px-4 py-4 text-left transition dark:bg-gray-800"
			{...toast.content}
			style:--n={toaster.toasts.length - i}
			in:fly={{ y: 20, opacity: 0 }}
			out:fly={{ y: 20 }}
			style={getToastStyle(i)}
		>
			<h3 {...toast.title} class="text-sm font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">
				{toast.data.title}
			</h3>

			{#if toast.data.description}
				<p {...toast.description} class="max-w-[200px] text-xs text-gray-700 dark:text-gray-300">
					{toast.data.description}
				</p>
			{/if}

			<button
				{...toast.close}
				aria-label="dismiss toast"
				class="absolute top-2 right-2 bg-transparent text-gray-300 hover:text-gray-400 dark:hover:text-gray-100"
			>
				<Close class="size-4" />
			</button>

			{#if toast.closeDelay !== 0}
				<div class="absolute right-4 bottom-4 h-[4px] w-[30px] overflow-hidden rounded-full">
					<Progress value={toast.percentage}>
						{#snippet children(progress)}
							<div {...progress.root} class="relative h-full w-full overflow-hidden bg-gray-200 dark:bg-gray-950">
								<div
									{...progress.progress}
									class="h-full w-full -translate-x-(--progress)"
									class:bg-green-400={toast.data.variant === "success"}
									class:bg-orange-400={toast.data.variant === "warning"}
									class:bg-red-500={toast.data.variant === "error"}
								></div>
							</div>
						{/snippet}
					</Progress>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	:global([popover]) {
		inset: unset;
	}

	[data-melt-toaster-root] {
		--gap: 0.75rem;
		--hover-offset: 0rem;
		/* --toast-height: 4.5rem; */
		--hidden-offset: 0.75rem;

		--hidden-toasts: calc(var(--toasts) - 1);

		overflow: visible;
		gap: 0;
		background: unset;
		padding: 0;

		border: none;
		height: var(--h);
	}

	[data-melt-toaster-root]:hover {
		height: var(--h-hover);
	}

	[data-melt-toaster-toast-content] {
		position: absolute;
		pointer-events: auto;
		bottom: 0;
		left: 0;
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

		transform-origin: 50% 0%;
		transition: all 350ms ease;

		translate: 0 var(--y);
	}

	:global(.dark [data-melt-toaster-toast-content]) {
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.25);
	}

	[data-melt-toaster-toast-content]:nth-last-child(n + 4) {
		z-index: 1;
		scale: 0.925;
		opacity: 0;
	}

	[data-melt-toaster-toast-content]:nth-last-child(-n + 3) {
		z-index: 2;
		scale: 0.95;
	}

	[data-melt-toaster-toast-content]:nth-last-child(-n + 2) {
		z-index: 3;
		scale: 0.975;
	}

	[data-melt-toaster-toast-content]:nth-last-child(-n + 1) {
		z-index: 4;
		scale: 1;
	}

	[data-melt-toaster-root]:hover [data-melt-toaster-toast-content] {
		scale: 1;
		opacity: 1;
		translate: 0 var(--y-hover);
	}
</style>

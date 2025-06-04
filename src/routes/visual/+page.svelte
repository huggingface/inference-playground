<script lang="ts">
	import { masonry } from "$lib/attachments/masonry.js";
	import { default as IconPhoto } from "~icons/lucide/image";
	import IconX from "~icons/lucide/x";
	import Sidebar, { reuseSettings } from "./sidebar.svelte";
	import { isVisualItem, visualItems, type GeneratingItem, type VisualItem } from "./state.svelte.js";
	import VisualCard from "./visual-card.svelte";

	let columns = $state(3);
	let expandedItem: VisualItem | null = $state(null);
	let dialogElement: HTMLDialogElement;

	function expandItem(item: VisualItem | GeneratingItem) {
		if (!isVisualItem(item)) return;
		expandedItem = item;
		dialogElement?.showModal();
	}

	function closeExpandedItem() {
		expandedItem = null;
		dialogElement?.close();
	}
</script>

<svelte:window
	onkeydown={e => {
		if (e.key === "Escape" && expandedItem) {
			closeExpandedItem();
		}
	}}
/>

<div class="flex h-lvh dark:text-white">
	<Sidebar />

	<!-- Main content -->
	<main class="dark:bg-mandarin-peel-1 flex-1 overflow-auto bg-stone-50 p-6">
		{#if visualItems.all.length === 0}
			<div class="flex h-full items-center justify-center text-stone-500">
				<div class="text-center">
					<IconPhoto class="mx-auto mb-4 h-16 w-16 text-stone-400" />
					<p class="text-lg font-medium">No content generated yet</p>
					<p class="text-sm">Click "Generate" to create your first</p>
				</div>
			</div>
		{:else}
			<div
				class="grid grid-cols-[repeat(var(--columns),_1fr)] grid-rows-[masonry] items-start gap-6"
				style="--columns: {columns};"
				role="grid"
				aria-label="Generated content"
				{@attach masonry}
			>
				{#each visualItems.all as item (item.id)}
					<VisualCard
						{item}
						onDelete={() => visualItems.delete(item)}
						onReuse={() => reuseSettings(item)}
						onExpand={() => expandItem(item)}
					/>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Item Expansion Dialog -->
<dialog
	bind:this={dialogElement}
	class="backdrop:bg-opacity-75 m-auto max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-white p-0 shadow-2xl backdrop:bg-black dark:bg-stone-800"
	aria-labelledby="expanded-item-title"
	onclick={e => {
		// Close dialog when clicking on backdrop
		if (e.target === dialogElement) {
			closeExpandedItem();
		}
	}}
>
	<button
		class="fixed top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-stone-400 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-600 dark:hover:text-white"
		onclick={closeExpandedItem}
		aria-label="Close expanded {expandedItem?.data.type || 'item'}"
	>
		<IconX class="h-6 w-6" />
	</button>
	{#if expandedItem && expandedItem.src}
		{#if expandedItem.data.type === "image"}
			<img
				src={expandedItem.src}
				alt="Expanded view: {expandedItem.config?.prompt}"
				class="max-h-[70vh] max-w-full object-contain"
			/>
		{:else if expandedItem.data.type === "video"}
			<video src={expandedItem.src} controls autoplay loop muted class="max-h-[70vh] max-w-full object-contain">
				<track kind="captions" />
			</video>
		{/if}
	{/if}
</dialog>

<style>
	@reference "../../app.css";

	.sidebar {
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
	}

	.sidebar-header {
		background: linear-gradient(135deg, var(--color-lemon-punch-3), var(--color-lemon-punch-5));
	}

	/* Dialog styles */
	dialog {
		border: none;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.75);
	}
</style>

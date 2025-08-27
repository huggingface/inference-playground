<script lang="ts">
	import { masonry } from "$lib/attachments/masonry.js";
	import { default as IconPhoto } from "~icons/lucide/image";
	import IconX from "~icons/lucide/x";
	import Sidebar from "./(components)/sidebar.svelte";
	import Settings, { reuseSettings } from "./(components)/settings.svelte";
	import { isVisualItem, visualItems, type GeneratingItem, type VisualItem } from "./(state)/visual-items.svelte.js";
	import VisualCard from "./(components)/visual-card.svelte";
	import { Drawer } from "vaul-svelte";
	import { settings } from "./(state)/settings.svelte.js";
	import HFTokenModal from "$lib/components/inference-playground/hf-token-modal.svelte";
	import { token } from "$lib/state/token.svelte.js";

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

	function handleTokenSubmit(e: Event) {
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const submittedHfToken = (formData.get("hf-token") as string).trim() ?? "";
		const RE_HF_TOKEN = /\bhf_[a-zA-Z0-9]{34}\b/;
		if (RE_HF_TOKEN.test(submittedHfToken)) {
			token.value = submittedHfToken;
		} else {
			alert("Please provide a valid HF token.");
		}
	}
</script>

<svelte:window
	onkeydown={e => {
		if (e.key === "Escape" && expandedItem) {
			closeExpandedItem();
		}
	}}
/>

{#if token.showModal}
	<HFTokenModal
		bind:storeLocallyHfToken={token.writeToLocalStorage}
		on:close={() => (token.showModal = false)}
		on:submit={handleTokenSubmit}
	/>
{/if}

<div class="flex h-lvh dark:text-white" data-vaul-drawer-wrapper>
	<div class="hidden lg:block">
		<Sidebar />
	</div>

	<Drawer.Root shouldScaleBackground>
		<Drawer.Trigger
			class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-stone-600 bg-gradient-to-b from-stone-700 to-stone-800  px-3 py-1 text-sm opacity-50 transition-opacity hover:opacity-100 lg:hidden"
		>
			Open settings
		</Drawer.Trigger>
		<Drawer.Portal>
			<Drawer.Overlay class="fixed inset-0 bg-black/40" />
			<Drawer.Content
				class="fixed inset-x-0 bottom-0 mt-24 flex max-h-[80%] min-h-[max(200px,40%)] flex-col overflow-hidden rounded-t-[10px] text-white"
			>
				<div
					class="bg-pasilla-15 absolute top-3 left-1/2 h-1.5 w-12 flex-shrink-0 -translate-x-1/2 rounded-full"
					aria-hidden="true"
				></div>
				<div class="flex h-full flex-1 flex-col overflow-hidden rounded-t-xl bg-red-500">
					<!-- Drag handle -->
					<Settings />
				</div></Drawer.Content
			>
		</Drawer.Portal>
	</Drawer.Root>

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
				class="grid grid-rows-[masonry] items-start gap-6 lg:grid-cols-[repeat(var(--columns),_1fr)]"
				style="--columns: {settings.columns};"
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
	/* Dialog styles */
	dialog {
		border: none;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.75);
	}
</style>

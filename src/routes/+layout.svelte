<script lang="ts">
	import DebugMenu from "$lib/components/debug-menu.svelte";
	import CustomModelConfig from "$lib/components/inference-playground/custom-model-config.svelte";
	import ImgPreview from "$lib/components/inference-playground/img-preview.svelte";
	import Prompts from "$lib/components/prompts.svelte";
	import QuotaModal from "$lib/components/quota-modal.svelte";
	import ShareModal from "$lib/components/share-modal.svelte";
	import IconLoadingLoop from "~icons/line-md/loading-loop";
	import "../app.css";

	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:boundary>
	{@render children?.()}
	{#snippet pending()}
		<p class="abs-center absolute dark:text-white">🤗</p>
		<IconLoadingLoop class="abs-center absolute text-6xl dark:text-blue-300" />
	{/snippet}
</svelte:boundary>

<DebugMenu />
<Prompts />
<QuotaModal />
<ShareModal />
<CustomModelConfig />
<ImgPreview />

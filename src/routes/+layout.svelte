<script lang="ts">
	import DebugMenu from "$lib/components/debug-menu.svelte";
	import CustomModelConfig from "$lib/components/inference-playground/custom-model-config.svelte";
	import ImgPreview from "$lib/components/inference-playground/img-preview.svelte";
	import Prompts from "$lib/components/prompts.svelte";
	import QuotaModal from "$lib/components/quota-modal.svelte";
	import ShareModal from "$lib/components/share-modal.svelte";
	import { conversations } from "$lib/state/conversations.svelte";
	import "../app.css";

	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();
	conversations.init();
</script>

<svelte:boundary>
	{@render children?.()}
	{#snippet pending()}
		<!-- pending -->
	{/snippet}
</svelte:boundary>

<DebugMenu />
<Prompts />
<QuotaModal />
<ShareModal />
<CustomModelConfig />
<ImgPreview />

<script lang="ts">
	import CustomModelConfig from "$lib/components/inference-playground/custom-model-config.svelte";
	import DebugMenu from "$lib/components/debug-menu.svelte";
	import Prompts from "$lib/components/prompts.svelte";
	import QuotaModal from "$lib/components/quota-modal.svelte";
	import ShareModal from "$lib/components/share-modal.svelte";
	import "../app.css";
	import { session } from "$lib/state/session.svelte";

	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();
	session.init();
</script>

{@render children?.()}

<DebugMenu />
<Prompts />
<QuotaModal />
<ShareModal />
<CustomModelConfig />

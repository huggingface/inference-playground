<script lang="ts">
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

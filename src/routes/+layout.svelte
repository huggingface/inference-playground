<script lang="ts">
	import "../app.css";

	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:boundary>
	{@render children?.()}
	{#snippet pending()}
		<!-- pending -->
	{/snippet}
</svelte:boundary>

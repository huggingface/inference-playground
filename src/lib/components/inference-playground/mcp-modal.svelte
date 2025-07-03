<script lang="ts">
	import { mcpServers } from "$lib/state/mcps.svelte.js";
	import IconPlus from "~icons/carbon/add";
	import Dialog from "../dialog.svelte";
	import McpCard from "./mcp-card.svelte";

	interface Props {
		open: boolean;
	}

	let { open = $bindable(false) }: Props = $props();
</script>

<Dialog
	class="!w-2xl max-w-[90vw]"
	title="MCP Servers"
	{open}
	onClose={() => {
		open = false;
	}}
>
	<!-- Server List -->
	<div class="space-y-4">
		{#if mcpServers.all.length === 0}
			<p class="text-sm text-gray-500">No MCP servers configured yet.</p>
		{:else}
			<div class="space-y-2">
				{#each mcpServers.all as server (server.id)}
					<McpCard {server} />
				{/each}
			</div>
		{/if}
	</div>

	<button class="btn-sm mt-2 flex w-full items-center gap-2" onclick={() => (showAddForm = true)}>
		<IconPlus class="h-4 w-4" />
		Add Server
	</button>
</Dialog>

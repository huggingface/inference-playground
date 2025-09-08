<script lang="ts">
	import { mcpServers, type MCPFormData } from "$lib/state/mcps.svelte.js";
	import IconPlus from "~icons/carbon/add";
	import Dialog from "../dialog.svelte";
	import McpCard from "./mcp-card.svelte";
	import McpForm from "./mcp-form.svelte";

	interface Props {
		open: boolean;
	}

	let { open = $bindable(false) }: Props = $props();
	let showAddForm = $state(false);

	async function addServer(formData: MCPFormData) {
		await mcpServers.create(formData);
		showAddForm = false;
	}
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

	{#if showAddForm}
		<div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
			<h3 class="mb-3 text-lg font-medium">Add New Server</h3>
			<McpForm onSubmit={addServer} onCancel={() => (showAddForm = false)} submitLabel="Add Server" />
		</div>
	{:else}
		<button class="btn-sm mt-2 flex w-full items-center gap-2" onclick={() => (showAddForm = true)}>
			<IconPlus class="h-4 w-4" />
			Add Server
		</button>
	{/if}
</Dialog>

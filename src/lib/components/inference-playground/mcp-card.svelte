<script lang="ts">
	import { mcpServers, type MCPServerEntity, type MCPFormData } from "$lib/state/mcps.svelte.js";
	import { projects } from "$lib/state/projects.svelte.js";
	import { extractDomain } from "$lib/utils/url.js";
	import IconEdit from "~icons/carbon/edit";
	import IconDelete from "~icons/carbon/trash-can";
	import Switch from "../switch.svelte";
	import McpForm from "./mcp-form.svelte";

	interface Props {
		server: MCPServerEntity;
	}

	let { server }: Props = $props();

	let editing = $state(false);

	async function deleteServer() {
		await mcpServers.delete(server.id);

		// Remove from project's enabled MCPs if it was enabled
		const currentProject = projects.current;
		if (!currentProject?.enabledMCPs?.includes(server.id)) return;
		await projects.update({
			...currentProject,
			enabledMCPs: currentProject.enabledMCPs.filter(mcpId => mcpId !== server.id),
		});
	}

	async function setEnabled(enabled: boolean) {
		const currentProject = projects.current;
		if (!currentProject) return;

		const enabledMCPs = currentProject.enabledMCPs || [];
		const newEnabledMCPs = enabled ? [...enabledMCPs, server.id] : enabledMCPs.filter(id => id !== server.id);

		await projects.update({
			...currentProject,
			enabledMCPs: newEnabledMCPs,
		});
	}

	const isEnabled = $derived(projects.current?.enabledMCPs?.includes(server.id) || false);

	async function saveServer(formData: MCPFormData) {
		await mcpServers.update({
			...server,
			...formData,
		});
		editing = false;
	}

	function getFaviconUrl(url: string): string {
		const domain = extractDomain(url);
		return `https://www.google.com/s2/favicons?domain=https://${domain}&sz=64`;
	}

	function urlWithoutSubpaths(url: string): string {
		const urlObj = new URL(url);
		return urlObj.origin;
	}
</script>

<div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
	<div class="flex justify-between">
		<div>
			<div class="flex items-center gap-1">
				<img src={getFaviconUrl(server.url)} alt="Server Icon" class="size-4 rounded-full" />
				<span class="font-bold">{server.name}</span>
			</div>
			<p class="mt-1 truncate text-sm dark:text-neutral-300">
				<span class="rounded bg-blue-900 px-0.75 py-0.25 uppercase">
					{server.protocol}
				</span>
				<span>
					{urlWithoutSubpaths(server.url)}
				</span>
			</p>
			{#if server.headers && Object.keys(server.headers).length > 0}
				<p class="mt-1 text-xs dark:text-neutral-400">
					Headers: {Object.keys(server.headers).length} configured
				</p>
			{/if}
		</div>
		<div class="flex flex-col items-end justify-between gap-2">
			<Switch bind:value={() => isEnabled, v => setEnabled(v)} />
			<div class="flex items-center gap-2">
				{#if !editing}
					<button class="btn-mini" onclick={() => (editing = true)}>
						<IconEdit class="h-4 w-4" />
						<span>Edit</span>
					</button>
					<button
						class="btn-mini text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
						onclick={() => deleteServer()}
					>
						<IconDelete class="h-4 w-4" />
						<span>Delete</span>
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if editing}
		<div class="mt-2 border-t border-neutral-500 pt-2 dark:border-neutral-700">
			<McpForm {server} onSubmit={saveServer} onCancel={() => (editing = false)} />
		</div>
	{/if}
</div>

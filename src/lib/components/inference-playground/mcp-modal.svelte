<script lang="ts">
	import { mcpServers, type MCPServerEntity, type MCPProtocol } from "$lib/state/mcps.svelte.js";
	import { projects } from "$lib/state/projects.svelte.js";
	import IconPlus from "~icons/carbon/add";
	import IconDelete from "~icons/carbon/trash-can";
	import IconEdit from "~icons/carbon/edit";
	import Dialog from "../dialog.svelte";
	import { RadioGroup } from "melt/builders";
	import { extractDomain } from "$lib/utils/url.js";
	import Switch from "../switch.svelte";
	import McpCard from "./mcp-card.svelte";

	interface Props {
		open: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	let editingServer: MCPServerEntity | null = $state(null);
	let showAddForm = $state(false);

	// Form state for adding/editing servers
	let formData = $state({
		name: "",
		url: "",
		protocol: "sse" as MCPProtocol,
		headers: {} as Record<string, string>,
	});

	let newHeaderKey = $state("");
	let newHeaderValue = $state("");

	const protocolOptions: MCPProtocol[] = ["sse", "http"];
	const protocolRadioGroup = new RadioGroup({
		value: "sse",
	});

	function resetForm() {
		formData = {
			name: "",
			url: "",
			protocol: "sse",
			headers: {},
		};
		newHeaderKey = "";
		newHeaderValue = "";
		editingServer = null;
		showAddForm = false;
		protocolRadioGroup.value = "sse";
	}

	function startEdit(server: MCPServerEntity) {
		editingServer = server;
		formData = {
			name: server.name,
			url: server.url,
			protocol: server.protocol,
			headers: { ...(server.headers || {}) },
		};
		protocolRadioGroup.value = server.protocol;
		showAddForm = true;
	}

	function addHeader() {
		if (newHeaderKey.trim() && newHeaderValue.trim()) {
			formData.headers = { ...formData.headers, [newHeaderKey.trim()]: newHeaderValue.trim() };
			newHeaderKey = "";
			newHeaderValue = "";
		}
	}

	function removeHeader(key: string) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { [key]: _, ...rest } = formData.headers;
		formData.headers = rest;
	}

	async function saveServer() {
		if (!formData.name.trim() || !formData.url.trim()) return;

		const serverData = {
			...formData,
			protocol: protocolRadioGroup.value as MCPProtocol,
		};

		if (editingServer) {
			await mcpServers.update({
				...editingServer,
				...serverData,
			});
		} else {
			await mcpServers.create(serverData);
		}

		resetForm();
	}

	async function deleteServer(id: string) {
		await mcpServers.delete(id);
		// Remove from project's enabled MCPs if it was enabled
		const currentProject = projects.current;
		if (currentProject?.enabledMCPs?.includes(id)) {
			await projects.update({
				...currentProject,
				enabledMCPs: currentProject.enabledMCPs.filter(mcpId => mcpId !== id),
			});
		}
	}

	async function toggleServerForProject(serverId: string, enabled: boolean) {
		const currentProject = projects.current;
		if (!currentProject) return;

		const enabledMCPs = currentProject.enabledMCPs || [];
		const newEnabledMCPs = enabled ? [...enabledMCPs, serverId] : enabledMCPs.filter(id => id !== serverId);

		await projects.update({
			...currentProject,
			enabledMCPs: newEnabledMCPs,
		});
	}

	function isServerEnabledForProject(serverId: string): boolean {
		return projects.current?.enabledMCPs?.includes(serverId) || false;
	}

	function getFaviconUrl(url: string): string {
		const domain = extractDomain(url);
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	}

	function urlWithoutSubpaths(url: string): string {
		const urlObj = new URL(url);
		return urlObj.origin;
	}
</script>

<Dialog
	class="!w-2xl max-w-[90vw]"
	title="MCP Servers"
	{open}
	onClose={() => {
		open = false;
		resetForm();
	}}
>
	<div class="space-y-6">
		<!-- Server List -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Available Servers</h3>
				<button class="btn-sm flex items-center gap-2" onclick={() => (showAddForm = true)}>
					<IconPlus class="h-4 w-4" />
					Add Server
				</button>
			</div>

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
	</div></Dialog
>

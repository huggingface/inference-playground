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
						<div class="flex justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
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
							<div class="flex flex-col items-end justify-between">
								<Switch
									bind:value={() => isServerEnabledForProject(server.id), v => toggleServerForProject(server.id, v)}
								/>
								<div class="flex items-center gap-2">
									<button class="btn-mini" onclick={() => startEdit(server)}>
										<IconEdit class="h-4 w-4" />
										<span>Edit</span>
									</button>
									<button
										class="btn-mini text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
										onclick={() => deleteServer(server.id)}
									>
										<IconDelete class="h-4 w-4" />
										<span>Delete</span>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Add/Edit Form -->
		{#if showAddForm}
			<div class="border-t border-gray-200 pt-6 dark:border-gray-700">
				<h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
					{editingServer ? "Edit Server" : "Add New Server"}
				</h3>

				<div class="space-y-4">
					<!-- Name and URL -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="mcp-name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
								Name
							</label>
							<input
								id="mcp-name"
								type="text"
								bind:value={formData.name}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
								placeholder="My MCP Server"
							/>
						</div>
						<div>
							<label for="mcp-url" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"> URL </label>
							<input
								id="mcp-url"
								type="url"
								bind:value={formData.url}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
								placeholder="https://mcp.example.com/sse"
							/>
						</div>
					</div>

					<!-- Protocol Selection -->
					<div>
						<label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"> Protocol </label>
						<div
							class="flex items-center gap-0.5 rounded-md border border-gray-300 bg-white p-0.5 text-sm dark:border-gray-600 dark:bg-gray-800"
							{...protocolRadioGroup.root}
						>
							{#each protocolOptions as protocol}
								{@const item = protocolRadioGroup.getItem(protocol)}
								<div
									class={[
										"cursor-pointer rounded px-3 py-1 capitalize select-none",
										item.checked ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700/70",
									]}
									{...item.attrs}
								>
									{protocol.toUpperCase()}
								</div>
							{/each}
						</div>
					</div>

					<!-- Headers -->
					<div>
						<label for="mcp-headers" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
							Headers
						</label>
						<div class="space-y-2">
							{#each Object.entries(formData.headers) as [key, value]}
								<div class="flex items-center gap-2">
									<input
										type="text"
										value={key}
										readonly
										class="w-32 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
									/>
									<span class="text-gray-500">:</span>
									<input
										type="text"
										{value}
										readonly
										class="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
									/>
									<button
										class="btn-mini text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
										onclick={() => removeHeader(key)}
									>
										<IconDelete class="h-4 w-4" />
									</button>
								</div>
							{/each}
							<div class="flex items-center gap-2">
								<input
									id="mcp-headers"
									type="text"
									bind:value={newHeaderKey}
									class="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
									placeholder="Header"
								/>
								<span class="text-gray-500">:</span>
								<input
									type="text"
									bind:value={newHeaderValue}
									class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
									placeholder="Value"
									onkeydown={e => e.key === "Enter" && addHeader()}
								/>
								<button class="btn-mini" onclick={addHeader}>
									<IconPlus class="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>

					<!-- Form Actions -->
					<div class="flex items-center gap-2 pt-4">
						<button class="btn" onclick={saveServer} disabled={!formData.name.trim() || !formData.url.trim()}>
							{editingServer ? "Update" : "Add"} Server
						</button>
						<button class="btn-secondary" onclick={resetForm}> Cancel </button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</Dialog>

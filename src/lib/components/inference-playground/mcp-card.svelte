<script lang="ts">
	import { mcpServers, type MCPProtocol, type MCPServerEntity } from "$lib/state/mcps.svelte.js";
	import { projects } from "$lib/state/projects.svelte.js";
	import { createFieldValidation } from "$lib/utils/form.svelte";
	import { extractDomain, isValidURL } from "$lib/utils/url.js";
	import { RadioGroup } from "melt/builders";
	import typia from "typia";
	import IconEdit from "~icons/carbon/edit";
	import IconDelete from "~icons/carbon/trash-can";
	import Switch from "../switch.svelte";

	interface Props {
		server: MCPServerEntity;
	}

	let { server }: Props = $props();

	let editing = $state(true);

	// Form state for adding/editing servers
	let formState = $derived({
		name: server.name,
		url: server.url,
		protocol: server.protocol,
		headers: server.headers,
	});

	const protocolOptions: MCPProtocol[] = ["sse", "http"];
	const protocolRadioGroup = new RadioGroup({
		value: () => formState.protocol,
		onValueChange: v => {
			if (!typia.is<MCPProtocol>(v)) return;
			formState.protocol = v;
		},
	});

	const nameField = createFieldValidation({
		validate: v => {
			if (!v) return "Server name is required";
			if (v.trim().length === 0) return "Server name cannot be empty";
		},
	});

	const urlField = createFieldValidation({
		validate: v => {
			if (!v) return "Server URL is required";
			if (v.trim().length === 0) return "Server URL cannot be empty";
			if (!isValidURL(v)) return "Invalid URL";
		},
	});

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

	function getFaviconUrl(url: string): string {
		const domain = extractDomain(url);
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
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
		<div class="flex flex-col items-end justify-between">
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
		<form class="mt-2 border-t border-neutral-500 pt-2 dark:border-neutral-700">
			<label class="flex flex-col gap-2">
				<p class="block text-sm font-medium text-gray-900 dark:text-white">
					Server Name <span class="text-red-800 dark:text-red-300">*</span>
				</p>
				<input
					type="text"
					bind:value={formState.name}
					class="input block w-full"
					placeholder="My MCP Server"
					{...nameField.attrs}
					required
				/>
				<p class="text-xs text-red-300">{nameField.msg}</p>
			</label>
			<label class="mt-3 flex flex-col gap-2">
				<p class="block text-sm font-medium text-gray-900 dark:text-white">
					Server URL <span class="text-red-800 dark:text-red-300">*</span>
				</p>
				<input
					type="url"
					bind:value={formState.url}
					class="input block w-full"
					placeholder="https://mcp.example.com/sse"
					{...urlField.attrs}
					required
				/>
				<p class="text-xs text-red-300">{urlField.msg}</p>
			</label>

			<div class="mt-3 flex flex-col gap-2">
				<p class="block text-sm font-medium text-gray-900 dark:text-white">Protocol</p>
				<div class="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700" role="radiogroup" aria-label="Server Protocol">
					{#each protocolOptions as protocol}
						<label class="relative flex-1 cursor-pointer">
							<input
								type="radio"
								name="protocol-option"
								value={protocol}
								bind:group={formState.protocol}
								class="peer sr-only"
							/>
							<div
								class="flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 ease-in-out peer-checked:bg-white peer-checked:text-gray-900 peer-checked:shadow dark:text-gray-300 dark:peer-checked:bg-gray-800 dark:peer-checked:text-white"
							>
								{protocol.toUpperCase()}
							</div>
							<span
								aria-hidden="true"
								class="absolute inset-0 z-0 rounded-md transition-all duration-200 ease-in-out peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-100 dark:peer-focus:ring-offset-gray-700"
							></span>
						</label>
					{/each}
				</div>
			</div>
		</form>
	{/if}
</div>

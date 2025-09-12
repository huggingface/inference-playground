<script lang="ts">
	import { type MCPProtocol, type MCPServerEntity, type MCPFormData } from "$lib/state/mcps.svelte.js";
	import { createFieldValidation } from "$lib/utils/form.svelte";
	import { entries } from "$lib/utils/object.svelte";
	import { isValidURL } from "$lib/utils/url.js";
	import IconAdd from "~icons/carbon/add";
	import IconCheck from "~icons/carbon/checkmark";
	import IconDelete from "~icons/carbon/trash-can";

	interface Props {
		server?: MCPServerEntity;
		onSubmit: (formData: MCPFormData) => Promise<void>;
		onCancel: () => void;
		submitLabel?: string;
	}

	let { server, onSubmit, onCancel, submitLabel = "Save" }: Props = $props();

	let formState = $state({
		name: server?.name || "",
		url: server?.url || "",
		protocol: (server?.protocol || "sse") as MCPProtocol,
		headers: entries(server?.headers || {}),
	});

	const protocolOptions: MCPProtocol[] = ["sse", "http"];

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

	const disabled = $derived(!nameField.valid || !urlField.valid);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!nameField.valid || !urlField.valid) return;

		await onSubmit({
			...formState,
			headers: formState.headers.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
		});
	}
</script>

<form class="space-y-3" onsubmit={handleSubmit}>
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

	<label class="flex flex-col gap-2">
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

	<div class="flex flex-col gap-2">
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

	<div class="flex flex-col gap-2">
		<p class="block text-sm font-medium text-gray-900 dark:text-white">Headers</p>
		{#each formState.headers || [] as _, i (i)}
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={formState.headers[i]![0]}
					class="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					placeholder="Header name"
				/>
				<span class="text-gray-500">:</span>
				<input
					type="text"
					bind:value={formState.headers[i]![1]}
					class="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					placeholder="Header value"
				/>
				<button
					class="btn-sm !h-auto self-stretch text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
					onclick={() => {
						formState.headers.splice(i, 1);
					}}
					type="button"
				>
					<IconDelete class="h-4 w-4" />
				</button>
			</div>
		{/each}
		<button
			class="btn-sm self-start"
			type="button"
			onclick={() => {
				formState.headers.push(["", ""]);
				formState = formState;
			}}
		>
			<IconAdd class="size-4" />
			Add Header
		</button>
	</div>

	<div class="flex items-center gap-2">
		<button class="btn-sm" {disabled}>
			<IconCheck /><span>{submitLabel}</span>
		</button>
		<button class="btn-sm" type="button" onclick={onCancel}> Cancel </button>
	</div>
</form>

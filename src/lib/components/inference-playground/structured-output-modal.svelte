<script lang="ts">
	import { Synced } from "$lib/spells/synced.svelte";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte";
	import type { ConversationClass } from "$lib/state/conversations.svelte.js";
	import { safeParse } from "$lib/utils/json.js";
	import { keys, omit } from "$lib/utils/object.svelte";
	import { onchange, oninput } from "$lib/utils/template.js";
	import { RadioGroup } from "melt/builders";
	import { codeToHtml } from "shiki";
	import typia from "typia";
	import IconX from "~icons/carbon/close";
	import Dialog from "../dialog.svelte";

	interface Props {
		conversation: ConversationClass;
		open: boolean;
	}

	let { conversation, open = $bindable(false) }: Props = $props();

	let tempSchema = $derived(conversation.data.structuredOutput?.schema ?? "");

	const modes = ["form", "code"] as const;
	const radioGroup = new RadioGroup({
		value: modes[0],
	});

	/*
	-- Example schema --

	{
		"name": "capital_lookup",
			"description": "Returns the capital city for a given country",
			"schema": {
				"type": "object",
				"properties": {
					"country":  { "type": "string", "description": "Country name echoed back" },
					"capital":  { "type": "string", "description": "Capital city of the country" }
				},
				"required": ["country", "capital"],
				"additionalProperties": false
			},
			"strict": true
	}

	*/

	type Schema = {
		name?: string;
		description?: string;
		type: "object";
		properties?: { [key: string]: { type: string; description?: string } };
		required?: string[];
		additionalProperties?: boolean;
		strict?: boolean;
	};

	export function parseJsonSchema(): Schema {
		const parsed = safeParse(conversation.data.structuredOutput?.schema ?? "");
		return typia.is<Schema>(parsed) ? parsed : { type: "object" };
	}

	const schemaObj = new Synced<Schema>({
		value: parseJsonSchema,
		onChange(v) {
			const required = Array.from(new Set(v.required)).filter(name => keys(v.properties ?? {}).includes(name));
			const validated: Schema = {
				name: v.name,
				description: v.description,
				type: v.type,
				...omit(v, "name", "description", "type"),
				required,
			};
			conversation.update({
				structuredOutput: { ...conversation.data.structuredOutput, schema: JSON.stringify(validated, null, 2) },
			});
		},
	});

	function updateSchema(obj: Partial<Schema>) {
		schemaObj.current = { ...schemaObj.current, ...obj };
	}

	let textarea = $state<HTMLTextAreaElement>();
	new TextareaAutosize({
		element: () => textarea,
		input: () => tempSchema,
	});
</script>

<Dialog title="Edit Structured Output" {open} onClose={() => (open = false)}>
	<div class="flex justify-end">
		<div
			class="flex items-center gap-0.5 rounded-md border bg-gray-900 p-0.5 text-sm dark:border-gray-600 dark:bg-gray-800"
			{...radioGroup.root}
		>
			{#each modes as mode}
				{@const item = radioGroup.getItem(mode)}
				<div
					class={[
						"rounded px-2 py-0.5 capitalize select-none",
						item.checked ? " dark:bg-gray-700" : "hover:bg-gray-700/70",
					]}
					{...item.attrs}
				>
					{mode}
				</div>
			{/each}
		</div>
	</div>

	{#if radioGroup.value === "form"}
		<div class="fade-y -mx-2 mt-2 -mb-4 max-h-200 space-y-4 overflow-auto px-2 py-4">
			<!-- Top-level properties -->
			<div>
				<label for="schema-name" class="block text-sm font-medium text-gray-300">Name</label>
				<input
					type="text"
					id="schema-name"
					class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 px-2 py-1 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
					bind:value={() => schemaObj.current.name, value => updateSchema({ name: value })}
				/>
			</div>

			<div>
				<label for="schema-description" class="block text-sm font-medium text-gray-300">Description</label>
				<textarea
					id="schema-description"
					rows="3"
					class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 px-2 py-1 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
					bind:value={() => schemaObj.current.description, value => updateSchema({ description: value })}
				></textarea>
			</div>

			<!-- Properties Section -->
			<div class="border-t border-gray-700 pt-4">
				<h3 class="text-lg leading-6 font-medium text-gray-100">Properties</h3>
				{#if schemaObj.current.properties}
					<div class="mt-3 space-y-3">
						{#each Object.entries(schemaObj.current.properties) as [propertyName, propertyDefinition] (propertyName)}
							<div class="relative space-y-2 rounded-md border border-gray-700 p-3">
								<div>
									<label for="{propertyName}-name" class="block text-xs font-medium text-gray-400"> Name </label>
									<input
										type="text"
										id="{propertyName}-name"
										class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
										value={propertyName}
										{...onchange(value => {
											const updatedProperties = { ...schemaObj.current.properties };
											if (!updatedProperties[propertyName]) return;
											updatedProperties[value] = updatedProperties[propertyName];
											delete updatedProperties[propertyName];
											updateSchema({ properties: updatedProperties });
										})}
									/>
								</div>

								<button
									type="button"
									class="absolute top-2 right-2 text-red-400 hover:text-red-500"
									onclick={() => {
										const updatedProperties = { ...schemaObj.current.properties };
										delete updatedProperties[propertyName];
										updateSchema({ properties: updatedProperties });
									}}
									aria-label="delete"
								>
									<IconX />
								</button>

								<div>
									<label for="{propertyName}-type" class="block text-xs font-medium text-gray-400">Type</label>
									<select
										id="{propertyName}-type"
										class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
										bind:value={
											() => propertyDefinition.type,
											value => {
												const updatedProperties = { ...schemaObj.current.properties };
												if (updatedProperties[propertyName]) {
													updatedProperties[propertyName].type = value;
													updateSchema({ properties: updatedProperties });
												}
											}
										}
									>
										<option value="string">string</option>
										<option value="integer">integer</option>
										<option value="number">number</option>
										<option value="boolean">boolean</option>
										<option value="array">array</option>
										<option value="object">object</option>
										<option value="null">null</option>
									</select>
								</div>

								<div>
									<label for="{propertyName}-description" class="block text-xs font-medium text-gray-400"
										>Description</label
									>
									<input
										type="text"
										id="{propertyName}-description"
										class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
										value={propertyDefinition.description}
										{...onchange(value => {
											const updatedProperties = { ...schemaObj.current.properties };
											if (!updatedProperties[propertyName]) return;
											updatedProperties[propertyName].description = value;
											updateSchema({ properties: updatedProperties });
										})}
									/>
								</div>
							</div>
						{:else}
							<p class="mt-3 text-sm text-gray-500">No properties defined yet.</p>
						{/each}
					</div>
				{:else}
					<p class="mt-3 text-sm text-gray-500">No properties defined yet.</p>
				{/if}

				<button
					type="button"
					class="btn-sm mt-4 flex w-full items-center justify-center rounded-md"
					onclick={() => {
						const newPropertyName = `newProperty${Object.keys(schemaObj.current.properties || {}).length + 1}`;
						updateSchema({
							properties: {
								...(schemaObj.current.properties || {}),
								[newPropertyName]: { type: "string", description: "" },
							},
						});
					}}
				>
					Add Property
				</button>
			</div>

			<!-- Required properties -->
			<div class="border-t border-gray-700 pt-4">
				<h3 class="text-lg leading-6 font-medium text-gray-100">Required Properties</h3>
				<p class="text-sm text-gray-500">Select which properties are required.</p>
				<div class="mt-3 space-y-2">
					{#if schemaObj.current.properties}
						{#each Object.keys(schemaObj.current.properties) as propertyName}
							<div class="relative flex items-start">
								<div class="flex h-5 items-center">
									<input
										id="required-{propertyName}"
										aria-describedby="required-{propertyName}-description"
										name="required-{propertyName}"
										type="checkbox"
										class="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
										checked={schemaObj.current.required?.includes(propertyName)}
										onchange={e => {
											let updatedRequired = [...(schemaObj.current.required || [])];
											if (e.currentTarget.checked) {
												if (!updatedRequired.includes(propertyName)) {
													updatedRequired.push(propertyName);
												}
											} else {
												updatedRequired = updatedRequired.filter(name => name !== propertyName);
											}
											updateSchema({ required: updatedRequired });
										}}
									/>
								</div>
								<div class="ml-3 text-sm">
									<label for="required-{propertyName}" class="font-medium text-gray-300">{propertyName}</label>
								</div>
							</div>
						{/each}
					{:else}
						<p class="text-sm text-gray-500">Add properties first to mark them as required.</p>
					{/if}
				</div>
			</div>

			<!-- Strict and Additional Properties -->
			<div class="border-t border-gray-700 pt-4">
				<h3 class="text-lg leading-6 font-medium text-gray-100">Options</h3>
				<div class="mt-3 space-y-2">
					<div class="relative flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="additionalProperties"
								name="additionalProperties"
								type="checkbox"
								class="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
								checked={schemaObj.current.additionalProperties !== undefined
									? schemaObj.current.additionalProperties
									: true}
								onchange={e => updateSchema({ additionalProperties: e.currentTarget.checked })}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="additionalProperties" class="font-medium text-gray-300">Allow additional properties</label>
							<p id="additionalProperties-description" class="text-gray-500">
								If unchecked, only properties defined in the schema are allowed.
							</p>
						</div>
					</div>

					<div class="relative flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="strict"
								name="strict"
								type="checkbox"
								class="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
								checked={schemaObj.current.strict !== undefined ? schemaObj.current.strict : false}
								onchange={e => updateSchema({ strict: e.currentTarget.checked })}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="strict" class="font-medium text-gray-300">Strict mode</label>
							<p id="strict-description" class="text-gray-500">Enforces stricter validation rules.</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- inside dialogs its a-ok -->
		<!-- svelte-ignore a11y_autofocus  -->
		<div
			class="relative mt-2 max-h-120 overflow-x-clip overflow-y-auto rounded-lg bg-gray-800 ring-gray-100 focus-within:ring-3 dark:ring-gray-600"
		>
			<div class="shiki-container pointer-events-none absolute inset-0" aria-hidden="true">
				{#await codeToHtml(tempSchema, { lang: "json", theme: "catppuccin-macchiato" })}
					<!-- nothing -->
				{:then rendered}
					{@html rendered}
				{/await}
			</div>
			<textarea
				bind:this={textarea}
				autofocus
				value={conversation.data.structuredOutput?.schema ?? ""}
				{...onchange(v => {
					conversation.update({ structuredOutput: { ...conversation.data.structuredOutput, schema: v } });
				})}
				{...oninput(v => (tempSchema = v))}
				class="relative z-10 h-120 w-full resize-none overflow-hidden rounded-lg bg-transparent whitespace-pre-wrap text-transparent caret-white outline-none @2xl:px-3"
			></textarea>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn ml-auto" onclick={() => (open = false)}>Save</button>
	{/snippet}
</Dialog>

<style>
	.shiki-container > :global(pre),
	.shiki-container + textarea {
		padding-block: 10px;
		padding-inline: 8px;
		font-family: var(--font-mono) !important;
		font-size: 15px;
	}

	.shiki-container > :global(*) {
		background-color: transparent !important;
		font-family: var(--font-mono) !important;
	}

	.shiki-container > :global(pre) {
		border-radius: 8px;
		height: 100%;
		white-space: pre-wrap;
	}
</style>

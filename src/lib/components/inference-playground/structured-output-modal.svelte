<script lang="ts">
	import { isDark } from "$lib/spells/is-dark.svelte";
	import { Synced } from "$lib/spells/synced.svelte";
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte";
	import type { ConversationClass } from "$lib/state/conversations.svelte.js";
	import { safeParse } from "$lib/utils/json.js";
	import { keys, renameKey } from "$lib/utils/object.svelte";
	import { onchange, oninput } from "$lib/utils/template.js";
	import { RadioGroup } from "melt/builders";
	import { codeToHtml } from "shiki";
	import typia from "typia";
	import Dialog from "../dialog.svelte";
	import SchemaProperty, { type PropertyDefinition } from "./schema-property.svelte";

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

	type Schema = {
		schema?: {
			type?: string;
			properties?: { [key: string]: PropertyDefinition };
			required?: string[];
			additionalProperties?: boolean;
		};
		strict?: boolean;
	};

	export function parseJsonSchema(): Schema {
		const parsed = safeParse(conversation.data.structuredOutput?.schema ?? "");
		const baseSchema = {
			schema: {
				type: "object",
				properties: {},
				required: [],
				additionalProperties: true,
			},
			strict: false,
		} satisfies Schema;

		if (typia.is<Schema>(parsed)) {
			return {
				...baseSchema,
				...parsed,
				schema: {
					...baseSchema.schema,
					...parsed.schema,
					properties: {
						...baseSchema.schema.properties,
						...parsed.schema?.properties,
					},
					required: Array.from(new Set([...(baseSchema.schema.required || []), ...(parsed.schema?.required || [])])),
				},
			};
		}

		return baseSchema;
	}

	const schemaObj = new Synced<Schema>({
		value: parseJsonSchema,
		onChange(v) {
			const required = Array.from(new Set(v.schema?.required)).filter(name =>
				keys(v.schema?.properties ?? {}).includes(name)
			);
			const validated: Schema = {
				schema: {
					...v.schema,
					required,
				},
				strict: v.strict,
			};
			conversation.update({
				structuredOutput: { ...conversation.data.structuredOutput, schema: JSON.stringify(validated, null, 2) },
			});
		},
	});

	function updateSchema(obj: Partial<Schema>) {
		schemaObj.current = { ...schemaObj.current, ...obj };
	}

	function updateSchemaNested(nestedObj: Partial<Schema["schema"]>) {
		updateSchema({
			schema: {
				...schemaObj.current.schema,
				...nestedObj,
			},
		});
	}

	let textarea = $state<HTMLTextAreaElement>();
	new TextareaAutosize({
		element: () => textarea,
		input: () => tempSchema,
	});
</script>

<Dialog class="!w-2xl max-w-[90vw]" title="Edit Structured Output" {open} onClose={() => (open = false)}>
	<div class="flex justify-end">
		<div
			class="flex items-center gap-0.5 rounded-md border border-gray-300 bg-white p-0.5 text-sm dark:border-gray-600 dark:bg-gray-800"
			{...radioGroup.root}
		>
			{#each modes as mode}
				{@const item = radioGroup.getItem(mode)}
				<div
					class={[
						"rounded px-2 py-0.5 capitalize select-none",
						item.checked ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700/70",
					]}
					{...item.attrs}
				>
					{mode}
				</div>
			{/each}
		</div>
	</div>

	{#if radioGroup.value === "form"}
		<div class="fade-y -mx-2 mt-2 -mb-4 max-h-200 space-y-4 overflow-auto px-2 py-4 text-left">
			<!-- Properties Section -->
			<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
				<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Properties</h3>
				{#if schemaObj.current.schema?.properties}
					<div class="mt-3 space-y-3">
						{#each Object.entries(schemaObj.current.schema.properties) as [propertyName, propertyDefinition]}
							<SchemaProperty
								bind:name={
									() => propertyName,
									value => {
										const updatedProperties = renameKey(
											schemaObj.current.schema?.properties ?? {},
											propertyName,
											value
										);
										updateSchemaNested({ properties: updatedProperties });
									}
								}
								bind:definition={
									() => propertyDefinition,
									v => {
										const updatedProperties = { ...schemaObj.current.schema?.properties };
										if (updatedProperties && updatedProperties[propertyName]) {
											updatedProperties[propertyName] = v;
											updateSchemaNested({ properties: updatedProperties });
										}
									}
								}
								bind:required={
									() => schemaObj.current.schema?.required?.includes(propertyName) ?? false,
									v => {
										let updatedRequired = [...(schemaObj.current.schema?.required || [])];
										if (v) {
											if (!updatedRequired.includes(propertyName)) {
												updatedRequired.push(propertyName);
											}
										} else {
											updatedRequired = updatedRequired.filter(name => name !== name);
										}
										updateSchemaNested({ required: updatedRequired });
									}
								}
								onDelete={() => {
									const updatedProperties = { ...schemaObj.current.schema?.properties };
									if (!updatedProperties || !updatedProperties[propertyName]) return;
									delete updatedProperties[propertyName];
									updateSchemaNested({ properties: updatedProperties });
								}}
							/>
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
						const newPropertyName = `newProperty${Object.keys(schemaObj.current.schema?.properties || {}).length + 1}`;
						const updatedProperties = {
							...(schemaObj.current.schema?.properties || {}),
							[newPropertyName]: { type: "string" as const },
						};
						updateSchemaNested({ properties: updatedProperties });
					}}
				>
					Add property
				</button>
			</div>

			<!-- Strict and Additional Properties -->
			<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
				<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Options</h3>
				<div class="mt-3 space-y-2">
					<div class="relative flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="additionalProperties"
								name="additionalProperties"
								type="checkbox"
								class="h-4 w-4 rounded border border-gray-300 bg-white text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
								checked={schemaObj.current.schema?.additionalProperties !== undefined
									? schemaObj.current.schema.additionalProperties
									: true}
								onchange={e => updateSchemaNested({ additionalProperties: e.currentTarget.checked })}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="additionalProperties" class="font-medium text-gray-700 dark:text-gray-300">
								Allow additional properties
							</label>
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
								class="h-4 w-4 rounded border border-gray-300 bg-white text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
								checked={schemaObj.current.strict !== undefined ? schemaObj.current.strict : false}
								onchange={e => updateSchema({ strict: e.currentTarget.checked })}
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="strict" class="font-medium text-gray-700 dark:text-gray-300">Strict mode</label>
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
			class="relative mt-2 max-h-120 overflow-x-clip overflow-y-auto rounded-lg bg-gray-100 text-left ring-gray-100 focus-within:ring-3 dark:bg-gray-800 dark:ring-gray-600"
		>
			<div class="shiki-container pointer-events-none absolute inset-0" aria-hidden="true">
				{#await codeToHtml(tempSchema, { lang: "json", theme: isDark() ? "catppuccin-macchiato" : "catppuccin-latte" })}
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
				class="relative z-10 h-120 w-full resize-none overflow-hidden rounded-lg bg-transparent whitespace-pre-wrap text-transparent caret-black outline-none @2xl:px-3 dark:caret-white"
			></textarea>
		</div>
	{/if}

	{#snippet footer()}
		<button class="btn ml-auto" onclick={() => (open = false)}> Save </button>
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

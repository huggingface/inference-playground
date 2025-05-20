<script lang="ts" module>
	const propertyTypes = ["string", "integer", "number", "boolean", "object", "enum", "array"] as const;
	export type PropertyType = (typeof propertyTypes)[number];

	export type PropertyDefinition = {
		type: PropertyType;
		description?: string;
		enum?: string[];
		properties?: { [key: string]: PropertyDefinition };
		items?: PropertyDefinition;
	};

	// Example:
	// {
	//   "type": "object",
	//   "properties": {
	//     "static": {
	//       "type": "string"
	//     },
	//     "array": {
	//       "type": "array",
	//       "items": {
	//         "type": "string"
	//       }
	//     },
	//     "enum": {
	//       "type": "string",
	//       "enum": [
	//         "V1",
	//         "V2",
	//         "V3"
	//       ]
	//     },
	//     "object": {
	//       "type": "object",
	//       "properties": {
	//         "key1": {
	//           "type": "string"
	//         },
	//         "key2": {
	//           "type": "string"
	//         }
	//       }
	//     }
	//   }
	// }
</script>

<script lang="ts">
	import { onchange } from "$lib/utils/template.js";
	import IconX from "~icons/carbon/close";
	import SchemaProperty from "./schema-property.svelte";

	type Props = {
		name: string;
		definition: PropertyDefinition;
		required?: boolean;
		nesting?: number;
		onDelete: () => void;
	};

	let { name = $bindable(), definition = $bindable(), onDelete, required = $bindable(), nesting = 0 }: Props = $props();

	// If isArray, this will be the inner type of the array. Otherwise it will be the definition itself.
	const innerDefinition = {
		get $() {
			if (definition.type === "array") {
				return definition.items ?? { type: "string" };
			}
			return definition;
		},
		set $(v) {
			if (isArray.current) {
				definition = { ...definition, items: v };
				return;
			}

			definition = v;
		},
	};

	const type = {
		get $() {
			return innerDefinition.$.type;
		},
		set $(v) {
			delete definition.enum;
			delete definition.properties;

			if (definition.type === "array") {
				definition = { ...definition, items: { type: v } };
				return;
			}

			definition = { ...definition, type: v };
		},
	};

	const isArray = {
		get current() {
			return definition.type === "array";
		},
		set current(v) {
			delete definition.enum;
			delete definition.properties;

			if (v) {
				definition = { ...definition, type: "array", items: { type: definition.type } };
			} else {
				const prevType = definition.items?.type ?? "string";
				delete definition.items;
				definition = { ...definition, type: prevType };
			}
		},
	};
</script>

<div
	class={[
		"relative space-y-2 border-l-2 bg-white py-1 pl-3 dark:bg-gray-900",
		nesting % 2 === 0 && "border-gray-300 dark:border-gray-700",
		nesting % 2 === 1 && "border-blue-300 dark:border-blue-900",
	]}
>
	<div>
		<label for="{name}-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400"> Name </label>
		<input
			type="text"
			id="{name}-name"
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
			value={name}
			{...onchange(v => (name = v))}
		/>
	</div>

	<button
		type="button"
		class="absolute top-0 right-0 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
		onclick={onDelete}
		aria-label="delete"
	>
		<IconX />
	</button>

	<div>
		<label for="{name}-type" class="block text-xs font-medium text-gray-500 dark:text-gray-400"> Type </label>
		<select
			id="{name}-type"
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
			bind:value={() => type.$, v => (type.$ = v)}
		>
			{#each propertyTypes.filter(t => t !== "array") as type}
				<option value={type}>{type}</option>
			{/each}
		</select>
	</div>

	{#if !nesting}
		<div class="flex items-start">
			<div class="flex h-5 items-center">
				<input
					id="required-{name}"
					name="required-{name}"
					type="checkbox"
					class="h-4 w-4 rounded border border-gray-300 bg-white text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
					bind:checked={required}
				/>
			</div>
			<div class="ml-3 text-sm">
				<label for="required-{name}" class="font-medium text-gray-700 dark:text-gray-300"> Required </label>
			</div>
		</div>
	{/if}

	<div class="flex items-start">
		<div class="flex h-5 items-center">
			<input
				id="is-array-{name}"
				name="is-array-{name}"
				type="checkbox"
				class="h-4 w-4 rounded border border-gray-300 bg-white text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
				bind:checked={isArray.current}
			/>
		</div>
		<div class="ml-3 text-sm">
			<label for="is-array-{name}" class="font-medium text-gray-700 dark:text-gray-300"> Array </label>
		</div>
	</div>

	{#if type.$ === "object"}
		{#each Object.entries(innerDefinition.$.properties ?? {}) as [propertyName, propertyDefinition], index (index)}
			<SchemaProperty
				bind:name={
					() => propertyName,
					value => {
						const nd = { ...innerDefinition.$ };
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						nd.properties![value] = innerDefinition.$.properties![propertyName] as any;
						delete nd.properties![propertyName];
						innerDefinition.$ = nd;
					}
				}
				bind:definition={
					() => propertyDefinition,
					v => {
						innerDefinition.$.properties![propertyName] = v;
						innerDefinition.$ = innerDefinition.$;
					}
				}
				onDelete={() => {
					delete innerDefinition.$.properties![propertyName];
					innerDefinition.$ = innerDefinition.$;
				}}
				nesting={nesting + 1}
			/>
		{/each}

		<button
			type="button"
			class="btn-sm mt-4 flex w-full items-center justify-center rounded-md"
			onclick={() => {
				const prevProperties = innerDefinition.$.properties || {};
				innerDefinition.$ = { ...innerDefinition.$, properties: { ...prevProperties, "": { type: "string" } } };
			}}
		>
			Add nested property
		</button>
	{/if}

	{#if innerDefinition.$.type === "enum"}
		{#each innerDefinition.$.enum ?? [] as val, index (index)}
			<div class="flex items-center">
				<input
					id="{name}-enum-{index}"
					class="py-1} mt-1 block w-full rounded-md border border-gray-300 bg-white px-2
		text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
					type="text"
					value={val}
					{...onchange(v => {
						innerDefinition.$.enum = innerDefinition.$.enum ?? [];
						innerDefinition.$.enum[index] = v;
						innerDefinition.$ = innerDefinition.$;
					})}
				/>
				<button
					type="button"
					class="btn-sm ml-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
					onclick={() => {
						innerDefinition.$.enum = innerDefinition.$.enum ?? [];
						innerDefinition.$.enum.splice(index, 1);
						innerDefinition.$ = innerDefinition.$;
					}}
				>
					<IconX />
				</button>
			</div>
		{/each}
		<button
			type="button"
			class="btn-sm mt-4 flex w-full items-center justify-center rounded-md"
			onclick={() => {
				const prevValues = innerDefinition.$.enum || [];
				innerDefinition.$ = { ...innerDefinition.$, enum: [...prevValues, ""] };
			}}
		>
			Add enum value
		</button>
	{/if}
</div>

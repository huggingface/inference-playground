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
	import IconAdd from "~icons/carbon/add-large";
	import SchemaProperty from "./schema-property.svelte";
	import Tooltip from "../tooltip.svelte";

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
			return "enum" in innerDefinition.$ ? "enum" : innerDefinition.$.type;
		},
		set $(v) {
			delete definition.enum;
			delete definition.properties;

			const inner = { type: v === "enum" ? "string" : v } as PropertyDefinition;
			if (v === "enum") inner.enum = [];

			if (definition.type === "array") {
				definition = { ...definition, items: inner };
			}

			definition = { ...definition, ...inner };
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

	const nestingClasses = [
		"border-gray-300 dark:border-gray-700",
		"border-gray-300 dark:border-gray-600",
		"border-gray-300 dark:border-gray-500",
		"border-gray-300 dark:border-gray-600",
	];
</script>

<div
	class={[
		"relative space-y-2 border-l-2 bg-white py-2 pl-4 dark:bg-gray-900",
		...nestingClasses.map((c, i) => {
			return nesting % nestingClasses.length === i && c;
		}),
	]}
>
	<div class="flex gap-2">
		<div class="grow">
			<label for="{name}-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400"> Name </label>
			<input
				type="text"
				id="{name}-name"
				class="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
				value={name}
				{...onchange(v => (name = v))}
			/>
		</div>

		<div class="grow">
			<label for="{name}-type" class="block text-xs font-medium text-gray-500 dark:text-gray-400"> Type </label>
			<select
				id="{name}-type"
				class="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.25 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
				bind:value={() => type.$, v => (type.$ = v)}
			>
				{#each propertyTypes.filter(t => t !== "array") as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>
		{#if type.$ === "object"}
			<Tooltip>
				{#snippet trigger(tooltip)}
					<button
						type="button"
						class="btn-xs self-end rounded-md"
						onclick={() => {
							const prevProperties = innerDefinition.$.properties || {};
							innerDefinition.$ = { ...innerDefinition.$, properties: { ...prevProperties, "": { type: "string" } } };
						}}
						aria-label="Add nested"
						{...tooltip.trigger}
					>
						<IconAdd />
					</button>
				{/snippet}
				Add nested property
			</Tooltip>
		{/if}
		{#if type.$ === "enum"}
			<Tooltip>
				{#snippet trigger(tooltip)}
					<button
						type="button"
						class="btn-xs self-end rounded-md"
						onclick={() => {
							const prevValues = innerDefinition.$.enum || [];
							innerDefinition.$ = { ...innerDefinition.$, enum: [...prevValues, ""] };
						}}
						aria-label="Add enum value"
						{...tooltip.trigger}
					>
						<IconAdd />
					</button>
				{/snippet}
				Add enum value
			</Tooltip>
		{/if}
		<button
			type="button"
			class="btn-xs self-end rounded-md text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
			onclick={onDelete}
			aria-label="delete"
		>
			<IconX />
		</button>
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
	{/if}

	{#if "enum" in innerDefinition.$}
		<p class="text-xs font-medium text-gray-500 dark:text-gray-400">Values</p>
		{#each innerDefinition.$.enum ?? [] as val, index (index)}
			<div
				class={[
					"flex border-l-2 pl-2",
					...nestingClasses.map((c, i) => {
						return (nesting + 1) % nestingClasses.length === i && c;
					}),
				]}
			>
				<input
					id="{name}-enum-{index}"
					class="block w-full rounded-md border border-gray-300 bg-white px-2 py-1
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
					class="btn-xs ml-2 rounded-md text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
					onclick={() => {
						innerDefinition.$.enum = innerDefinition.$.enum ?? [];
						innerDefinition.$.enum.splice(index, 1);
						innerDefinition.$ = innerDefinition.$;
					}}
				>
					<IconX />
				</button>
			</div>
		{:else}
			<p class="mt-2 text-xs italic text-gray-400">No enum values defined.</p>
		{/each}
	{/if}
</div>

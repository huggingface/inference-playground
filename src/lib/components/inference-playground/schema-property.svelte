<script lang="ts" module>
	const propertyTypes = ["string", "integer", "number", "boolean", "object", "enum"] as const;
	export type PropertyType = (typeof propertyTypes)[number];

	export type PropertyDefinition = {
		type: PropertyType;
		description?: string;
		enum?: string[];
		properties?: { [key: string]: PropertyDefinition };
	};
</script>

<script lang="ts">
	import { onchange } from "$lib/utils/template.js";
	import IconX from "~icons/carbon/close";
	import SchemaProperty from "./schema-property.svelte";

	type Props = {
		name: string;
		definition: PropertyDefinition;
		required?: boolean;
		array: boolean;
		nesting?: number;
		onDelete: () => void;
	};

	let {
		name = $bindable(),
		definition = $bindable(),
		onDelete,
		required = $bindable(),
		array = $bindable(),
		nesting = 0,
	}: Props = $props();
</script>

<div
	class={[
		"relative space-y-2 border-l-2 bg-white py-1 pl-3 dark:bg-gray-900",
		nesting % 2 === 0 && "border-gray-300 dark:border-gray-700",
		nesting % 2 === 1 && "border-blue-300 dark:border-blue-900/50",
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
			bind:value={() => definition.type, v => (definition = { ...definition, type: v })}
		>
			{#each propertyTypes as type}
				<option value={type}>{type}</option>
			{/each}
		</select>
	</div>

	{#if !nesting}
		<div class="flex items-start">
			<div class="flex h-5 items-center">
				<input
					id="required-{name}"
					aria-describedby="required-{name}-description"
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

	{#if definition.type === "object"}
		{#each Object.entries(definition.properties ?? {}) as [propertyName, propertyDefinition], index (index)}
			<SchemaProperty
				bind:name={
					() => propertyName,
					value => {
						const nd = { ...definition };
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						nd.properties![value] = definition.properties![propertyName] as any;
						delete nd.properties![propertyName];
						definition = nd;
					}
				}
				bind:definition={
					() => propertyDefinition,
					v => {
						definition.properties![propertyName] = v;
						definition = definition;
					}
				}
				array={false}
				onDelete={() => {
					delete definition.properties![propertyName];
					definition = definition;
				}}
				nesting={nesting + 1}
			/>
		{/each}

		<button
			type="button"
			class="btn-sm mt-4 flex w-full items-center justify-center rounded-md"
			onclick={() => {
				const prevProperties = definition.properties || {};
				definition = { ...definition, properties: { ...prevProperties, "": { type: "string" } } };
			}}
		>
			Add nested property
		</button>
	{/if}

	{#if definition.type === "enum"}
		{#each definition.enum ?? [] as val, index (index)}
			<div class="flex items-center">
				<input
					id="{name}-enum-{index}"
					class="py-1} mt-1 block w-full rounded-md border border-gray-300 bg-white px-2
		text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
					type="text"
					value={val}
					{...onchange(v => {
						definition.enum = definition.enum ?? [];
						definition.enum[index] = v;
						definition = definition;
					})}
				/>
				<button
					type="button"
					class="btn-sm ml-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
					onclick={() => {
						definition.enum = definition.enum ?? [];
						definition.enum.splice(index, 1);
						definition = definition;
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
				const prevValues = definition.enum || [];
				definition = { ...definition, enum: [...prevValues, ""] };
			}}
		>
			Add enum value
		</button>
	{/if}
</div>

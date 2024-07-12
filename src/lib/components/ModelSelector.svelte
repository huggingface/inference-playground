<script lang="ts">
	import { type ModelEntry } from "@huggingface/hub";

	export let compatibleModels: ModelEntry[] = [];
	export let currentModel = compatibleModels[0];
	export let disabled = false;
</script>

<div>
	<label
		for="countries"
		class="mb-2 flex items-baseline text-sm font-medium text-gray-900 dark:text-white"
		>Models<span class="ml-4 font-normal text-gray-400">{compatibleModels.length}</span>
	</label>
	<select
		{disabled}
		bind:value={currentModel}
		class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
	>
		{#each compatibleModels as model}
			<option value={model.id}>{model.id}</option>
		{/each}
	</select>
</div>

<script lang="ts">
	// export let temperature = 0.5;
	// export let maxTokens = 2048;
	// export let streaming = true;
	// export let jsonMode = true;

	export let config;
	export let classNames = '';
</script>

<div class={classNames}>
	<div>
		<div class="flex items-center justify-between">
			<label
				for="temperature-range"
				class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Temperature</label
			>
			<input
				type="number"
				class="w-16 rounded border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
				bind:value={config.temperature}
				min="0"
				max="1"
				step="0.1"
			/>
		</div>
		<input
			id="temperature-range"
			type="range"
			bind:value={config.temperature}
			min="0"
			max="1"
			step="0.1"
			class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
		/>
	</div>
	<div>
		<div class="flex items-center justify-between">
			<label
				for="max-tokens-range"
				class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Max tokens</label
			>
			<input
				type="number"
				class="w-20 rounded border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
				bind:value={config.maxTokens}
				min="0"
				max="4096"
				step="512"
			/>
		</div>
		<input
			id="max-tokens-range"
			type="range"
			bind:value={config.maxTokens}
			min="0"
			max="4096"
			step="512"
			class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
		/>
	</div>
	<div class="mt-2">
		<label class="flex cursor-pointer items-center justify-between">
			<input type="checkbox" bind:checked={config.streaming} class="peer sr-only" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Streaming</span>
			<div
				class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-black peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
			></div>
		</label>
	</div>
</div>

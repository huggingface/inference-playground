<script lang="ts">
	import {
		GENERATION_CONFIG_KEYS,
		GENERATION_CONFIG_KEYS_ADVANCED,
		GENERATION_CONFIG_SETTINGS
	} from './generationConfigSettings';

	export let config;
	export let streaming: boolean;
	export let classNames = '';
</script>

<div class="flex flex-col gap-y-5 {classNames}">
	{#each GENERATION_CONFIG_KEYS as key}
		{@const settings = GENERATION_CONFIG_SETTINGS[key]}
		<div>
			<div class="flex items-center justify-between">
				<label
					for="temperature-range"
					class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
					>{settings.label}</label
				>
				<input
					type="number"
					class="w-16 rounded border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
					min={settings.min}
					max={settings.max}
					step={settings.step}
					bind:value={config[key]}
				/>
			</div>
			<input
				id="temperature-range"
				type="range"
				min={settings.min}
				max={settings.max}
				step={settings.step}
				bind:value={config[key]}
				class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
			/>
		</div>
	{/each}

	<details>
		<summary>Advanced Options</summary>
		<div class="mt-4 flex flex-col gap-y-5">
			{#each GENERATION_CONFIG_KEYS_ADVANCED as key}
				{@const settings = GENERATION_CONFIG_SETTINGS[key]}
				<div>
					<div class="flex items-center justify-between">
						<label
							for="temperature-range"
							class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
							>{settings.label}</label
						>
						<input
							type="number"
							class="w-16 rounded border bg-transparent px-1 py-0.5 text-right text-sm dark:border-gray-700"
							min={settings.min}
							max={settings.max}
							step={settings.step}
							value={config[key] ?? settings.default}
							on:input={(e) => (config[key] = e.currentTarget.value)}
						/>
					</div>
					<input
						id="temperature-range"
						type="range"
						min={settings.min}
						max={settings.max}
						step={settings.step}
						value={config[key] ?? settings.default}
						on:input={(e) => (config[key] = e.currentTarget.value)}
						class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black dark:bg-gray-700 dark:accent-blue-500"
					/>
				</div>
			{/each}
		</div>
	</details>

	<div class="mt-2">
		<label class="flex cursor-pointer items-center justify-between">
			<input type="checkbox" bind:checked={streaming} class="peer sr-only" />
			<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Streaming</span>
			<div
				class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-black peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"
			></div>
		</label>
	</div>
</div>

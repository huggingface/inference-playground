<script lang="ts">
	import Tooltip from "$lib/components/tooltip.svelte";
	import IconDownload from "~icons/lucide/download";
	import IconMaximize from "~icons/lucide/maximize";
	import IconRefresh from "~icons/lucide/refresh-cw";
	import IconTrash from "~icons/lucide/trash";
	import LoadingAnimation from "./loading-animation.svelte";
	import type { ImageItem } from "./types.js";

	interface Props {
		image: ImageItem;
		onDelete?: () => void;
		onReuse?: () => void;
		onExpand?: () => void;
	}

	const { image, onDelete, onReuse, onExpand }: Props = $props();

	function formatGenerationTime(ms: number): string {
		if (ms < 1000) {
			return `${Math.round(ms)}ms`;
		} else {
			return `${(ms / 1000).toFixed(1)}s`;
		}
	}
</script>

<article
	class="border-gradient dark:bg-california-950/20 flex flex-col overflow-hidden rounded-lg bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl"
	style="
	--border-gradient-before: linear-gradient(180deg, var(--color-bright-sun-900) 0%, var(--color-california-900) 100%)
	"
>
	{#if image.isLoading || !image.blob}
		<div
			class="flex aspect-square items-center justify-center rounded-t-xl border-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700"
			aria-label="Loading image"
		>
			<LoadingAnimation />
		</div>
	{:else}
		<button
			class="group relative w-full cursor-pointer border-0 bg-transparent p-0"
			onclick={onExpand}
			aria-label="Expand image: {image.prompt}"
		>
			<img src={URL.createObjectURL(image.blob)} alt="Generated image: {image.prompt}" class="block h-auto w-full" />
			<!-- Hover content -->
			<div class="absolute inset-0 flex flex-col items-center justify-center">
				<!-- Progressive radial blur layers -->
				<div
					class="absolute h-24 w-48 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100"
					style="mask: radial-gradient(ellipse, black 0%, black 30%, transparent 70%); -webkit-mask: radial-gradient(ellipse, black 0%, black 30%, transparent 70%);"
				></div>
				<div
					class="absolute h-20 w-40 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
					style="mask: radial-gradient(ellipse, black 20%, black 50%, transparent 80%); -webkit-mask: radial-gradient(ellipse, black 20%, black 50%, transparent 80%);"
				></div>
				<div
					class="absolute h-16 w-32 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
					style="mask: radial-gradient(ellipse, black 40%, black 60%, transparent 90%); -webkit-mask: radial-gradient(ellipse, black 40%, black 60%, transparent 90%);"
				></div>

				<div
					class="relative z-10 flex flex-col items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				>
					<IconMaximize class="mb-1 h-5 w-5 text-white drop-shadow drop-shadow-black/35" />
					<span class="text-xs font-medium text-white text-shadow-black/35 text-shadow-md"> Click to expand </span>
				</div>
			</div>
		</button>
	{/if}
	<div class="relative">
		<div class="space-y-1 p-3 text-xs text-gray-500 dark:text-gray-400">
			{#if image.prompt}
				<div>Prompt: <span class="text-gray-200">{image.prompt}</span></div>
			{/if}
			<div>Model: <span class="text-gray-200">{image.model}</span></div>
			<div>Provider: <span class="text-gray-200">{image.provider}</span></div>
			<div>
				Time: <span class="text-gray-200">
					{image.generationTimeMs ? formatGenerationTime(image.generationTimeMs) : "..."}
				</span>
			</div>
		</div>
		<div class="absolute right-1.5 bottom-1.5 flex justify-end gap-2">
			{#if image.isLoading}
				<button
					class="btn-depth btn-depth-red flex items-center justify-center"
					onclick={onDelete}
					aria-label="Cancel image generation"
				>
					Cancel
				</button>
			{:else}
				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							class="btn-depth btn-depth-gray flex items-center justify-center"
							onclick={onReuse}
							aria-label="Reuse settings from this image"
							{...tooltip.trigger}
						>
							<IconRefresh class="h-4 w-4" />
						</button>
					{/snippet}
					Reuse these settings
				</Tooltip>

				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							class="btn-depth btn-depth-gray flex items-center justify-center"
							onclick={() => {
								const url = URL.createObjectURL(image.blob!);
								const a = document.createElement("a");
								a.href = url;
								a.download = `generated-image-${image.id}.png`;
								a.click();
								URL.revokeObjectURL(url);
							}}
							{...tooltip.trigger}
							aria-label="Download image"
						>
							<IconDownload class="h-4 w-4" />
						</button>
					{/snippet}
					Download image
				</Tooltip>

				<Tooltip>
					{#snippet trigger(tooltip)}
						<button
							class="btn-depth btn-depth-red flex items-center justify-center"
							onclick={onDelete}
							{...tooltip.trigger}
							aria-label="Delete image"
						>
							<IconTrash class="h-4 w-4" />
						</button>
					{/snippet}
					Delete image
				</Tooltip>
			{/if}
		</div>
	</div>
</article>

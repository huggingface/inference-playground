<script lang="ts">
	import Tooltip from "$lib/components/tooltip.svelte";
	import IconDownload from "~icons/lucide/download";
	import IconMaximize from "~icons/lucide/maximize";
	import IconRefresh from "~icons/lucide/refresh-cw";
	import IconTrash from "~icons/lucide/trash";
	import LoadingAnimation from "./loading-animation.svelte";
	import type { VideoItem } from "./types.js";

	interface Props {
		video: VideoItem;
		onDelete?: () => void;
		onReuse?: () => void;
		onExpand?: () => void;
	}

	const { video, onDelete, onReuse, onExpand }: Props = $props();

	function formatGenerationTime(ms: number): string {
		if (ms < 1000) {
			return `${Math.round(ms)}ms`;
		} else {
			return `${(ms / 1000).toFixed(1)}s`;
		}
	}
</script>

<article
	class="border-gradient dark:bg-pasilla-3 flex flex-col overflow-hidden bg-white shadow-lg transition-shadow duration-300"
	style="
	--border-gradient-before: linear-gradient(to bottom, #8b5cf6 0%, #6366f1 100%);
	/* For border-gradient util */
	--border-radius: 0.75rem;
	border-radius: var(--border-radius);
	"
>
	{#if video.isLoading || !video.blob}
		<div
			class="flex aspect-video items-center justify-center rounded-t-xl bg-stone-100 dark:bg-stone-950"
			aria-label="Loading video"
		>
			<LoadingAnimation />
		</div>
	{:else}
		<button
			class="group relative w-full cursor-pointer border-0 bg-transparent p-0"
			onclick={onExpand}
			aria-label="Expand video: {video.prompt}"
		>
			<video
				src={URL.createObjectURL(video.blob)}
				class="block h-auto w-full"
				muted
				loop
				autoplay
				playsinline
			>
				<track kind="captions" />
			</video>
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
	<div class="@container relative">
		<div class="flex flex-col gap-2 p-3">
			<h2 class="text-lg font-semibold">{video.prompt || "N/A"}</h2>
			<div class="grid grid-cols-2 gap-1">
				<div class="flex flex-col text-stone-500 dark:text-stone-400">
					Model <span class="font-semibold text-stone-200">{video.model}</span>
				</div>
				<div class="flex flex-col text-stone-500 dark:text-stone-400">
					Provider <span class="font-semibold text-stone-200">{video.provider}</span>
				</div>
				<div class="flex flex-col text-stone-500 dark:text-stone-400">
					Time
					<span class="font-mono font-semibold text-stone-200">
						{video.generationTimeMs ? formatGenerationTime(video.generationTimeMs) : "..."}
					</span>
				</div>
			</div>
			<div class="col-span-2 mt-2 flex gap-1 @lg:gap-1">
				{#if video.isLoading}
					<button
						class="btn-depth btn-depth-red flex items-center justify-center"
						onclick={onDelete}
						aria-label="Cancel video generation"
					>
						Cancel
					</button>
				{:else}
					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								class="btn-depth btn-depth-stone flex flex-1 items-center justify-center @md:hidden"
								onclick={onReuse}
								aria-label="Re-use settings from this video"
								{...tooltip.trigger}
							>
								<IconRefresh class="h-3.5 w-3.5" />
							</button>
						{/snippet}
						Re-use video settings
					</Tooltip>

					<button
						class="btn-depth btn-depth-stone hidden flex-1 items-center justify-center gap-2 text-sm @md:flex"
						onclick={onReuse}
						aria-label="Re-use settings from this video"
					>
						<IconRefresh class="h-3.5 w-3.5" />
						Re-use settings
					</button>

					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								class="btn-depth btn-depth-stone flex flex-1 items-center justify-center @md:hidden"
								onclick={() => {
									const url = URL.createObjectURL(video.blob!);
									const a = document.createElement("a");
									a.href = url;
									a.download = `generated-video-${video.id}.mp4`;
									a.click();
									URL.revokeObjectURL(url);
								}}
								{...tooltip.trigger}
							>
								<IconDownload class="h-3.5 w-3.5" />
							</button>
						{/snippet}
						Download video
					</Tooltip>

					<button
						class="btn-depth btn-depth-stone hidden flex-1 items-center justify-center gap-2 text-sm @md:flex"
						onclick={() => {
							const url = URL.createObjectURL(video.blob!);
							const a = document.createElement("a");
							a.href = url;
							a.download = `generated-video-${video.id}.mp4`;
							a.click();
							URL.revokeObjectURL(url);
						}}
					>
						<IconDownload class="h-3.5 w-3.5" />
						Download
					</button>

					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								class="btn-depth btn-depth-stone flex items-center justify-center"
								onclick={onDelete}
								{...tooltip.trigger}
								aria-label="Delete video"
							>
								<IconTrash class="h-3.5 w-3.5" />
							</button>
						{/snippet}
						Delete video
					</Tooltip>
				{/if}
			</div>
		</div>
	</div>
</article>

<script lang="ts">
	import Tooltip from "$lib/components/tooltip.svelte";
	import { isDark } from "$lib/spells/is-dark.svelte";
	import { keys } from "$lib/utils/object.svelte";
	import chroma from "chroma-js";
	import { Vibrant } from "node-vibrant/browser";
	import IconDownload from "~icons/lucide/download";
	import IconMaximize from "~icons/lucide/maximize";
	import IconRefresh from "~icons/lucide/refresh-cw";
	import IconTrash from "~icons/lucide/trash";
	import LoadingAnimation from "./loading-animation.svelte";
	import { adjustBgColorForAPCAContrast, extractVideoFrameWithRetry } from "../utils.js";
	import { isVisualItem, type GeneratingItem, type VisualItem } from "../(state)/visual-items.svelte.js";

	interface Props {
		item: VisualItem | GeneratingItem;
		onDelete?: () => void;
		onReuse?: () => void;
		onExpand?: () => void;
	}

	const { item, onDelete, onReuse, onExpand }: Props = $props();

	function formatGenerationTime(ms: number): string {
		if (ms < 1000) {
			return `${Math.round(ms)}ms`;
		} else {
			return `${(ms / 1000).toFixed(1)}s`;
		}
	}

	type Palette = Awaited<ReturnType<Vibrant["getPalette"]>>;

	let palette = $state<Palette>();

	// Extract colors from first frame of video or from image
	$effect(() => {
		if (!isVisualItem(item)) return;

		if (item.data.type === "video" && item.blob) {
			extractVideoFrameWithRetry(
				item.blob,
				{ percentage: 25, format: "image/jpeg", quality: 0.8, maxWidth: 1920, timeout: 20000, debug: false },
				2
			).then(frame => {
				if (!frame.blob) return;
				Vibrant.from(URL.createObjectURL(frame.blob))
					.getPalette()
					.then(p => {
						palette = p;
					});
			});
		} else if (item.src) {
			// For images, extract colors directly
			Vibrant.from(item.src)
				.getPalette()
				.then(p => {
					palette = p;
				});
		}
	});

	const btnStyles = $derived.by(() => {
		const adjustedBgColor = adjustBgColorForAPCAContrast({
			textColor: isDark() ? "#ffffff" : "#000000",
			backgroundColor: palette?.Vibrant?.hex ?? "black",
			targetContrast: isDark() ? -90 : 90,
			tolerance: 2,
		});

		return `
    --bg-from: ${chroma(adjustedBgColor).darken(0.5).hex()};
    --bg-to: ${adjustedBgColor.hex()};
    --bg-to-hover: ${chroma(adjustedBgColor).brighten(0.5).hex()};
    --bg-to-active: ${chroma(adjustedBgColor).darken(0.75).hex()};
    --border-color: ${chroma(adjustedBgColor).darken(0.25).hex()};
  `;
	});

	const borderGradient = $derived(
		`linear-gradient(to bottom, ${palette?.Vibrant?.hex} 0%, ${palette?.Muted?.hex} 100%)`
	);

	const aspectClass = $derived(item.type === "video" ? "aspect-video" : "aspect-square");
	const fileExtension = $derived(item.type === "video" ? "mp4" : "png");
</script>

<article
	class="border-gradient dark:bg-pasilla-3 flex flex-col overflow-hidden bg-white shadow-lg transition-shadow duration-300"
	style="
	--border-gradient-before: {borderGradient};
	/* For border-gradient util */
	--border-radius: 0.75rem;
	border-radius: var(--border-radius);
	"
>
	{#if !isVisualItem(item)}
		<div
			class="flex {aspectClass} items-center justify-center rounded-t-xl bg-stone-100 dark:bg-stone-950"
			aria-label="Loading {item.type}"
		>
			<LoadingAnimation />
		</div>
	{:else}
		<button
			class="group relative w-full cursor-pointer border-0 bg-transparent p-0"
			onclick={onExpand}
			aria-label="Expand {item.type}: {item.config?.prompt}"
		>
			{#if item.type === "image"}
				<img src={item.src} alt="Generated image: {item.config?.prompt}" class="block h-auto w-full" />
			{:else}
				<video src={item.src} class="block h-auto w-full" muted loop autoplay playsinline>
					<track kind="captions" />
				</video>
			{/if}
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
		<div class="absolute top-2 right-2 flex gap-1">
			{#each keys(palette ?? {}) as swatch}
				<Tooltip>
					{#snippet trigger(tooltip)}
						<div
							aria-hidden="true"
							class="h-4 w-4 rounded border border-stone-600"
							style:background={palette?.[swatch]?.hex}
							{...tooltip.trigger}
						></div>
					{/snippet}
					{swatch}
				</Tooltip>
			{/each}
		</div>
		<div class="flex flex-col gap-2 p-3">
			<h2 class="text-lg font-semibold">{item.config?.prompt || "N/A"}</h2>
			<div class="grid grid-cols-2 gap-1">
				<div class="flex flex-col text-stone-500 dark:text-stone-400">
					Model <span class="font-semibold text-stone-200">{item.config?.model}</span>
				</div>
				<div class="flex flex-col text-stone-500 dark:text-stone-400">
					Provider <span class="font-semibold text-stone-200">{item.config?.provider}</span>
				</div>
				<div class="flex flex-col text-stone-500 dark:text-stone-400">
					Time
					{#if isVisualItem(item)}
						<span class="font-mono font-semibold text-stone-200">
							{item.data.generationTimeMs ? formatGenerationTime(item.data.generationTimeMs) : "..."}
						</span>
					{:else}
						<span
							class="font-mono font-semibold text-stone-200"
							{@attach node => {
								const t0 = performance.now();
								function counter() {
									const delta = performance.now() - t0;
									const secs = delta / 1000;
									node.innerText = `${secs.toFixed(2)}s`;
									frame = requestAnimationFrame(counter);
								}

								let frame = requestAnimationFrame(counter);

								return () => {
									cancelAnimationFrame(frame);
								};
							}}
						></span>
					{/if}
				</div>
			</div>
			<div class="col-span-2 mt-2 flex gap-1 @lg:gap-1">
				{#if !isVisualItem(item)}
					<button
						class="btn-depth btn-depth-red flex items-center justify-center"
						onclick={onDelete}
						aria-label="Cancel {item.type} generation"
					>
						Cancel
					</button>
				{:else}
					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								class="btn-depth btn-depth-stone flex flex-1 items-center justify-center @md:hidden"
								onclick={onReuse}
								aria-label="Re-use settings from this {item.type}"
								{...tooltip.trigger}
								style={btnStyles}
							>
								<IconRefresh class="h-3.5 w-3.5" />
							</button>
						{/snippet}
						Re-use {item.type} settings
					</Tooltip>

					<button
						class="btn-depth btn-depth-stone hidden flex-1 items-center justify-center gap-2 text-sm @md:flex"
						onclick={onReuse}
						aria-label="Re-use settings from this {item.type}"
						style={btnStyles}
					>
						<IconRefresh class="h-3.5 w-3.5" />
						Re-use settings
					</button>

					<Tooltip>
						{#snippet trigger(tooltip)}
							<button
								class="btn-depth btn-depth-stone flex flex-1 items-center justify-center @md:hidden"
								onclick={() => {
									const url = URL.createObjectURL(item.blob!);
									const a = document.createElement("a");
									a.href = url;
									a.download = `generated-${item.type}-${item.id}.${fileExtension}`;
									a.click();
									URL.revokeObjectURL(url);
								}}
								{...tooltip.trigger}
								style={btnStyles}
							>
								<IconDownload class="h-3.5 w-3.5" />
							</button>
						{/snippet}
						Download {item.type}
					</Tooltip>

					<button
						class="btn-depth btn-depth-stone hidden flex-1 items-center justify-center gap-2 text-sm @md:flex"
						onclick={() => {
							const url = URL.createObjectURL(item.blob!);
							const a = document.createElement("a");
							a.href = url;
							a.download = `generated-${item.type}-${item.id}.${fileExtension}`;
							a.click();
							URL.revokeObjectURL(url);
						}}
						style={btnStyles}
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
								aria-label="Delete {item.type}"
							>
								<IconTrash class="h-3.5 w-3.5" />
							</button>
						{/snippet}
						Delete {item.type}
					</Tooltip>
				{/if}
			</div>
		</div>
	</div>
</article>

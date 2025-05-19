<script lang="ts">
	import { autoUpdate, computePosition, flip, type Placement } from "@floating-ui/dom";
	import { Toaster } from "melt/builders";
	import { type Snippet } from "svelte";
	import { type Attachment } from "svelte/attachments";

	interface Props {
		children: Snippet<[{ addToast: typeof toaster.addToast; trigger: typeof trigger }]>;
		toast?: Snippet<[{ toast: (typeof toaster.toasts)[0]; float: typeof float }]>;
		closeDelay?: number;
	}
	const { children, closeDelay = 2000, toast: toastSnippet }: Props = $props();

	const id = $props.id();

	export const trigger = {
		"data-local-toast-trigger": id,
	} as const;

	type ToastData = {
		content: string;
		variant: "info" | "danger";
	};

	export const toaster = new Toaster<ToastData>({
		hover: null,
		closeDelay: () => closeDelay,
	});

	export const addToast = toaster.addToast;

	const float: Attachment<HTMLElement> = function (node) {
		let placement: Placement = $state("top");

		const triggerEl = document.querySelector(`[data-local-toast-trigger=${id}]`);
		if (!triggerEl) return;

		const compute = () =>
			computePosition(triggerEl, node, {
				strategy: "absolute",
				placement: "top",
				middleware: [flip({ fallbackPlacements: ["left"] })],
			}).then(({ x, y, placement: _placement }) => {
				placement = _placement;
				Object.assign(node.style, {
					left: placement === "top" ? `${x}px` : `${x - 4}px`,
					top: placement === "top" ? `${y - 6}px` : `${y}px`,
				});

				// Animate
				// Cancel any ongoing animations
				node.getAnimations().forEach(anim => anim.cancel());

				// Determine animation direction based on placement
				let keyframes: Keyframe[] = [];
				switch (placement) {
					case "top":
						keyframes = [
							{ opacity: 0, transform: "translateY(8px)", scale: "0.8" },
							{ opacity: 1, transform: "translateY(0)", scale: "1" },
						];
						break;
					case "left":
						keyframes = [
							{ opacity: 0, transform: "translateX(8px)", scale: "0.8" },
							{ opacity: 1, transform: "translateX(0)", scale: "1" },
						];
						break;
				}

				node.animate(keyframes, {
					duration: 500,
					easing: "cubic-bezier(0.22, 1, 0.36, 1)",
					fill: "forwards",
				});
			});

		const reference = node.cloneNode(true) as HTMLElement;
		node.before(reference);
		reference.style.visibility = "hidden";

		const destroyers = [
			autoUpdate(triggerEl, node, compute),
			async () => {
				// clone node
				const cloned = node.cloneNode(true) as HTMLElement;
				reference.before(cloned);
				reference.remove();
				cloned.getAnimations().forEach(anim => anim.cancel());

				// Animate out
				// Cancel any ongoing animations
				cloned.getAnimations().forEach(anim => anim.cancel());

				// Determine animation direction based on placement
				let keyframes: Keyframe[] = [];
				switch (placement) {
					case "top":
						keyframes = [
							{ opacity: 1, transform: "translateY(0)" },
							{ opacity: 0, transform: "translateY(-8px)" },
						];
						break;
					case "left":
						keyframes = [
							{ opacity: 1, transform: "translateX(0)" },
							{ opacity: 0, transform: "translateX(-8px)" },
						];
						break;
				}

				await cloned.animate(keyframes, {
					duration: 400,
					easing: "cubic-bezier(0.22, 1, 0.36, 1)",
					fill: "forwards",
				}).finished;

				cloned.remove();
			},
		];

		return () => destroyers.forEach(d => d());
	};

	const classMap: Record<ToastData["variant"], string> = {
		info: "border border-blue-400 bg-gradient-to-b from-blue-500 to-blue-600",

		danger: "border border-red-400 bg-gradient-to-b from-red-500 to-red-600",
	};
</script>

{@render children({ trigger, addToast: toaster.addToast })}

{#each toaster.toasts.slice(toaster.toasts.length - 1) as toast (toast.id)}
	<div
		data-local-toast
		data-variant={toast.data.variant}
		class={[!toastSnippet && `${classMap[toast.data.variant]} rounded-full px-2 py-1 text-xs`]}
		{@attach float}
	>
		{#if toastSnippet}
			{@render toastSnippet({ toast, float })}
		{:else}
			{toast.data.content}
		{/if}
	</div>
{/each}

<style>
	[data-local-toast] {
		/* Float on top of the UI */
		position: absolute;

		/* Avoid layout interference */
		width: max-content;
		top: 0;
		left: 0;
	}
</style>

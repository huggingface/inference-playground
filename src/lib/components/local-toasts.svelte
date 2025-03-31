<script lang="ts">
	import { autoUpdate, computePosition } from "@floating-ui/dom";
	import { Toaster } from "melt/builders";
	import { type Snippet } from "svelte";
	import { fly } from "svelte/transition";

	interface Props {
		children: Snippet<[{ addToast: typeof toaster.addToast; trigger: typeof trigger }]>;
		toast?: Snippet<[{ toast: (typeof toaster.toasts)[0]; float: typeof float }]>;
		closeDelay?: number;
	}
	const { children, closeDelay = 2000, toast: toastSnippet }: Props = $props();

	const id = $props.id();

	export const trigger = {
		id,
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

	function float(node: HTMLElement) {
		const triggerEl = document.getElementById(trigger.id);
		if (!triggerEl) return;

		const compute = () =>
			computePosition(triggerEl, node, {
				placement: "top",
				strategy: "absolute",
			}).then(({ x, y }) => {
				Object.assign(node.style, {
					left: `${x}px`,
					top: `${y - 8}px`,
				});
			});

		return {
			destroy: autoUpdate(triggerEl, node, compute),
		};
	}

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
		in:fly={{ y: 10 }}
		out:fly={{ y: -4 }}
		use:float
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

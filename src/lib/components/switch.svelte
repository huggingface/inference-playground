<script lang="ts">
	import { classes } from "$lib/utils/styles.js";
	import { type ComponentProps } from "melt";
	import { Toggle, type ToggleProps } from "melt/builders";
	import { ElementSize } from "runed";
	import { Spring } from "svelte/motion";

	let {
		class: className,
		value = $bindable(false),
		...rest
	}: ComponentProps<ToggleProps> & { class?: string } = $props();

	const toggle = new Toggle({
		value: () => value ?? false,
		onValueChange: v => (value = v),
		...rest,
	});

	let trigger = $state<HTMLButtonElement>();
	const triggerSize = new ElementSize(() => trigger);
	let thumb = $state<HTMLSpanElement>();
	const thumbSize = new ElementSize(() => thumb);
	const padding = 2;

	const thumbX = Spring.of(
		() => {
			if (toggle.value) {
				return triggerSize.width - thumbSize.width - padding;
			}
			return padding;
		},
		{
			stiffness: 0.08,
			damping: 0.3,
		}
	);
</script>

<button
	bind:this={trigger}
	{...toggle.trigger}
	class={classes(
		"relative h-5 w-10 shrink-0 rounded-full bg-neutral-500 transition-all",
		{ "bg-blue-500": toggle.value },
		className
	)}
>
	<span
		bind:this={thumb}
		class={classes("absolute top-0.5 left-0 h-4 w-4 rounded-full bg-neutral-900", {
			"bg-white": toggle.value,
		})}
		style="transform:	translateX({thumbX.current}px)"
	></span>
</button>

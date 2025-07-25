<script lang="ts">
	import { cn } from "$lib/utils/cn.js";
	import { Popover } from "melt/builders";
	import InfoIcon from "~icons/carbon/information";

	type Props = {
		class?: string;
		content?: string;
	};

	let { class: classes, content }: Props = $props();

	const popover = new Popover({
		floatingConfig: {
			computePosition: { placement: "top" },
		},
	});
</script>

<button
	type="button"
	class={cn("btn-xs rounded-md text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-500", classes)}
	{...popover.trigger}
>
	<InfoIcon />
</button>

<div
	{...popover.content}
	class="max-w-xs overflow-visible rounded-xl bg-white p-0 text-center shadow-xl dark:bg-gray-700"
>
	<div {...popover.arrow} class="!z-10 size-2 rounded-tl !bg-white dark:!bg-gray-700"></div>
	<p class="px-4 py-1 text-sm text-gray-700 dark:text-white">{content}</p>
</div>

<style>
	[data-melt-popover-content] {
		border: 0;

		position: absolute;
		pointer-events: none;
		opacity: 0;

		transform: scale(0.9);

		transition: 0.3s;
		transition-property: opacity, transform;
	}

	[data-melt-popover-content][data-open] {
		pointer-events: auto;
		opacity: 1;

		transform: scale(1);
	}
</style>

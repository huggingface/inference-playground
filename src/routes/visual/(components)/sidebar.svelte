<script lang="ts">
	import { Splitter } from "$lib/spells/splitter.svelte.js";
	import { PersistedState, useDebounce } from "runed";
	import Settings from "./settings.svelte";

	const splitterSize = new PersistedState("sidebar-width", 400);
	const updateSplitterSize = useDebounce((v: number) => {
		splitterSize.current = v;
	});
	const splitter = new Splitter({
		min: 400,
		value: splitterSize.current,
		onValueChange(v) {
			updateSplitterSize(v);
		},
		max: 1200,
	});
</script>

<!-- Sidebar -->
<div
	class="sidebar dark:from-lemon-punch-1 dark:to-lemon-punch-2 relative flex h-full flex-col bg-gradient-to-b from-stone-50 to-stone-100 dark:border-stone-700"
>
	<Settings style="min-width: {splitter.value}px;width: {splitter.value}px;" />

	<!-- Resize Handle -->
	<div
		class={[
			"dark:hover:bg-mandarin-peel-12 absolute inset-y-0 right-0 w-1 translate-x-full cursor-col-resize outline-hidden transition-colors hover:bg-blue-500 focus-visible:ring-2",
			splitter.isResizing ? "dark:bg-mandarin-peel-12 bg-blue-500" : "bg-stone-300 dark:bg-stone-800",
		]}
		{...splitter.separator}
		{@attach splitter.separator.attach}
		aria-label="Resize sidebar"
	></div>
</div>

<style>
	.sidebar {
		box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
	}

	.sidebar-header {
		background: linear-gradient(135deg, var(--color-lemon-punch-3), var(--color-lemon-punch-5));
	}
</style>

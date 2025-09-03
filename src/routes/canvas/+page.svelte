<script lang="ts">
	import { Background, Controls, MiniMap, SvelteFlow } from "@xyflow/svelte";
	import "@xyflow/svelte/dist/style.css";
	import ChatNode from "./chat-node.svelte";
	import { edges, nodes } from "./state.js";

	const nodeTypes = { chat: ChatNode } as const;

	// Make edges non-editable
	const edgeOptions = {
		deletable: false,
		selectable: false,
	};
</script>

<div style:width="100vw" style:height="100vh">
	<SvelteFlow
		bind:nodes={nodes.current}
		bind:edges={edges.current}
		fitView
		{nodeTypes}
		defaultEdgeOptions={edgeOptions}
	>
		<MiniMap />
		<Controls />
		<Background />
	</SvelteFlow>
</div>

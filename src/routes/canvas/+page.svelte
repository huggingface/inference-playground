<script lang="ts">
	import { Background, Controls, MiniMap, SvelteFlow, type Edge, type Node } from "@xyflow/svelte";

	import "@xyflow/svelte/dist/style.css";
	import ChatNode from "./chat-node.svelte";
	import { PersistedState } from "runed";

	const nodeTypes = { chat: ChatNode } as const;

	let nodes = new PersistedState<Node[]>("inf-pg-nodes", [
		{
			id: "1",
			position: { x: 100, y: 100 },
			data: { query: "", response: "", modelId: undefined },
			type: "chat",
			width: undefined,
			height: undefined,
		},
	]);
	$inspect(nodes);

	let edges = $state.raw<Edge[]>([]);

	// Make edges non-editable
	const edgeOptions = {
		deletable: false,
		selectable: false,
	};
</script>

<div style:width="100vw" style:height="100vh">
	<SvelteFlow bind:nodes={nodes.current} bind:edges fitView {nodeTypes} defaultEdgeOptions={edgeOptions}>
		<MiniMap />
		<Controls />
		<Background />
	</SvelteFlow>
</div>

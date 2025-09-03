<script lang="ts">
	import { Background, Controls, MiniMap, SvelteFlow, type Edge, type Node } from "@xyflow/svelte";

	import "@xyflow/svelte/dist/style.css";
	import ChatNode from "./chat-node.svelte";

	const nodeTypes = { chat: ChatNode } as const;

	let nodes = $state.raw<Node[]>([
		{ id: "1", position: { x: 0, y: 0 }, data: { label: "1" } },
		{ id: "2", position: { x: 0, y: 100 }, data: { label: "2" } },
		{ id: "3", position: { x: 0, y: 200 }, data: { label: "3" }, type: "chat" },
	]);

	let edges = $state.raw<Edge[]>([{ id: "e1-2", source: "1", target: "2", animated: true }]);
</script>

<div style:width="100vw" style:height="100vh">
	<SvelteFlow bind:nodes bind:edges fitView {nodeTypes}>
		<MiniMap />
		<Controls />
		<Background />
	</SvelteFlow>
</div>

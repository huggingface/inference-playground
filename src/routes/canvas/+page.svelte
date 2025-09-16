<script lang="ts">
	import { models } from "$lib/state/models.svelte";
	import { projects } from "$lib/state/projects.svelte";
	import type { Node } from "@xyflow/svelte";
	import { Background, Controls, MiniMap, SvelteFlow } from "@xyflow/svelte";
	import "@xyflow/svelte/dist/style.css";
	import { useDebounce } from "runed";
	import IconAdd from "~icons/lucide/plus";
	import ChatNode from "./chat-node.svelte";
	import { edges, nodes } from "./state.js";

	await models.load();
	await projects.init();

	const nodeTypes = { chat: ChatNode } as const;

	// Make edges non-editable with clean styling
	const edgeOptions = {
		deletable: false,
		selectable: false,
		style: "stroke: #9ca3af; stroke-width: 2px;",
	};

	function addNewNode() {
		const newNode: Node = {
			id: crypto.randomUUID(),
			position: { x: Math.random() * 500, y: Math.random() * 300 },
			data: { query: "", response: "", modelId: undefined },
			type: "chat",
			width: undefined,
			height: undefined,
		};
		nodes.current.push(newNode);
	}

	let derivedNodes = $derived(nodes.current);

	const throttledSave = useDebounce((n: Node[]) => {
		nodes.current = n;
	}, 100);
</script>

<div class="h-screen w-screen bg-gray-50">
	<!-- Header -->
	<header class="absolute top-6 left-6 z-50 flex items-center gap-4">
		<div
			class="flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white/95 px-6
		py-3 shadow-sm backdrop-blur-md"
		>
			<h1 class="text-lg font-medium text-gray-900">Canvas</h1>
		</div>

		<button
			onclick={addNewNode}
			class="flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm
			font-medium text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-gray-900
			focus:ring-2 focus:ring-gray-900/20 focus:outline-hidden active:scale-[0.98]"
		>
			<IconAdd class="h-4 w-4" />
			Add Node
		</button>
	</header>

	<SvelteFlow
		bind:nodes={
			() => derivedNodes,
			v => {
				derivedNodes = v;
				throttledSave(v);
			}
		}
		bind:edges={edges.current}
		fitView
		{nodeTypes}
		defaultEdgeOptions={edgeOptions}
	>
		<MiniMap pannable zoomable class="rounded-xl border border-gray-200 bg-white shadow-sm" />
		<Controls class="rounded-xl border border-gray-200 bg-white shadow-sm" />
		<Background gap={20} size={1} />
	</SvelteFlow>
</div>

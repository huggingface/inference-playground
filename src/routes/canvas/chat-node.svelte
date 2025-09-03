<script lang="ts">
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte";
	import { models } from "$lib/state/models.svelte";
	import { token } from "$lib/state/token.svelte";
	import type { Model } from "$lib/types.js";
	import { InferenceClient } from "@huggingface/inference";
	import { Handle, Position, useSvelteFlow, type Edge, type Node, type NodeProps } from "@xyflow/svelte";
	import { onMount } from "svelte";
	import { edges, nodes } from "./state.js";
	import IconCross from "~icons/carbon/x";
	import type { ChatCompletionInputMessage } from "@huggingface/tasks";

	type Props = Omit<NodeProps, "data"> & { data: { query: string; response: string; modelId?: Model["id"] } };
	let { id, data }: Props = $props();

	let { updateNodeData, updateNode, getNode } = useSvelteFlow();
	onMount(() => {
		if (!data.modelId) data.modelId = models.trending[0]?.id;
		updateNode(id, { height: undefined });
	});

	const autosized = new TextareaAutosize();

	const history = $derived.by(function getNodeHistory() {
		const node = nodes.current.find(n => n.id === id);
		if (!node) return [];

		let history: Array<Omit<Node, "data"> & { data: Props["data"] }> = [node as any];
		let target = node.id;

		while (true) {
			const parentEdge = edges.current.find(edge => edge.target === target);
			if (!parentEdge) break; // No more parents found

			const parentNode = nodes.current.find(n => n.id === parentEdge.source);
			if (!parentNode) {
				// Optional: clean up broken edges
				// edges.current = edges.current.filter(e => e.id !== parentEdge.id);
				break;
			}

			history.unshift(parentNode as any);
			target = parentNode.id; // Move up the chain
		}

		return history;
	});
	$inspect(data.query, history);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		updateNodeData(id, { response: "" });
		const client = new InferenceClient(token.value);

		const messages: ChatCompletionInputMessage[] = history.flatMap(n => {
			const res: ChatCompletionInputMessage[] = [];
			if (n.data.query) {
				res.push({
					role: "user",
					content: n.data.query,
				});
			}
			if (n.data.response) {
				res.push({
					role: "assistant",
					content: n.data.response,
				});
			}

			return res;
		});

		const stream = client.chatCompletionStream({
			provider: "auto",
			model: data.modelId,
			messages,
			temperature: 0.5,
			top_p: 0.7,
		});

		for await (const chunk of stream) {
			if (chunk.choices && chunk.choices.length > 0) {
				const newContent = chunk.choices[0]?.delta.content ?? "";
				updateNodeData(id, { response: data.response + newContent });
			}
		}
	}
</script>

<div
	class="chat-node relative flex h-full min-h-[150px] w-full max-w-[500px] min-w-[200px]
	flex-col items-stretch rounded border bg-white p-8 shadow-xs"
>
	<select class="block border" bind:value={() => data.modelId, modelId => updateNodeData(id, { modelId })}>
		{#each models.all as model}
			<option value={model.id}>{model.id}</option>
		{/each}
	</select>

	<form class="mt-2 flex flex-col gap-2" onsubmit={handleSubmit}>
		<textarea
			class="nodrag block min-w-0 shrink grow resize-none border"
			placeholder="Type your message here..."
			value={data.query}
			oninput={evt => {
				updateNodeData(id, { query: evt.currentTarget.value });
			}}
			{@attach autosized.attachment}
		></textarea>
		<button class="self-center bg-blue-500 px-4 py-1 text-white hover:bg-blue-400"> Send </button>
	</form>

	{#if data.response}
		<div class="mt-2 border-t border-gray-200 p-2">
			<pre class="whitespace-pre-wrap">{data.response}</pre>
		</div>
	{/if}

	<!-- Add node -->
	<button
		class="abs-x-center absolute bottom-0 z-10 translate-y-1/2 rounded bg-black px-3 py-1
		text-xs text-white hover:bg-neutral-700"
		onclick={() => {
			const curr = getNode(id);
			const newNode: Node = {
				id: crypto.randomUUID(),
				position: { x: curr?.position.x ?? 100, y: (curr?.position.y ?? 0) + 500 },
				data: { query: "", response: "", modelId: data.modelId },
				type: "chat",
				width: undefined,
				height: undefined,
			};
			nodes.current.push(newNode);
			const edge: Edge = {
				id: crypto.randomUUID(),
				source: curr!.id,
				target: newNode.id,
				animated: true,
				label: "",
				data: {},
			};
			edges.current.push(edge);
		}}
	>
		Add
	</button>

	<button class="absolute top-1 right-1" onclick={() => (nodes.current = nodes.current.filter(n => n.id !== id))}>
		<IconCross />
	</button>
</div>

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />
<Handle type="source" position={Position.Left} />
<Handle type="source" position={Position.Right} />

<!-- <NodeResizeControl minWidth={200} minHeight={150}> -->
<!-- 	<IconResize class="absolute right-2 bottom-2" /> -->
<!-- </NodeResizeControl> -->

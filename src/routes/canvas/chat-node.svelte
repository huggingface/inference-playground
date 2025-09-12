<script lang="ts">
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte";
	import { models } from "$lib/state/models.svelte";
	import { token } from "$lib/state/token.svelte";
	import type { Model } from "$lib/types.js";
	import { InferenceClient } from "@huggingface/inference";
	import { Handle, Position, useSvelteFlow, type Edge, type Node, type NodeProps } from "@xyflow/svelte";
	import { onMount } from "svelte";
	import { edges, nodes } from "./state.js";
	import IconLoading from "~icons/lucide/loader-2";
	import IconAdd from "~icons/lucide/plus";
	import IconX from "~icons/lucide/x";
	import type { ChatCompletionInputMessage } from "@huggingface/tasks";
	import ModelPicker from "./model-picker.svelte";

	type Props = Omit<NodeProps, "data"> & { data: { query: string; response: string; modelId?: Model["id"] } };
	let { id, data }: Props = $props();

	let { updateNodeData, updateNode, getNode } = useSvelteFlow();
	onMount(() => {
		if (!data.modelId) data.modelId = models.trending[0]?.id;
		updateNode(id, { height: undefined });
	});

	const autosized = new TextareaAutosize();

	let isLoading = $state(false);

	const history = $derived.by(function getNodeHistory() {
		const node = nodes.current.find(n => n.id === id);
		if (!node) return [];

		let history: Array<Omit<Node, "data"> & { data: Props["data"] }> = [
			node as Omit<Node, "data"> & { data: Props["data"] },
		];
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

			history.unshift(parentNode as Omit<Node, "data"> & { data: Props["data"] });
			target = parentNode.id; // Move up the chain
		}

		return history;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		isLoading = true;
		updateNodeData(id, { response: "" });

		try {
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
		} finally {
			isLoading = false;
		}
	}
</script>

<div
	class="chat-node relative flex h-full min-h-[200px] w-full max-w-[500px] min-w-[300px]
	flex-col items-stretch rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
>
	<!-- Model selector -->
	<div class="mb-4">
		<ModelPicker modelId={data.modelId} onModelSelect={modelId => updateNodeData(id, { modelId })} />
	</div>

	<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
		<div class="relative">
			<label for={`message-${id}`} class="mb-1.5 block text-xs font-medium text-gray-600">Message</label>
			<textarea
				id={`message-${id}`}
				class="nodrag min-h-[80px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4
				py-3 text-sm text-gray-900 placeholder-gray-500 transition-colors
				focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none"
				placeholder="Type your message here..."
				value={data.query}
				oninput={evt => {
					updateNodeData(id, { query: evt.currentTarget.value });
				}}
				{@attach autosized.attachment}
			></textarea>
		</div>

		<button
			type="submit"
			disabled={isLoading}
			class="flex items-center justify-center gap-2 self-center rounded-xl
			bg-black px-6 py-2.5 text-sm font-medium
			text-white transition-all hover:scale-[1.02] hover:bg-gray-900
			focus:ring-2 focus:ring-gray-900/20 focus:outline-none
			active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isLoading}
				<IconLoading class="h-4 w-4 animate-spin" />
				Sending...
			{:else}
				Send Message
			{/if}
		</button>
	</form>

	{#if data.response || isLoading}
		<div class="mt-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
			<div class="mb-2 text-xs font-medium text-gray-600">Response</div>
			{#if data.response}
				<pre class="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{data.response}</pre>
			{:else if isLoading}
				<div class="flex items-center gap-2 text-sm text-gray-500">
					<IconLoading class="h-4 w-4 animate-spin" />
					Generating response...
				</div>
			{/if}
		</div>
	{/if}

	<!-- Add node button -->
	<button
		class="abs-x-center absolute -bottom-4 flex items-center gap-1.5 rounded-full
		bg-black px-4 py-2 text-xs font-medium
		text-white shadow-sm transition-all hover:scale-[1.02]
		hover:bg-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none active:scale-[0.98]"
		onclick={() => {
			const curr = getNode(id);
			const newNode: Node = {
				id: crypto.randomUUID(),
				position: { x: curr?.position.x ?? 100, y: (curr?.position.y ?? 0) + 400 },
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
		<IconAdd class="h-3 w-3" />
		Add Node
	</button>

	<!-- Close button -->
	<button
		class="absolute top-3 right-3 rounded-lg p-1.5 text-gray-400 transition-colors
		hover:bg-red-50 hover:text-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
		onclick={() => (nodes.current = nodes.current.filter(n => n.id !== id))}
	>
		<IconX class="h-4 w-4" />
	</button>
</div>

<Handle type="target" position={Position.Top} class="h-3 w-3 border-2 border-white bg-gray-500 shadow-sm" />
<Handle type="source" position={Position.Bottom} class="h-3 w-3 border-2 border-white bg-gray-500 shadow-sm" />
<Handle type="source" position={Position.Left} class="h-3 w-3 border-2 border-white bg-gray-500 shadow-sm" />
<Handle type="source" position={Position.Right} class="h-3 w-3 border-2 border-white bg-gray-500 shadow-sm" />

<!-- <NodeResizeControl minWidth={200} minHeight={150}> -->
<!-- 	<IconResize class="absolute right-2 bottom-2" /> -->
<!-- </NodeResizeControl> -->

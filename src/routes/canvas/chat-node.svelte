<script lang="ts">
	import { TextareaAutosize } from "$lib/spells/textarea-autosize.svelte";
	import { models } from "$lib/state/models.svelte";
	import { token } from "$lib/state/token.svelte";
	import type { Model } from "$lib/types.js";
	import { InferenceClient } from "@huggingface/inference";
	import { Handle, Position, useSvelteFlow, type NodeProps } from "@xyflow/svelte";
	import { onMount } from "svelte";

	type Props = NodeProps & { data: { query: string; response: string; modelId?: Model["id"] } };
	let { id, data }: Props = $props();

	let { updateNodeData, updateNode } = useSvelteFlow();
	onMount(() => {
		if (!data.modelId) data.modelId = models.trending[0]?.id;
		updateNode(id, { height: undefined });
	});

	let modelId = $state<Model["id"] | undefined>(models.trending[0]?.id);

	const autosized = new TextareaAutosize();

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		updateNodeData(id, { response: "" });
		const client = new InferenceClient(token.value);

		const stream = client.chatCompletionStream({
			provider: "auto",
			model: data.modelId,
			messages: [
				{
					role: "user",
					content: data.query,
				},
			],
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
	$inspect(data);
</script>

<div
	class="chat-node flex h-full min-h-[150px] w-full min-w-[200px] flex-col
	items-stretch rounded border bg-white p-8 shadow-xs"
>
	<select class="block border" bind:value={modelId}>
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
</div>

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />
<Handle type="source" position={Position.Left} />
<Handle type="source" position={Position.Right} />

<!-- <NodeResizeControl minWidth={200} minHeight={150}> -->
<!-- 	<IconResize class="absolute right-2 bottom-2" /> -->
<!-- </NodeResizeControl> -->

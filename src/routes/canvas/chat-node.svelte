<script lang="ts">
	import { NodeResizeControl, Position, useSvelteFlow, type NodeProps } from "@xyflow/svelte";
	import { Handle } from "@xyflow/svelte";
	import IconResize from "~icons/mingcute/fullscreen-2-fill";

	let { id, data }: NodeProps = $props();

	let { updateNodeData } = useSvelteFlow();
</script>

<div
	class="chat-node flex h-full min-h-[100px] w-full min-w-[200px]
	items-start rounded border bg-white p-4"
>
	<label for="text">Text:</label>
	<input
		class="nodrag min-w-0 shrink grow border"
		name="text"
		value={data.text}
		oninput={evt => {
			updateNodeData(id, { text: evt.currentTarget.value });
		}}
	/>
</div>

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

<NodeResizeControl minWidth={200} minHeight={100} style="background: transparent; border: none;">
	<IconResize class="absolute right-2 bottom-2 -scale-x-100 text-blue-500" />
</NodeResizeControl>

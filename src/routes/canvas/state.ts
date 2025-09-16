import { type Edge, type Node } from "@xyflow/svelte";
import { PersistedState } from "runed";

export const nodes = new PersistedState<Node[]>("inf-pg-nodes", [
	{
		id: "1",
		position: { x: 100, y: 100 },
		data: { query: "", response: "", modelId: undefined, provider: "auto" },
		type: "chat",
		width: undefined,
		height: undefined,
	},
]);

export const edges = new PersistedState<Edge[]>("inf-pg-edges", []);

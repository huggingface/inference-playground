import { env } from "$env/dynamic/public";

export enum TEST_IDS {
	checkpoints_trigger,
	checkpoints_menu,
	checkpoint,

	reset,

	message,
}

export function isMcpEnabled(): boolean {
	const envEnabled = env.PUBLIC_ENABLE_MCP === "true";
	if (envEnabled) return true;

	if (typeof window === "undefined") return false;

	const urlParams = new URLSearchParams(window.location.search);
	const hasQueryParam = urlParams.has("mcp") || urlParams.has("enable-mcp");

	return hasQueryParam;
}

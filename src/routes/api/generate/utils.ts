const DEBUG_MCP = true;

export const mcpLog = (...args: unknown[]) => {
	if (!DEBUG_MCP) return;
	console.log("[MCP DEBUG]", ...args);
};

export const mcpError = (...args: unknown[]) => {
	if (!DEBUG_MCP) return;
	console.error("[MCP DEBUG]", ...args);
};

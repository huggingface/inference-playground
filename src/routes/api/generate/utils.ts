const DEBUG_LOG = true;

export const debugLog = (...args: unknown[]) => {
	if (!DEBUG_LOG) return;
	console.log("[LOG DEBUG]", ...args);
};

export const debugError = (...args: unknown[]) => {
	if (!DEBUG_LOG) return;
	console.error("[LOG DEBUG]", ...args);
};

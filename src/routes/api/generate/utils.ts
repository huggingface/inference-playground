const DEBUG_LOG = true;

export const debugLog = (...args: unknown[]) => {
	if (!DEBUG_LOG) return;
	const now = new Date();
	console.log(`[Time: ${now.toLocaleTimeString()}] [LOG] ${args.join(" ")}`);
};

export const debugError = (...args: unknown[]) => {
	if (!DEBUG_LOG) return;
	const now = new Date();
	console.error(`[Time: ${now.toLocaleTimeString()}] [ERROR] ${args.join(" ")}`);
};

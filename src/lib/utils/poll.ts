/**
 * Polls a predicate function until it returns a truthy value or times out.
 * @param predicate - Function to evaluate. Should return a value or a Promise.
 * @param options - Polling options.
 * @returns The truthy value returned by predicate, or undefined if timed out.
 */
export async function poll<T>(
	predicate: () => T | Promise<T>,
	options: { interval?: number; maxAttempts?: number } = {}
): Promise<T | undefined> {
	const { interval = 10, maxAttempts = 200 } = options;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const result = await predicate();
		if (result) return result;
		await new Promise(resolve => setTimeout(resolve, interval));
	}
	return undefined;
}

type WithCacheOptions = {
	// Lifespan of the cache in milliseconds
	// @default 10 minutes
	lifespan?: number;
};

export function withCache<Args extends unknown[], Return>(
	fn: (...args: Args) => Return,
	options?: WithCacheOptions,
): (...args: Args) => Return {
	const { lifespan = 1000 * 60 * 10 } = options ?? {};

	const cache = new Map<string, Return>();

	return (...args: Args) => {
		const key = JSON.stringify(args);
		if (cache.has(key)) {
			return cache.get(key) as Return;
		}

		const value = fn(...args);
		cache.set(key, value);
		setTimeout(() => {
			cache.delete(key);
		}, lifespan);

		return value;
	};
}

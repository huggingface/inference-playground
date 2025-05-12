import type { ValueOf } from "$lib/types.js";

// typed Object.keys
export function keys<T extends object>(o: T) {
	return Object.keys(o) as Array<`${keyof T & (string | number | boolean | null | undefined)}`>;
}

// typed Object.entries
export function entries<T extends object>(o: T): [keyof T, T[keyof T]][] {
	return Object.entries(o) as [keyof T, T[keyof T]][];
}

// typed Object.fromEntries
export function fromEntries<T extends object>(entries: [keyof T, T[keyof T]][]): T {
	return Object.fromEntries(entries) as T;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
	const result = {} as Omit<T, K>;
	for (const key of Object.keys(obj)) {
		if (!keys.includes(key as unknown as K)) {
			result[key as keyof Omit<T, K>] = obj[key] as ValueOf<Omit<T, K>>;
		}
	}
	return result;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
	const result = {} as Pick<T, K>;
	for (const key of keys) {
		result[key] = obj[key] as ValueOf<Pick<T, K>>;
	}
	return result;
}

// $state.snapshot but types are preserved
export function snapshot<T>(s: T): T {
	return $state.snapshot(s) as T;
}

/**
 * Try and get a value from an object, or return undefined.
 * The key does not need to match the type of the object, so the
 * returned type is an union of all values, and undefined
 */
export function tryGet<T extends Record<string, unknown>>(obj: T, key: string): T[keyof T] | undefined {
	return obj[key as keyof T];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeepMergeable = { [key: string]: any };

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

export function deepMerge<T extends DeepMergeable, U extends DeepMergeable>(target: T, source: U): T & U {
	const result: DeepMergeable = { ...target };

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = source[key];
			const targetValue = result[key];

			// Handle arrays - merge them
			if (Array.isArray(sourceValue)) {
				result[key] = Array.isArray(targetValue) ? [...targetValue, ...sourceValue] : [...sourceValue];
				continue;
			}

			// Handle plain objects (not null, not arrays, not class instances)
			if (isPlainObject(sourceValue)) {
				result[key] =
					Object.prototype.hasOwnProperty.call(result, key) && isPlainObject(result[key])
						? deepMerge(result[key], sourceValue)
						: deepMerge({}, sourceValue);
				continue;
			}

			// Handle primitives and everything else
			result[key] = sourceValue;
		}
	}

	return result as T & U;
}

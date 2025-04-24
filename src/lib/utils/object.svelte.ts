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

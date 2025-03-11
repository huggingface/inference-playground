import { type Writable } from "svelte/store";

export function partialSet<T extends Record<string, unknown>>(store: Writable<T>, partial: Partial<T>) {
	store.update(s => ({ ...s, ...partial }));
}

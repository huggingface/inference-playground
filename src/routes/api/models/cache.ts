import { PipelineTag, type Model } from "$lib/types.js";

type CacheEntryArgs = {
	data?: Model[];
	ok: boolean;
};

export class CacheEntry {
	timestamp: number;
	data: CacheEntryArgs["data"];
	ok: CacheEntryArgs["ok"];

	constructor(args: CacheEntryArgs) {
		this.timestamp = Date.now();
		this.data = args.data;
		this.ok = args.ok;
	}

	isFresh(): boolean {
		return Math.abs(this.timestamp - Date.now()) < CACHE_REFRESH; // 1 hour in milliseconds
	}
}

export const cache: Partial<Record<PipelineTag, CacheEntry>> = {};

const CACHE_REFRESH = 1000 * 60 * 60; // 1 hour

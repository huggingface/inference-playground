import { query } from "$app/server";
import type { Provider, Model } from "$lib/types.js";
import { debugError, debugLog } from "$lib/utils/debug.js";

export type RouterData = {
	object: string;
	data: Datum[];
};

type Datum = {
	id: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	object: any;
	created: number;
	owned_by: string;
	providers: ProviderElement[];
};

type ProviderElement = {
	provider: Provider;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	status: any;
	context_length?: number;
	pricing?: Pricing;
	supports_tools?: boolean;
	supports_structured_output?: boolean;
};

type Pricing = {
	input: number;
	output: number;
};

export const getRouterData = query(async (): Promise<RouterData> => {
	const res = await fetch("https://router.huggingface.co/v1/models");
	return res.json();
});

enum CacheStatus {
	SUCCESS = "success",
	PARTIAL = "partial",
	ERROR = "error",
}

type Cache = {
	data: Model[] | undefined;
	timestamp: number;
	status: CacheStatus;
	failedTokenizers: string[];
	failedApiCalls: {
		textGeneration: boolean;
		imageTextToText: boolean;
	};
};

const cache: Cache = {
	data: undefined,
	timestamp: 0,
	status: CacheStatus.ERROR,
	failedTokenizers: [],
	failedApiCalls: {
		textGeneration: false,
		imageTextToText: false,
	},
};

const FULL_CACHE_REFRESH = 1000 * 60 * 60; // 1 hour
const PARTIAL_CACHE_REFRESH = 1000 * 60 * 15; // 15 minutes

const headers: HeadersInit = {
	"Upgrade-Insecure-Requests": "1",
	"Sec-Fetch-Dest": "document",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-Site": "none",
	"Sec-Fetch-User": "?1",
	"Priority": "u=0, i",
	"Pragma": "no-cache",
	"Cache-Control": "no-cache",
};

const requestInit: RequestInit = {
	credentials: "include",
	headers,
	method: "GET",
	mode: "cors",
};

interface ApiQueryParams {
	pipeline_tag?: "text-generation" | "image-text-to-text";
	filter: string;
	inference_provider: string;
	limit?: number;
	skip?: number;
	expand: string[];
}

const queryParams: ApiQueryParams = {
	filter: "conversational",
	inference_provider: "all",
	expand: ["inferenceProviderMapping", "config", "library_name", "pipeline_tag", "tags", "mask_token", "trendingScore"],
};

const baseUrl = "https://huggingface.co/api/models";

function buildApiUrl(params: ApiQueryParams): string {
	const url = new URL(baseUrl);

	Object.entries(params).forEach(([key, value]) => {
		if (!Array.isArray(value) && value !== undefined) {
			url.searchParams.append(key, String(value));
		}
	});

	params.expand.forEach(item => {
		url.searchParams.append("expand[]", item);
	});

	return url.toString();
}

async function fetchAllModelsWithPagination(pipeline_tag: "text-generation" | "image-text-to-text"): Promise<Model[]> {
	const allModels: Model[] = [];
	let skip = 0;
	const batchSize = 1000;

	while (true) {
		const url = buildApiUrl({
			...queryParams,
			pipeline_tag,
			limit: batchSize,
			skip,
		});

		const response = await fetch(url, requestInit);

		if (!response.ok) {
			break;
		}

		const models: Model[] = await response.json();

		if (models.length === 0) {
			break;
		}

		allModels.push(...models);
		skip += batchSize;

		await new Promise(resolve => setTimeout(resolve, 100));
	}

	return allModels;
}

export const getModels = query(async (): Promise<Model[]> => {
	const timestamp = Date.now();

	const elapsed = timestamp - cache.timestamp;
	const cacheRefreshTime = cache.status === CacheStatus.SUCCESS ? FULL_CACHE_REFRESH : PARTIAL_CACHE_REFRESH;

	if (elapsed < cacheRefreshTime && cache.data?.length) {
		debugLog(`Using ${cache.status} cache (${Math.floor(elapsed / 1000 / 60)} min old)`);
		return cache.data;
	}

	try {
		const needTextGenFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.textGeneration;
		const needImgTextFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.imageTextToText;

		const existingModels = new Map<string, Model>();
		if (cache.data) {
			cache.data.forEach(model => {
				existingModels.set(model.id, model);
			});
		}

		const newFailedTokenizers: string[] = [];
		const newFailedApiCalls = {
			textGeneration: false,
			imageTextToText: false,
		};

		let textGenModels: Model[] = [];
		let imgText2TextModels: Model[] = [];

		const apiPromises: Promise<void>[] = [];
		if (needTextGenFetch) {
			apiPromises.push(
				fetchAllModelsWithPagination("text-generation")
					.then(models => {
						textGenModels = models;
					})
					.catch(error => {
						debugError(`Error fetching text-generation models:`, error);
						newFailedApiCalls.textGeneration = true;
					}),
			);
		}

		if (needImgTextFetch) {
			apiPromises.push(
				fetchAllModelsWithPagination("image-text-to-text")
					.then(models => {
						imgText2TextModels = models;
					})
					.catch(error => {
						debugError(`Error fetching image-text-to-text models:`, error);
						newFailedApiCalls.imageTextToText = true;
					}),
			);
		}

		await Promise.all(apiPromises);

		if (
			needTextGenFetch &&
			newFailedApiCalls.textGeneration &&
			needImgTextFetch &&
			newFailedApiCalls.imageTextToText &&
			cache.data?.length
		) {
			debugLog("All API requests failed. Using existing cache as fallback.");
			cache.status = CacheStatus.ERROR;
			cache.timestamp = timestamp;
			cache.failedApiCalls = newFailedApiCalls;
			return cache.data;
		}

		if (!needTextGenFetch && cache.data) {
			textGenModels = cache.data.filter(model => model.pipeline_tag === "text-generation").map(model => model as Model);
		}

		if (!needImgTextFetch && cache.data) {
			imgText2TextModels = cache.data
				.filter(model => model.pipeline_tag === "image-text-to-text")
				.map(model => model as Model);
		}

		const models: Model[] = [...textGenModels, ...imgText2TextModels].filter(
			m => m.inferenceProviderMapping.length > 0,
		);
		models.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

		const hasApiFailures = newFailedApiCalls.textGeneration || newFailedApiCalls.imageTextToText;
		const cacheStatus = hasApiFailures ? CacheStatus.PARTIAL : CacheStatus.SUCCESS;

		cache.data = models;
		cache.timestamp = timestamp;
		cache.status = cacheStatus;
		cache.failedTokenizers = newFailedTokenizers;
		cache.failedApiCalls = newFailedApiCalls;

		debugLog(
			`Cache updated: ${models.length} models, status: ${cacheStatus}, ` +
				`failed tokenizers: ${newFailedTokenizers.length}, ` +
				`API failures: text=${newFailedApiCalls.textGeneration}, img=${newFailedApiCalls.imageTextToText}`,
		);

		return models;
	} catch (error) {
		debugError("Error fetching models:", error);

		if (cache.data?.length) {
			cache.status = CacheStatus.ERROR;
			cache.failedApiCalls = {
				textGeneration: true,
				imageTextToText: true,
			};
			return cache.data;
		}

		cache.status = CacheStatus.ERROR;
		cache.timestamp = timestamp;
		cache.failedApiCalls = {
			textGeneration: true,
			imageTextToText: true,
		};
		return [];
	}
});

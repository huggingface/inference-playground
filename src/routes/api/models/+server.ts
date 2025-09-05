import type { Model } from "$lib/types.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

enum CacheStatus {
	SUCCESS = "success",
	PARTIAL = "partial",
	ERROR = "error",
}

type Cache = {
	data: Model[] | undefined;
	timestamp: number;
	status: CacheStatus;
	// Track failed models to selectively refetch them
	failedTokenizers: string[]; // Using array instead of Set for serialization compatibility
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

// The time between cache refreshes
const FULL_CACHE_REFRESH = 1000 * 60 * 60; // 1 hour
const PARTIAL_CACHE_REFRESH = 1000 * 60 * 15; // 15 minutes (shorter for partial results)

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

	// Add simple params
	Object.entries(params).forEach(([key, value]) => {
		if (!Array.isArray(value) && value !== undefined) {
			url.searchParams.append(key, String(value));
		}
	});

	// Handle array params specially
	params.expand.forEach(item => {
		url.searchParams.append("expand[]", item);
	});

	return url.toString();
}

async function fetchAllModelsWithPagination(
	pipeline_tag: "text-generation" | "image-text-to-text",
	fetch: typeof globalThis.fetch,
): Promise<Model[]> {
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
			break; // No more models to fetch
		}

		allModels.push(...models);
		skip += batchSize;

		// Optional: Add a small delay to be respectful to the API
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	return allModels;
}

export type ApiModelsResponse = {
	models: Model[];
};

function createResponse(data: ApiModelsResponse): Response {
	return json(data);
}

export const GET: RequestHandler = async ({ fetch }) => {
	const timestamp = Date.now();

	// Determine if cache is valid
	const elapsed = timestamp - cache.timestamp;
	const cacheRefreshTime = cache.status === CacheStatus.SUCCESS ? FULL_CACHE_REFRESH : PARTIAL_CACHE_REFRESH;

	// Use cache if it's still valid and has data
	if (elapsed < cacheRefreshTime && cache.data?.length) {
		console.log(`Using ${cache.status} cache (${Math.floor(elapsed / 1000 / 60)} min old)`);
		return createResponse({ models: cache.data });
	}

	try {
		// Determine which API calls we need to make based on cache status
		const needTextGenFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.textGeneration;
		const needImgTextFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.imageTextToText;

		// Track the existing models we'll keep
		const existingModels = new Map<string, Model>();
		if (cache.data) {
			cache.data.forEach(model => {
				existingModels.set(model.id, model);
			});
		}

		// Initialize new tracking for failed requests
		const newFailedTokenizers: string[] = [];
		const newFailedApiCalls = {
			textGeneration: false,
			imageTextToText: false,
		};

		// Fetch models as needed
		let textGenModels: Model[] = [];
		let imgText2TextModels: Model[] = [];

		// Make the needed API calls in parallel
		const apiPromises: Promise<void>[] = [];
		if (needTextGenFetch) {
			apiPromises.push(
				fetchAllModelsWithPagination("text-generation", fetch)
					.then(models => {
						textGenModels = models;
					})
					.catch(error => {
						console.error(`Error fetching text-generation models:`, error);
						newFailedApiCalls.textGeneration = true;
					}),
			);
		}

		if (needImgTextFetch) {
			apiPromises.push(
				fetchAllModelsWithPagination("image-text-to-text", fetch)
					.then(models => {
						imgText2TextModels = models;
					})
					.catch(error => {
						console.error(`Error fetching image-text-to-text models:`, error);
						newFailedApiCalls.imageTextToText = true;
					}),
			);
		}

		await Promise.all(apiPromises);

		// If both needed API calls failed and we have cached data, use it
		if (
			needTextGenFetch &&
			newFailedApiCalls.textGeneration &&
			needImgTextFetch &&
			newFailedApiCalls.imageTextToText &&
			cache.data?.length
		) {
			console.log("All API requests failed. Using existing cache as fallback.");
			cache.status = CacheStatus.ERROR;
			cache.timestamp = timestamp; // Update timestamp to avoid rapid retry loops
			cache.failedApiCalls = newFailedApiCalls;
			return createResponse({ models: cache.data });
		}

		// For API calls we didn't need to make, use cached models
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

		// Determine cache status based on failures
		const hasApiFailures = newFailedApiCalls.textGeneration || newFailedApiCalls.imageTextToText;

		const cacheStatus = hasApiFailures ? CacheStatus.PARTIAL : CacheStatus.SUCCESS;

		cache.data = models;
		cache.timestamp = timestamp;
		cache.status = cacheStatus;
		cache.failedTokenizers = newFailedTokenizers;
		cache.failedApiCalls = newFailedApiCalls;

		console.log(
			`Cache updated: ${models.length} models, status: ${cacheStatus}, ` +
				`failed tokenizers: ${newFailedTokenizers.length}, ` +
				`API failures: text=${newFailedApiCalls.textGeneration}, img=${newFailedApiCalls.imageTextToText}`,
		);

		return createResponse({ models });
	} catch (error) {
		console.error("Error fetching models:", error);

		// If we have cached data, use it as fallback
		if (cache.data?.length) {
			cache.status = CacheStatus.ERROR;
			// Mark all API calls as failed so we retry them next time
			cache.failedApiCalls = {
				textGeneration: true,
				imageTextToText: true,
			};
			return createResponse({ models: cache.data });
		}

		// No cache available, return empty array
		cache.status = CacheStatus.ERROR;
		cache.timestamp = timestamp;
		cache.failedApiCalls = {
			textGeneration: true,
			imageTextToText: true,
		};
		return createResponse({ models: [] });
	}
};

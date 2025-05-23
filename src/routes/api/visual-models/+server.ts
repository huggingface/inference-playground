import type { VisualModel } from "$lib/types.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

enum CacheStatus {
	SUCCESS = "success",
	PARTIAL = "partial",
	ERROR = "error",
}

type Cache = {
	data: VisualModel[] | undefined;
	timestamp: number;
	status: CacheStatus;
	// Track failed models to selectively refetch them
	failedTokenizers: string[]; // Using array instead of Set for serialization compatibility
	failedApiCalls: {
		textToImage: boolean;
		textToVideo: boolean;
	};
};

const cache: Cache = {
	data: undefined,
	timestamp: 0,
	status: CacheStatus.ERROR,
	failedTokenizers: [],
	failedApiCalls: {
		textToImage: false,
		textToVideo: false,
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
	pipeline_tag?: "text-to-image" | "text-to-video";
	filter: string;
	inference_provider: string;
	limit: number;
	expand: string[];
}

const queryParams: ApiQueryParams = {
	filter: "conversational",
	inference_provider: "all",
	limit: 100,
	expand: ["inferenceProviderMapping", "config", "library_name", "pipeline_tag", "tags", "mask_token", "trendingScore"],
};

const baseUrl = "https://huggingface.co/api/models";

function buildApiUrl(params: ApiQueryParams): string {
	const url = new URL(baseUrl);

	// Add simple params
	Object.entries(params).forEach(([key, value]) => {
		if (!Array.isArray(value)) {
			url.searchParams.append(key, String(value));
		}
	});

	// Handle array params specially
	params.expand.forEach(item => {
		url.searchParams.append("expand[]", item);
	});

	return url.toString();
}

export type ApiModelsResponse = {
	models: VisualModel[];
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
		const needTextToImageFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.textToImage;
		const needTextToVideoFetch = elapsed >= FULL_CACHE_REFRESH || cache.failedApiCalls.textToVideo;

		// Track the existing models we'll keep
		const existingModels = new Map<string, VisualModel>();
		if (cache.data) {
			cache.data.forEach(model => {
				existingModels.set(model.id, model);
			});
		}

		// Initialize new tracking for failed requests
		const newFailedTokenizers: string[] = [];
		const newFailedApiCalls = {
			textToImage: false,
			textToVideo: false,
		};

		// Fetch models as needed
		let textToImageModels: VisualModel[] = [];
		let textToVideoModels: VisualModel[] = [];

		// Make the needed API calls in parallel
		const apiPromises: Promise<Response | void>[] = [];
		if (needTextToImageFetch) {
			const url = buildApiUrl({ ...queryParams, pipeline_tag: "text-to-image" });
			apiPromises.push(
				fetch(url, requestInit).then(async response => {
					if (!response.ok) {
						console.error(`Error fetching text-to-image models`, response.status, response.statusText);
						newFailedApiCalls.textToImage = true;
					} else {
						textToImageModels = await response.json();
					}
				})
			);
		}

		if (needTextToVideoFetch) {
			apiPromises.push(
				fetch(buildApiUrl({ ...queryParams, pipeline_tag: "text-to-video" }), requestInit).then(async response => {
					if (!response.ok) {
						console.error(`Error fetching text-to-video models`, response.status, response.statusText);
						newFailedApiCalls.textToVideo = true;
					} else {
						textToVideoModels = await response.json();
					}
				})
			);
		}

		await Promise.all(apiPromises);

		// If both needed API calls failed and we have cached data, use it
		if (
			needTextToImageFetch &&
			newFailedApiCalls.textToImage &&
			needTextToVideoFetch &&
			newFailedApiCalls.textToVideo &&
			cache.data?.length
		) {
			console.log("All API requests failed. Using existing cache as fallback.");
			cache.status = CacheStatus.ERROR;
			cache.timestamp = timestamp; // Update timestamp to avoid rapid retry loops
			cache.failedApiCalls = newFailedApiCalls;
			return createResponse({ models: cache.data });
		}

		// For API calls we didn't need to make, use cached models
		if (!needTextToImageFetch && cache.data) {
			textToImageModels = cache.data
				.filter(model => model.pipeline_tag === "text-to-image")
				.map(model => model as VisualModel);
		}

		if (!needTextToVideoFetch && cache.data) {
			textToVideoModels = cache.data
				.filter(model => model.pipeline_tag === "text-to-video")
				.map(model => model as VisualModel);
		}

		const models: VisualModel[] = [...textToImageModels, ...textToVideoModels].filter(
			m => m.inferenceProviderMapping.length > 0
		);
		models.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

		// Determine cache status based on failures
		const hasApiFailures = newFailedApiCalls.textToImage || newFailedApiCalls.textToVideo;

		const cacheStatus = hasApiFailures ? CacheStatus.PARTIAL : CacheStatus.SUCCESS;

		cache.data = models;
		cache.timestamp = timestamp;
		cache.status = cacheStatus;
		cache.failedTokenizers = newFailedTokenizers;
		cache.failedApiCalls = newFailedApiCalls;

		console.log(
			`Cache updated: ${models.length} models, status: ${cacheStatus}, ` +
				`failed tokenizers: ${newFailedTokenizers.length}, ` +
				`API failures: textToImage=${newFailedApiCalls.textToImage}, textToVideo=${newFailedApiCalls.textToVideo}`
		);

		return createResponse({ models });
	} catch (error) {
		console.error("Error fetching models:", error);

		// If we have cached data, use it as fallback
		if (cache.data?.length) {
			cache.status = CacheStatus.ERROR;
			// Mark all API calls as failed so we retry them next time
			cache.failedApiCalls = {
				textToImage: true,
				textToVideo: true,
			};
			return createResponse({ models: cache.data });
		}

		// No cache available, return empty array
		cache.status = CacheStatus.ERROR;
		cache.timestamp = timestamp;
		cache.failedApiCalls = {
			textToImage: true,
			textToVideo: true,
		};
		return createResponse({ models: [] });
	}
};

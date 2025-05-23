import { PipelineTag, type Model } from "$lib/types.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

// Define supported pipeline tags
const SUPPORTED_PIPELINE_TAGS: PipelineTag[] = Object.values(PipelineTag);
const DEFAULT_PIPELINE_TAGS: PipelineTag[] = [PipelineTag.TextGeneration, PipelineTag.ImageTextToText]; // Default tags to fetch

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
	successfullyFetchedTags: PipelineTag[]; // Array of pipeline tags successfully fetched in the last attempt
};

const cache: Cache = {
	data: undefined,
	timestamp: 0,
	status: CacheStatus.ERROR,
	failedTokenizers: [],
	successfullyFetchedTags: [], // Initialize as empty
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
	pipeline_tag?: PipelineTag;
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
	models: Model[];
};

function createResponse(data: ApiModelsResponse): Response {
	return json(data);
}

export const GET: RequestHandler = async ({ fetch, url: requestUrl }) => {
	const timestamp = Date.now();
	const elapsed = timestamp - cache.timestamp;
	const cacheRefreshTime = cache.status === CacheStatus.SUCCESS ? FULL_CACHE_REFRESH : PARTIAL_CACHE_REFRESH;

	// Use cache if it's still valid, has data, and no specific pipeline tags are requested (or requested tags are covered)
	// For simplicity, if any pipeline_tag is in query, we might re-evaluate or proceed to fetch.
	// A more sophisticated check could see if current cache.data satisfies the requested pipeline_tags.
	// For now, we rely on the cacheRefreshTime primarily.
	const requestedPipelineTagsParams = requestUrl.searchParams.getAll("pipeline_tag") as PipelineTag[];
	const uniqueRequestedPipelineTags = [
		...new Set(requestedPipelineTagsParams.filter(tag => SUPPORTED_PIPELINE_TAGS.includes(tag))),
	];

	if (elapsed < cacheRefreshTime && cache.data?.length && uniqueRequestedPipelineTags.length === 0) {
		console.log(`Using ${cache.status} cache for default tags (${Math.floor(elapsed / 1000 / 60)} min old)`);
		return createResponse({ models: cache.data });
	}

	const pipelineTagsToProcess =
		uniqueRequestedPipelineTags.length > 0 ? uniqueRequestedPipelineTags : DEFAULT_PIPELINE_TAGS;

	try {
		const newFailedApiCalls: PipelineTag[] = [];
		const fetchedModelsByTag = new Map<PipelineTag, Model[]>();
		const apiPromises: Promise<void>[] = [];
		// Initialize newFailedTokenizers, though it's not used in the current logic
		const newFailedTokenizers: string[] = [];

		for (const tag of pipelineTagsToProcess) {
			const needsFetch = elapsed >= FULL_CACHE_REFRESH || !cache.successfullyFetchedTags.includes(tag);

			if (needsFetch) {
				const apiUrl = buildApiUrl({ ...queryParams, pipeline_tag: tag });
				apiPromises.push(
					fetch(apiUrl, requestInit)
						.then(async response => {
							if (!response.ok) {
								console.error(`Error fetching ${tag} models: ${response.status} ${response.statusText}`);
								newFailedApiCalls.push(tag);
								// If there's old data for this tag in cache, use it as partial data
								if (cache.data) {
									const cachedModelsForTag = cache.data.filter(model => model.pipeline_tag === tag);
									if (cachedModelsForTag.length > 0) {
										fetchedModelsByTag.set(tag, cachedModelsForTag);
									}
								}
							} else {
								const models: Model[] = await response.json();
								fetchedModelsByTag.set(tag, models);
							}
						})
						.catch(err => {
							console.error(`Network error or other issue fetching ${tag} models:`, err);
							newFailedApiCalls.push(tag);
							if (cache.data) {
								const cachedModelsForTag = cache.data.filter(model => model.pipeline_tag === tag);
								if (cachedModelsForTag.length > 0) {
									fetchedModelsByTag.set(tag, cachedModelsForTag);
								}
							}
						})
				);
			} else if (cache.data) {
				// If not fetching, get models for this tag from the current cache
				const cachedModelsForTag = cache.data.filter(model => model.pipeline_tag === tag);
				fetchedModelsByTag.set(tag, cachedModelsForTag);
			}
		}

		await Promise.all(apiPromises);

		const combinedModels: Model[] = [];
		for (const models of fetchedModelsByTag.values()) {
			combinedModels.push(...models);
		}

		// Deduplicate models by ID and filter out those without inference providers
		const uniqueModelsMap = new Map<string, Model>();
		for (const model of combinedModels) {
			if (model && model.id && !uniqueModelsMap.has(model.id)) {
				uniqueModelsMap.set(model.id, model);
			}
		}
		const finalModels = Array.from(uniqueModelsMap.values()).filter(m => m.inferenceProviderMapping?.length > 0);
		finalModels.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

		// Fallback: if all attempted fetches failed AND we have some old cache data, use the full old cache.
		const attemptedFetchTags = pipelineTagsToProcess.filter(
			tag => elapsed >= FULL_CACHE_REFRESH || !cache.successfullyFetchedTags.includes(tag)
		);
		if (attemptedFetchTags.length > 0 && newFailedApiCalls.length === attemptedFetchTags.length && cache.data?.length) {
			console.warn("All attempted API requests failed. Using existing full cache as fallback.");
			cache.timestamp = timestamp;
			if (cache.status !== CacheStatus.ERROR) cache.status = CacheStatus.ERROR;
			// Tags that were attempted and failed should not be in successfullyFetchedTags
			cache.successfullyFetchedTags = cache.successfullyFetchedTags.filter(t => !newFailedApiCalls.includes(t));
			return createResponse({ models: cache.data }); // Return old full cache
		}

		cache.data = finalModels;
		cache.timestamp = timestamp;
		cache.failedTokenizers = newFailedTokenizers; // Still unused, but kept
		// Update successfullyFetchedTags: includes tags processed in this run that didn't fail
		cache.successfullyFetchedTags = pipelineTagsToProcess.filter(tag => !newFailedApiCalls.includes(tag));

		const hasApiFailures = newFailedApiCalls.length > 0;
		if (finalModels.length === 0 && pipelineTagsToProcess.length > 0 && hasApiFailures) {
			cache.status = CacheStatus.ERROR;
		} else if (hasApiFailures) {
			cache.status = CacheStatus.PARTIAL;
		} else {
			cache.status = CacheStatus.SUCCESS;
		}

		console.log(
			`Cache updated: ${finalModels.length} models, status: ${cache.status}, ` +
				`processed tags: ${pipelineTagsToProcess.join(", ")}, ` +
				`successfully fetched tags: ${cache.successfullyFetchedTags.join(", ") || "none"}, ` +
				`failed tokenizers: ${newFailedTokenizers.length}, ` +
				`API failures for tags in current run: ${newFailedApiCalls.length > 0 ? newFailedApiCalls.join(", ") : "none"}`
		);

		return createResponse({ models: finalModels });
	} catch (error) {
		console.error("Critical error in GET /api/models:", error);

		if (cache.data?.length) {
			// Fallback to existing cache on critical error
			cache.status = CacheStatus.ERROR;
			// Mark all processed tags as failed for this attempt
			cache.successfullyFetchedTags = cache.successfullyFetchedTags.filter(t => !pipelineTagsToProcess.includes(t));
			cache.timestamp = timestamp; // Update timestamp
			return createResponse({ models: cache.data });
		}

		// No cache available, and critical error occurred
		cache.status = CacheStatus.ERROR;
		cache.timestamp = timestamp;
		cache.data = [];
		cache.successfullyFetchedTags = []; // All processed tags failed or no tags processed
		return createResponse({ models: [] });
	}
};

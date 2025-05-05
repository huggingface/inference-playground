import fs from "fs/promises";
import path from "path";
import { fetchCohereData } from "./cohere.js";
import { fetchTogetherData } from "./together.js";
import { fetchFireworksData } from "./fireworks.js";
import { fetchHyperbolicData } from "./hyperbolic.js";
import { fetchReplicateData } from "./replicate.js";
import { fetchNebiusData } from "./nebius.js";
import { fetchNovitaData } from "./novita.js";
import { fetchSambanovaData } from "./sambanova.js";

// --- Constants ---
const CACHE_FILE_PATH = path.resolve("src/lib/server/data/context_length.json");

// --- Types ---
export interface MaxTokensCache {
	[provider: string]: {
		[modelId: string]: number;
	};
}

// Type for API keys object passed to fetchAllProviderData
export interface ApiKeys {
	COHERE_API_KEY?: string;
	TOGETHER_API_KEY?: string;
	FIREWORKS_API_KEY?: string;
	HYPERBOLIC_API_KEY?: string;
	REPLICATE_API_KEY?: string;
	NEBIUS_API_KEY?: string;
	NOVITA_API_KEY?: string;
	SAMBANOVA_API_KEY?: string;
}

// --- Cache Handling ---
// (readCache and updateCache remain the same)
let memoryCache: MaxTokensCache | null = null;
let cacheReadPromise: Promise<MaxTokensCache> | null = null;

async function readCache(): Promise<MaxTokensCache> {
	if (memoryCache) {
		return memoryCache;
	}
	if (cacheReadPromise) {
		return cacheReadPromise;
	}
	cacheReadPromise = (async () => {
		try {
			const data = await fs.readFile(CACHE_FILE_PATH, "utf-8");
			memoryCache = JSON.parse(data) as MaxTokensCache;
			return memoryCache!;
		} catch (error: unknown) {
			if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
				console.warn(`Cache file not found at ${CACHE_FILE_PATH}, starting with empty cache.`);
				memoryCache = {};
				return {};
			}
			console.error("Error reading context length cache file:", error);
			memoryCache = {};
			return {};
		} finally {
			cacheReadPromise = null;
		}
	})();
	return cacheReadPromise;
}

const isBrowser = typeof window !== "undefined";

function serverLog(...txt: unknown[]) {
	if (isBrowser) return;
	console.log(...txt);
}

function serverError(...txt: unknown[]) {
	if (isBrowser) return;
	console.error(...txt);
}

async function updateCache(provider: string, modelId: string, maxTokens: number): Promise<void> {
	try {
		let cache: MaxTokensCache;
		try {
			const data = await fs.readFile(CACHE_FILE_PATH, "utf-8");
			cache = JSON.parse(data) as MaxTokensCache;
		} catch (readError: unknown) {
			if (typeof readError === "object" && readError !== null && "code" in readError && readError.code === "ENOENT") {
				cache = {};
			} else {
				throw readError;
			}
		}
		if (!cache[provider]) {
			cache[provider] = {};
		}
		cache[provider][modelId] = maxTokens;
		const tempFilePath = CACHE_FILE_PATH + ".tmp";
		await fs.writeFile(tempFilePath, JSON.stringify(cache, null, "\t"), "utf-8");
		await fs.rename(tempFilePath, CACHE_FILE_PATH);
		memoryCache = cache;
		serverLog(`Cache updated for ${provider} - ${modelId}: ${maxTokens}`);
	} catch (error) {
		serverError(`Error updating context length cache for ${provider} - ${modelId}:`, error);
		memoryCache = null;
	}
}

// --- Main Exported Function ---
// Now accepts apiKey as the third argument
export async function getMaxTokens(
	provider: string,
	modelId: string,
	apiKey: string | undefined
): Promise<number | null> {
	const cache = await readCache();
	const cachedValue = cache[provider]?.[modelId];

	if (cachedValue !== undefined) {
		return cachedValue;
	}

	serverLog(`Cache miss for ${provider} - ${modelId}. Attempting live fetch...`);

	let liveData: number | null = null;
	let fetchedProviderData: MaxTokensCache[string] | null = null;

	try {
		// Pass the received apiKey to the fetcher functions
		switch (provider) {
			case "cohere":
				fetchedProviderData = await fetchCohereData(apiKey); // Pass apiKey
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			case "together":
				fetchedProviderData = await fetchTogetherData(apiKey); // Pass apiKey
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			case "fireworks-ai":
				fetchedProviderData = await fetchFireworksData(apiKey); // Pass apiKey
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			case "hyperbolic":
				fetchedProviderData = await fetchHyperbolicData(apiKey); // Pass apiKey
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			case "replicate":
				fetchedProviderData = await fetchReplicateData(apiKey);
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			case "nebius":
				fetchedProviderData = await fetchNebiusData(apiKey);
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			case "novita":
				fetchedProviderData = await fetchNovitaData(apiKey);
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			case "sambanova":
				fetchedProviderData = await fetchSambanovaData(apiKey);
				liveData = fetchedProviderData?.[modelId] ?? null;
				break;
			default:
				serverLog(`Live fetch not supported or implemented for provider: ${provider}`);
				return null;
		}

		if (liveData !== null) {
			serverLog(`Live fetch successful for ${provider} - ${modelId}: ${liveData}`);
			updateCache(provider, modelId, liveData).catch(err => {
				serverError(`Async cache update failed for ${provider} - ${modelId}:`, err);
			});
			return liveData;
		} else {
			serverLog(`Live fetch for ${provider} did not return data for model ${modelId}.`);
			return null;
		}
	} catch (error) {
		serverError(`Error during live fetch for ${provider} - ${modelId}:`, error);
		return null;
	}
}

// --- Helper for Build Script ---
// Now accepts an apiKeys object
export async function fetchAllProviderData(apiKeys: ApiKeys): Promise<MaxTokensCache> {
	serverLog("Fetching data for all providers...");
	const results: MaxTokensCache = {};

	// Define fetchers, passing the specific key from the apiKeys object
	const providerFetchers = [
		{ name: "cohere", fetcher: () => fetchCohereData(apiKeys.COHERE_API_KEY) },
		{ name: "together", fetcher: () => fetchTogetherData(apiKeys.TOGETHER_API_KEY) },
		{ name: "fireworks-ai", fetcher: () => fetchFireworksData(apiKeys.FIREWORKS_API_KEY) },
		{ name: "hyperbolic", fetcher: () => fetchHyperbolicData(apiKeys.HYPERBOLIC_API_KEY) },
		{ name: "replicate", fetcher: () => fetchReplicateData(apiKeys.REPLICATE_API_KEY) },
		{ name: "nebius", fetcher: () => fetchNebiusData(apiKeys.NEBIUS_API_KEY) },
		{ name: "novita", fetcher: () => fetchNovitaData(apiKeys.NOVITA_API_KEY) },
		{ name: "sambanova", fetcher: () => fetchSambanovaData(apiKeys.SAMBANOVA_API_KEY) },
	];

	const settledResults = await Promise.allSettled(providerFetchers.map(p => p.fetcher()));

	settledResults.forEach((result, index) => {
		const providerInfo = providerFetchers[index];
		if (!providerInfo) {
			serverError(`Error: No provider info found for index ${index}`);
			return;
		}
		const providerName = providerInfo.name;

		if (result.status === "fulfilled" && result.value) {
			if (Object.keys(result.value).length > 0) {
				results[providerName] = result.value;
				serverLog(`Successfully fetched data for ${providerName}`);
			} else {
				serverLog(`No data returned for ${providerName}.`);
			}
		} else if (result.status === "rejected") {
			serverError(`Error fetching ${providerName} data:`, result.reason);
		}
	});

	serverLog("Finished fetching provider data.");
	return results;
}

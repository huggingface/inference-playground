import type { MaxTokensCache } from "./index.js";

const REPLICATE_API_URL = "https://api.replicate.com/v1/models";

export async function fetchReplicateData(apiKey: string | undefined): Promise<MaxTokensCache["replicate"]> {
	if (!apiKey) {
		console.warn("Replicate API key not provided. Skipping Replicate fetch.");
		return {};
	}
	try {
		const response = await fetch(REPLICATE_API_URL, {
			headers: {
				Authorization: `Token ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`Replicate API request failed: ${response.status} ${response.statusText}`);
		}
		const data = await response.json();
		const modelsData: MaxTokensCache["replicate"] = {};

		if (data?.results && Array.isArray(data.results)) {
			for (const model of data.results) {
				const contextLength = model.context_length ?? model.config?.max_tokens ?? null;
				if (model.id && typeof contextLength === "number") {
					modelsData[model.id] = contextLength;
				}
			}
		} else {
			console.warn("Unexpected response structure from Replicate API:", data);
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching Replicate data:", error);
		return {};
	}
}

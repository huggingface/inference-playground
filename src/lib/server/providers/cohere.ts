import type { MaxTokensCache } from "./index.js";

const COHERE_API_URL = "https://api.cohere.ai/v1/models";

// Accept apiKey as an argument
export async function fetchCohereData(apiKey: string | undefined): Promise<MaxTokensCache["cohere"]> {
	if (!apiKey) {
		console.warn("Cohere API key not provided. Skipping Cohere fetch.");
		return {};
	}
	try {
		const response = await fetch(COHERE_API_URL, {
			headers: {
				Authorization: `Bearer ${apiKey}`, // Use passed-in apiKey
			},
		});
		if (!response.ok) {
			throw new Error(`Cohere API request failed: ${response.status} ${response.statusText}`);
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data: any = await response.json();
		const modelsData: MaxTokensCache["cohere"] = {};
		if (data?.models && Array.isArray(data.models)) {
			for (const model of data.models) {
				if (model.name && typeof model.context_length === "number") {
					modelsData[model.name] = model.context_length;
				}
			}
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching Cohere data:", error);
		return {};
	}
}

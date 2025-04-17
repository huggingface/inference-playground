import type { MaxTokensCache } from "./index.js";

const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/models"; // Assumed

export async function fetchFireworksData(apiKey: string | undefined): Promise<MaxTokensCache["fireworks-ai"]> {
	if (!apiKey) {
		console.warn("Fireworks AI API key not provided. Skipping Fireworks AI fetch.");
		return {};
	}
	try {
		const response = await fetch(FIREWORKS_API_URL, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`Fireworks AI API request failed: ${response.status} ${response.statusText}`);
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data: any = await response.json(); // Assuming OpenAI structure { data: [ { id: string, ... } ] }
		const modelsData: MaxTokensCache["fireworks-ai"] = {};

		// Check if data and data.data exist and are an array
		if (data?.data && Array.isArray(data.data)) {
			for (const model of data.data) {
				// Check for common context length fields (OpenAI uses context_window)
				const contextLength = model.context_length ?? model.context_window ?? model.config?.max_tokens ?? null;
				// Fireworks uses model.id
				if (model.id && typeof contextLength === "number") {
					modelsData[model.id] = contextLength;
				}
			}
		} else {
			console.warn("Unexpected response structure from Fireworks AI API:", data);
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching Fireworks AI data:", error);
		return {}; // Return empty on error
	}
}

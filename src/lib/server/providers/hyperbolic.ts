import type { MaxTokensCache } from "./index.js";

const HYPERBOLIC_API_URL = "https://api.hyperbolic.xyz/v1/models"; // Assumed

export async function fetchHyperbolicData(apiKey: string | undefined): Promise<MaxTokensCache["hyperbolic"]> {
	if (!apiKey) {
		console.warn("Hyperbolic API key not provided. Skipping Hyperbolic fetch.");
		return {};
	}
	try {
		const response = await fetch(HYPERBOLIC_API_URL, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`Hyperbolic API request failed: ${response.status} ${response.statusText}`);
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data: any = await response.json(); // Assuming OpenAI structure { data: [ { id: string, ... } ] }
		const modelsData: MaxTokensCache["hyperbolic"] = {};

		// Check if data and data.data exist and are an array
		if (data?.data && Array.isArray(data.data)) {
			for (const model of data.data) {
				// Check for common context length fields (OpenAI uses context_window)
				const contextLength = model.context_length ?? model.context_window ?? model.config?.max_tokens ?? null;
				// Assuming Hyperbolic uses model.id
				if (model.id && typeof contextLength === "number") {
					modelsData[model.id] = contextLength;
				}
			}
		} else {
			console.warn("Unexpected response structure from Hyperbolic API:", data);
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching Hyperbolic data:", error);
		return {}; // Return empty on error
	}
}

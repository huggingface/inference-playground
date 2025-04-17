import type { MaxTokensCache } from "./index.js";

interface NebiusModel {
	id: string;
	config?: {
		max_tokens?: number;
	};
	context_length?: number;
}

interface NebiusResponse {
	data?: NebiusModel[];
}

const NEBIUS_API_URL = "https://api.studio.nebius.com/v1/models?verbose=true";

export async function fetchNebiusData(apiKey: string | undefined): Promise<MaxTokensCache["nebius"]> {
	if (!apiKey) {
		console.warn("Nebius API key not provided. Skipping Nebius fetch.");
		return {};
	}
	try {
		const response = await fetch(NEBIUS_API_URL, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`Nebius API request failed: ${response.status} ${response.statusText}`);
		}
		const data: NebiusResponse = await response.json();
		const modelsData: MaxTokensCache["nebius"] = {};

		if (data?.data && Array.isArray(data.data)) {
			for (const model of data.data) {
				const contextLength = model.context_length ?? model.config?.max_tokens ?? null;
				if (model.id && typeof contextLength === "number") {
					modelsData[model.id] = contextLength;
				}
			}
		} else {
			console.warn("Unexpected response structure from Nebius API:", data);
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching Nebius data:", error);
		return {};
	}
}

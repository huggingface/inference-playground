import type { MaxTokensCache } from "./index.js";

const SAMBANOVA_API_URL = "https://api.sambanova.ai/v1/models";

interface SambanovaModel {
	id: string;
	object: string;
	context_length: number;
	max_completion_tokens?: number;
	pricing?: {
		prompt: string;
		completion: string;
	};
}

interface SambanovaResponse {
	data: SambanovaModel[];
	object: string;
}

export async function fetchSambanovaData(apiKey: string | undefined): Promise<MaxTokensCache["sambanova"]> {
	if (!apiKey) {
		console.warn("SambaNova API key not provided. Skipping SambaNova fetch.");
		return {};
	}
	try {
		const response = await fetch(SAMBANOVA_API_URL, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`SambaNova API request failed: ${response.status} ${response.statusText}`);
		}
		const data: SambanovaResponse = await response.json();
		const modelsData: MaxTokensCache["sambanova"] = {};

		if (data?.data && Array.isArray(data.data)) {
			for (const model of data.data) {
				if (model.id && typeof model.context_length === "number") {
					modelsData[model.id] = model.context_length;
				}
			}
		} else {
			console.warn("Unexpected response structure from SambaNova API:", data);
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching SambaNova data:", error);
		return {};
	}
}

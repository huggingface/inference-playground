import type { MaxTokensCache } from "./index.js";

const NOVITA_API_URL = "https://api.novita.ai/v3/openai/models";

interface NovitaModel {
	id: string;
	object: string;
	context_size: number;
}

interface NovitaResponse {
	data: NovitaModel[];
}

export async function fetchNovitaData(apiKey: string | undefined): Promise<MaxTokensCache["novita"]> {
	if (!apiKey) {
		console.warn("Novita API key not provided. Skipping Novita fetch.");
		return {};
	}
	try {
		const response = await fetch(NOVITA_API_URL, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		if (!response.ok) {
			throw new Error(`Novita API request failed: ${response.status} ${response.statusText}`);
		}
		const data: NovitaResponse = await response.json();
		const modelsData: MaxTokensCache["novita"] = {};

		if (data?.data && Array.isArray(data.data)) {
			for (const model of data.data) {
				if (model.id && typeof model.context_size === "number") {
					modelsData[model.id] = model.context_size;
				}
			}
		} else {
			console.warn("Unexpected response structure from Novita API:", data);
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching Novita data:", error);
		return {};
	}
}

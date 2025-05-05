import type { MaxTokensCache } from "./index.js";

const TOGETHER_API_URL = "https://api.together.xyz/v1/models";

// Accept apiKey as an argument
export async function fetchTogetherData(apiKey: string | undefined): Promise<MaxTokensCache["together"]> {
	if (!apiKey) {
		console.warn("Together AI API key not provided. Skipping Together AI fetch.");
		return {};
	}
	try {
		const response = await fetch(TOGETHER_API_URL, {
			headers: {
				Authorization: `Bearer ${apiKey}`, // Use passed-in apiKey
			},
		});
		if (!response.ok) {
			throw new Error(`Together AI API request failed: ${response.status} ${response.statusText}`);
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data: any[] = await response.json();
		const modelsData: MaxTokensCache["together"] = {};

		if (Array.isArray(data)) {
			for (const model of data) {
				const contextLength = model.context_length ?? model.config?.max_tokens ?? null;
				if (model.id && typeof contextLength === "number") {
					modelsData[model.id] = contextLength;
				}
			}
		}
		return modelsData;
	} catch (error) {
		console.error("Error fetching Together AI data:", error);
		return {};
	}
}

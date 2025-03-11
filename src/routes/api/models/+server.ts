import { env } from "$env/dynamic/private";
import type { Model, ModelWithTokenizer } from "$lib/types";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { dev } from "$app/environment";

let cache: ModelWithTokenizer[] | undefined;

export const GET: RequestHandler = async ({ fetch }) => {
	if (cache && dev) {
		console.log("Skipping load, using in memory cache");
		return json(cache);
	}

	const apiUrl =
		"https://huggingface.co/api/models?pipeline_tag=text-generation&filter=conversational&inference_provider=all&limit=100&expand[]=inferenceProviderMapping&expand[]=config&expand[]=library_name&expand[]=pipeline_tag&expand[]=tags&expand[]=mask_token&expand[]=trendingScore";

	const HF_TOKEN = env.HF_TOKEN;

	const res = await fetch(apiUrl, {
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`,
		},
	});

	if (!res.ok) {
		console.error(`Error fetching warm models`, res.status, res.statusText);
		return json({ models: [] });
	}

	const compatibleModels: Model[] = await res.json();
	compatibleModels.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

	const promises = compatibleModels.map(async model => {
		const configUrl = `https://huggingface.co/${model.id}/raw/main/tokenizer_config.json`;
		const res = await fetch(configUrl, {
			headers: {
				Authorization: `Bearer ${HF_TOKEN}`,
			},
		});

		if (!res.ok) {
			console.error(`Error fetching tokenizer file for ${model.id}`, res.status, res.statusText);
			return null; // Ignore failed requests by returning null
		}

		const tokenizerConfig = await res.json();
		return { ...model, tokenizerConfig } satisfies ModelWithTokenizer;
	});

	const models: ModelWithTokenizer[] = (await Promise.all(promises)).filter(model => model !== null);
	cache = models;

	return json(cache);
};

import { PipelineTag, type Model } from "$lib/types.js";
import type { RequestHandler } from "./$types.js";
import { cache, CacheEntry } from "./cache.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

type GetModelsForTagArgs = {
	tag: PipelineTag;
	fetch: Parameters<RequestHandler>[0]["fetch"];
};

export async function getModelsForTag({ tag, fetch }: GetModelsForTagArgs): Promise<Model[]> {
	if (cache[tag] && cache[tag].isFresh() && cache[tag].ok && cache[tag].data) {
		console.log(`Using cache for ${tag}`);
		return cache[tag].data;
	}

	console.log(`Fetching ${tag}`);

	const requestInit: RequestInit = {
		credentials: "include",
		headers: {
			"Upgrade-Insecure-Requests": "1",
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "none",
			"Sec-Fetch-User": "?1",
			"Priority": "u=0, i",
			"Pragma": "no-cache",
			"Cache-Control": "no-cache",
		},
		method: "GET",
		mode: "cors",
	};

	const url = new URL("https://huggingface.co/api/models");
	url.searchParams.append("inference_provider", "all");
	url.searchParams.append("limit", "100");
	url.searchParams.append("pipeline_tag", tag);
	["inferenceProviderMapping", "config", "library_name", "pipeline_tag", "tags", "mask_token", "trendingScore"].forEach(
		s => url.searchParams.append("expand[]", s),
	);

	if ([PipelineTag.TextGeneration, PipelineTag.ImageTextToText].includes(tag)) {
		url.searchParams.append("filter", "conversational");
	}

	const res = await fetch(url, requestInit);
	console.log(url.href);

	if (!res.ok) {
		cache[tag] = new CacheEntry({ ok: false });
		return [];
	}

	const data = await res.json();

	// Add preview images for visual pipeline tags using local mapping
	if ([PipelineTag.TextToImage, PipelineTag.TextToVideo, PipelineTag.ImageTextToText].includes(tag)) {
		let imageMapping: Record<string, string> = {};

		// Try to load the local image mapping
		try {
			const mappingPath = join(process.cwd(), "static", "model-image-mapping.json");
			if (existsSync(mappingPath)) {
				const mappingContent = readFileSync(mappingPath, "utf-8");
				imageMapping = JSON.parse(mappingContent);
			}
		} catch (error) {
			console.warn("Could not load model image mapping:", error);
		}

		const modelsWithImages = data.map((model: Model) => ({
			...model,
			preview_img: imageMapping[model.id] || undefined,
		}));

		cache[tag] = new CacheEntry({ ok: true, data: modelsWithImages });
		return modelsWithImages;
	}

	cache[tag] = new CacheEntry({ ok: true, data });
	return data;
}

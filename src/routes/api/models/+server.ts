import { PipelineTag, type Model } from "$lib/types.js";
import { error, json } from "@sveltejs/kit";
import typia from "typia";
import type { RequestHandler } from "./$types.js";
import { getModelsForTag } from "./get-models.js";

export type ApiModelsResponse = {
	models: Model[];
};

export const GET: RequestHandler = async ({ fetch, url: requestUrl }) => {
	const requestedTags = requestUrl.searchParams.getAll("pipeline_tag");

	// If no specific tags requested, get default tags
	const tags = requestedTags.length > 0 ? requestedTags : [PipelineTag.TextGeneration, PipelineTag.ImageTextToText];

	if (!typia.is<PipelineTag[]>(tags)) {
		return error(500, "Invalid query params");
	}

	const promises = await Promise.all(tags.map(tag => getModelsForTag({ tag, fetch })));

	return json({ models: promises.flat() });
};

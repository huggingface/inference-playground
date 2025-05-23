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
	if (!typia.is<PipelineTag[]>(requestedTags)) {
		return error(500, "Invalid query params");
	}
	const promises = await Promise.all(requestedTags.map(tag => getModelsForTag({ tag, fetch })));

	return json({ models: promises.flat() });
};

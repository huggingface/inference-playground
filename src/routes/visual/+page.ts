import { PipelineTag } from "$lib/types.js";
import type { PageLoad } from "./$types.js";
import type { ApiModelsResponse } from "../api/models/+server.js";

export const load: PageLoad = async ({ fetch }) => {
	const params = new URLSearchParams();
	params.append("pipeline_tag", PipelineTag.TextToImage);
	params.append("pipeline_tag", PipelineTag.TextToVideo);

	const res = await fetch(`/api/models?${params.toString()}`);
	const json: ApiModelsResponse = await res.json();
	return json;
};

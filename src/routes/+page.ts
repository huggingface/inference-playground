import type { PageLoad } from "./$types.js";
import type { ApiModelsResponse } from "./api/models/+server.js";

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch("/api/models");
	const json: ApiModelsResponse = await res.json();
	return json;
};

import type { PageLoad } from "./$types.js";
import type { ApiModelsResponse } from "./api/models/+server.js";

export const load: PageLoad = async ({ fetch }) => {
	const [modelsRes, routerRes] = await Promise.all([
		fetch("/api/models"),
		fetch("https://router.huggingface.co/v1/models"),
	]);

	const models: ApiModelsResponse = await modelsRes.json();
	const routerData = await routerRes.json();

	return {
		...models,
		routerData,
	};
};

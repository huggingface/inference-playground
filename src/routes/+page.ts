import type { Provider } from "$lib/types.js";
import type { PageLoad } from "./$types.js";
import type { ApiModelsResponse } from "./api/models/+server.js";

export type RouterData = {
	object: string;
	data: Datum[];
};

type Datum = {
	id: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	object: any;
	created: number;
	owned_by: string;
	providers: ProviderElement[];
};

type ProviderElement = {
	provider: Provider;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	status: any;
	context_length?: number;
	pricing?: Pricing;
	supports_tools?: boolean;
	supports_structured_output?: boolean;
};

type Pricing = {
	input: number;
	output: number;
};

export const load: PageLoad = async ({ fetch }) => {
	const [modelsRes, routerRes] = await Promise.all([
		fetch("/api/models"),
		fetch("https://router.huggingface.co/v1/models"),
	]);

	const models: ApiModelsResponse = await modelsRes.json();
	const routerData = (await routerRes.json()) as RouterData;

	return {
		...models,
		routerData,
	};
};

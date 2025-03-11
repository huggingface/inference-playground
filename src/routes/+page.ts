import type { ModelWithTokenizer } from "$lib/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch("/api/models");
	const models: ModelWithTokenizer[] = await res.json();
	return { models };
};

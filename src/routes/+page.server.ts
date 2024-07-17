import type { ModelEntryWithTokenizer } from '$lib/types';
import type { ModelEntry } from '@huggingface/hub';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ fetch }) => {
	const apiUrl =
		'https://huggingface.co/api/models?pipeline_tag=text-generation&inference=Warm&filter=conversational';
	const HF_TOKEN = env.HF_TOKEN;

	const res = await fetch(apiUrl, {
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`
		}
	});
	const compatibleModels: ModelEntry[] = await res.json();
	compatibleModels.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));

	const promises = compatibleModels.map(async (model) => {
		const configUrl = `https://huggingface.co/${model.modelId}/raw/main/tokenizer_config.json`;
		const res = await fetch(configUrl, {
			headers: {
				Authorization: `Bearer ${HF_TOKEN}`
			}
		});
		if (!res.ok) {
			throw new Error(
				`Failed to fetch tokenizer configuration for model ${model.id}: ${res.status} ${res.statusText}`
			);
		}
		const tokenizerConfig = await res.json();
		return { ...model, tokenizerConfig } satisfies ModelEntryWithTokenizer;
	});

	const models: ModelEntryWithTokenizer[] = await Promise.all(promises);

	return { models };
};

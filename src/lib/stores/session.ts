import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { defaultGenerationConfig } from "$lib/components/InferencePlayground/generationConfigSettings";
import {
	defaultSystemMessage,
	FEATURED_MODELS_IDS,
} from "$lib/components/InferencePlayground/inferencePlaygroundUtils";
import type { Conversation, ConversationMessage, Session } from "$lib/components/InferencePlayground/types";

import { models } from "$lib/stores/models";
import { get, writable } from "svelte/store";

function createSessionStore() {
	const store = writable<Session>(undefined, (set, update) => {
		const searchParams = new URLSearchParams(browser ? window.location.search : undefined);

		const modelIdsFromSearchParam = searchParams.getAll("modelId");
		const modelsFromSearchParam = modelIdsFromSearchParam?.map(id => get(models).find(model => model.id === id));

		const providersFromSearchParam = searchParams.getAll("provider");

		const startMessageUser: ConversationMessage = { role: "user", content: "" };
		const systemMessage: ConversationMessage = {
			role: "system",
			content: modelIdsFromSearchParam?.[0] ? (defaultSystemMessage?.[modelIdsFromSearchParam[0]] ?? "") : "",
		};

		set({
			conversations: [
				{
					model: get(models).find(m => FEATURED_MODELS_IDS.includes(m.id)) ??
						get(models)[0] ?? {
							id: "",
							downloads: 0,
							gated: false,
							likes: 0,
							name: "",
							private: false,
							tokenizerConfig: {},
							updatedAt: new Date(),
						},
					config: { ...defaultGenerationConfig },
					messages: [{ ...startMessageUser }],
					systemMessage,
					streaming: true,
				},
			],
		});

		if (modelsFromSearchParam?.length) {
			const conversations = modelsFromSearchParam.map((model, i) => {
				return {
					model,
					config: { ...defaultGenerationConfig },
					messages: [{ ...startMessageUser }],
					systemMessage,
					streaming: true,
					provider: providersFromSearchParam?.[i],
				};
			}) as [Conversation] | [Conversation, Conversation];
			update(s => ({ ...s, conversations }));
		}
	});

	const update: typeof store.update = cb => {
		const query = new URLSearchParams(window.location.search);
		query.delete("modelId");
		query.delete("provider");

		store.update($s => {
			const s = cb($s);

			const modelIds = s.conversations.map(c => c.model.id);
			modelIds.forEach(m => query.append("modelId", m));

			const providers = s.conversations.map(c => c.provider ?? "hf-inference");
			providers.forEach(p => query.append("provider", p));

			goto(`?${query}`, { replaceState: true });

			return s;
		});
	};

	const set: typeof store.set = (...args) => {
		update(_ => args[0]);
	};

	return { ...store, set, update };
}

export const session = createSessionStore();

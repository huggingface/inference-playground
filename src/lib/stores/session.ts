import { goto } from "$app/navigation";
import { defaultGenerationConfig } from "$lib/components/InferencePlayground/generationConfigSettings";
import { models } from "$lib/stores/models";
import {
	PipelineTag,
	type Conversation,
	type ConversationMessage,
	type ModelWithTokenizer,
	type Session,
} from "$lib/types";
import { safeParse } from "$lib/utils/json";
import { getTrending } from "$lib/utils/model";
import { get, writable } from "svelte/store";
import typia from "typia";

const LOCAL_STORAGE_KEY = "hf_inference_playground_session";

const startMessageUser: ConversationMessage = { role: "user", content: "" };
const systemMessage: ConversationMessage = {
	role: "system",
	content: "",
};

const emptyModel: ModelWithTokenizer = {
	_id: "",
	inferenceProviderMapping: [],
	pipeline_tag: PipelineTag.TextGeneration,
	trendingScore: 0,
	tags: ["text-generation"],
	id: "",
	tokenizerConfig: {},
	config: {
		architectures: [] as string[],
		model_type: "",
		tokenizer_config: {},
	},
};

function createSessionStore() {
	const store = writable<Session>(undefined, set => {
		const $models = get(models);
		const featured = getTrending($models);
		const defaultModel = featured[0] ?? $models[0] ?? emptyModel;

		// Parse URL query parameters
		const searchParams = new URLSearchParams(window.location.search);
		const searchProviders = searchParams.getAll("provider");
		const searchModelIds = searchParams.getAll("modelId");
		const modelsFromSearch = searchModelIds.map(id => $models.find(model => model.id === id)).filter(Boolean);

		const defaultConversation: Conversation = {
			model: defaultModel,
			config: { ...defaultGenerationConfig },
			messages: [{ ...startMessageUser }],
			systemMessage,
			streaming: true,
		};

		// Get saved session from localStorage if available
		let savedSession: Session = {
			conversations: [defaultConversation],
		};

		const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (savedData) {
			const parsed = safeParse(savedData);
			const res = typia.validate<Session>(parsed);
			if (res.success) savedSession = parsed;
			else localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedSession));
		}

		// Merge query params with savedSession.
		// Query params models and providers take precedence over savedSession's.
		// In any case, we try to merge the two, and the amount of conversations
		// is the maximum between the two.
		const max = Math.max(savedSession.conversations.length, modelsFromSearch.length, searchProviders.length);
		for (let i = 0; i < max; i++) {
			const conversation = savedSession.conversations[i] ?? defaultConversation;
			savedSession.conversations[i] = {
				...conversation,
				model: modelsFromSearch[i] ?? conversation.model,
				provider: searchProviders[i] ?? conversation.provider,
			};
		}

		set(savedSession);
	});

	// Override update method to sync with localStorage and URL params
	const update: typeof store.update = cb => {
		const prevQuery = window.location.search;
		const query = new URLSearchParams(window.location.search);
		query.delete("modelId");
		query.delete("provider");

		store.update($s => {
			const s = cb($s);

			// Save to localStorage
			try {
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(s));
			} catch (e) {
				console.error("Failed to save session to localStorage:", e);
			}

			// Update URL query parameters
			const modelIds = s.conversations.map(c => c.model.id);
			modelIds.forEach(m => query.append("modelId", m));

			const providers = s.conversations.map(c => c.provider ?? "hf-inference");
			providers.forEach(p => query.append("provider", p));

			const newQuery = query.toString();
			if (newQuery !== prevQuery.slice(1)) {
				window.parent.postMessage(
					{
						queryString: query.toString(),
					},
					"https://huggingface.co"
				);
				goto(`?${query}`, { replaceState: true });
			}

			return s;
		});
	};

	// Override set method to use our custom update
	const set: typeof store.set = (...args) => {
		update(_ => args[0]);
	};

	// Add a method to clear localStorage
	const clearSavedSession = () => {
		localStorage.removeItem(LOCAL_STORAGE_KEY);
	};

	return { ...store, set, update, clearSavedSession };
}

export const session = createSessionStore();

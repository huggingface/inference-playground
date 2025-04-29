import { defaultGenerationConfig } from "$lib/components/inference-playground/generation-config-settings.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Svelte imports are broken in TS files
import { showQuotaModal } from "$lib/components/quota-modal.svelte";
import { createInit } from "$lib/spells/create-init.svelte.js";
import {
	PipelineTag,
	type Conversation,
	type ConversationMessage,
	type DefaultProject,
	type Model,
	type Project,
	type Session,
} from "$lib/types.js";
import { safeParse } from "$lib/utils/json.js";
import typia from "typia";
import { models } from "./models.svelte";
import { checkpoints } from "./checkpoints.svelte";
import { handleNonStreamingResponse, handleStreamingResponse } from "$lib/components/inference-playground/utils.js";
import { AbortManager } from "$lib/spells/abort-manager.svelte";
import { addToast } from "$lib/components/toaster.svelte.js";
import { token } from "./token.svelte";

const LOCAL_STORAGE_KEY = "hf_inference_playground_session";

interface GenerationStatistics {
	latency: number;
	generatedTokensCount: number;
}

const startMessageUser: ConversationMessage = { role: "user", content: "" };
const systemMessage: ConversationMessage = {
	role: "system",
	content: "",
};

export const emptyModel: Model = {
	_id: "",
	inferenceProviderMapping: [],
	pipeline_tag: PipelineTag.TextGeneration,
	trendingScore: 0,
	tags: ["text-generation"],
	id: "",
	config: {
		architectures: [] as string[],
		model_type: "",
		tokenizer_config: {},
	},
};

function getDefaults() {
	const defaultModel = models.trending[0] ?? models.remote[0] ?? emptyModel;

	const defaultConversation: Conversation = {
		model: defaultModel,
		config: { ...defaultGenerationConfig },
		messages: [{ ...startMessageUser }],
		systemMessage,
		streaming: true,
	};

	const defaultProject: DefaultProject = {
		name: "Default",
		id: "default",
		conversations: [defaultConversation],
	};

	return { defaultProject, defaultConversation };
}

class SessionState {
	#value = $state<Session>({} as Session);

	generationStats = $state([{ latency: 0, generatedTokensCount: 0 }] as
		| [GenerationStatistics]
		| [GenerationStatistics, GenerationStatistics]);
	generating = $state(false);

	#abortManager = new AbortManager();

	// Call once in layout
	init = createInit(() => {
		const { defaultConversation, defaultProject } = getDefaults();

		// Get saved session from localStorage if available
		let savedSession: Session = {
			projects: [defaultProject],
			activeProjectId: defaultProject.id,
		};

		const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (savedData) {
			const parsed = safeParse(savedData);
			const res = typia.validate<Session>(parsed);
			if (res.success) {
				savedSession = parsed;
			} else {
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedSession));
			}
		}

		// Merge query params with savedSession's default project
		// Query params models and providers take precedence over savedSession's.
		// In any case, we try to merge the two, and the amount of conversations
		// is the maximum between the two.
		const dp = savedSession.projects.find(p => p.id === "default");
		if (typia.is<DefaultProject>(dp)) {
			// Parse URL query parameters
			const searchParams = new URLSearchParams(window.location.search);
			const searchProviders = searchParams.getAll("provider");
			const searchModelIds = searchParams.getAll("modelId");
			const modelsFromSearch = searchModelIds.map(id => models.remote.find(model => model.id === id)).filter(Boolean);
			if (modelsFromSearch.length > 0) {
				savedSession.activeProjectId = "default";

				let min = Math.min(dp.conversations.length, modelsFromSearch.length, searchProviders.length);
				min = Math.max(1, min);
				const convos = dp.conversations.slice(0, min);
				if (typia.is<Project["conversations"]>(convos)) dp.conversations = convos;

				for (let i = 0; i < min; i++) {
					const conversation = dp.conversations[i] ?? defaultConversation;
					dp.conversations[i] = {
						...conversation,
						model: modelsFromSearch[i] ?? conversation.model,
						provider: searchProviders[i] ?? conversation.provider,
					};
				}
			}
		}

		this.$ = savedSession;
		session.generationStats = session.project.conversations.map(_ => ({ latency: 0, generatedTokensCount: 0 })) as
			| [GenerationStatistics]
			| [GenerationStatistics, GenerationStatistics];
		this.#abortManager.init();
	});

	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (!this.init.called) return;
				const v = $state.snapshot(this.#value);
				try {
					localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(v));
				} catch (e) {
					console.error("Failed to save session to localStorage:", e);
				}
			});
		});
	}

	get $() {
		return this.#value;
	}

	set $(v: Session) {
		this.#value = v;
	}

	#setAnySession(s: unknown) {
		if (typia.is<Session>(s)) this.$ = s;
	}

	saveProject = (args: { name: string; moveCheckpoints?: boolean }) => {
		const defaultProject = this.$.projects.find(p => p.id === "default");
		if (!defaultProject) return;

		const project: Project = {
			...defaultProject,
			name: args.name,
			id: crypto.randomUUID(),
		};

		if (args.moveCheckpoints) {
			checkpoints.migrate(defaultProject.id, project.id);
		}

		defaultProject.conversations = [getDefaults().defaultConversation];

		this.addProject(project);
	};

	addProject = (project: Project) => {
		this.$ = { ...this.$, projects: [...this.$.projects, project], activeProjectId: project.id };
	};

	deleteProject = (id: string) => {
		// Can't delete default project!
		if (id === "default") return;

		const projects = this.$.projects.filter(p => p.id !== id);
		if (projects.length === 0) {
			const { defaultProject } = getDefaults();
			this.#setAnySession({ ...this.$, projects: [defaultProject], activeProjectId: defaultProject.id });
		}

		const currProject = projects.find(p => p.id === this.$.activeProjectId);
		this.#setAnySession({ ...this.$, projects, activeProjectId: currProject?.id ?? projects[0]?.id });
		checkpoints.clear(id);
	};

	updateProject = (id: string, data: Partial<Project>) => {
		const projects = this.$.projects.map(p => (p.id === id ? { ...p, ...data } : p));
		this.#setAnySession({ ...this.$, projects });
	};

	get project() {
		return this.$.projects.find(p => p.id === this.$.activeProjectId) ?? this.$.projects[0];
	}

	set project(np: Project) {
		const projects = this.$.projects.map(p => (p.id === np.id ? np : p));
		this.#setAnySession({ ...this.$, projects });
	}

	async #runInference(conversation: Conversation) {
		const idx = session.project.conversations.indexOf(conversation);

		const startTime = performance.now();

		if (conversation.streaming) {
			let addedMessage = false;
			const streamingMessage = $state({ role: "assistant", content: "" });

			await handleStreamingResponse(
				conversation,
				content => {
					if (!streamingMessage) return;
					streamingMessage.content = content;
					if (!addedMessage) {
						conversation.messages = [...conversation.messages, streamingMessage];
						addedMessage = true;
					}
				},
				this.#abortManager.createController()
			);
		} else {
			const { message: newMessage, completion_tokens: newTokensCount } = await handleNonStreamingResponse(conversation);
			conversation.messages = [...conversation.messages, newMessage];
			const c = session.generationStats[idx];
			if (c) c.generatedTokensCount += newTokensCount;
		}

		const endTime = performance.now();
		const c = session.generationStats[idx];
		if (c) c.latency = Math.round(endTime - startTime);
	}

	async run(conv: "left" | "right" | "both" | Conversation = "both") {
		if (!token.value) {
			token.showModal = true;
			return;
		}

		const conversations = (() => {
			if (typeof conv === "string") {
				return session.project.conversations.filter((_, idx) => {
					return conv === "both" || (conv === "left" ? idx === 0 : idx === 1);
				});
			}
			return [conv];
		})();

		for (let idx = 0; idx < conversations.length; idx++) {
			const conversation = conversations[idx];
			if (!conversation || conversation.messages.at(-1)?.role !== "assistant") continue;

			let prefix = "";
			if (session.project.conversations.length === 2) {
				prefix = `Error on ${idx === 0 ? "left" : "right"} conversation. `;
			}
			return addToast({
				title: "Failed to run inference",
				description: `${prefix}Messages must alternate between user/assistant roles.`,
				variant: "error",
			});
		}

		(document.activeElement as HTMLElement).blur();
		session.generating = true;

		try {
			const promises = conversations.map(c => this.#runInference(c));
			await Promise.all(promises);
		} catch (error) {
			for (const conversation of conversations) {
				if (conversation.messages.at(-1)?.role === "assistant" && !conversation.messages.at(-1)?.content?.trim()) {
					conversation.messages.pop();
					conversation.messages = [...conversation.messages];
				}
				// eslint-disable-next-line no-self-assign
				session.$ = session.$;
			}

			if (error instanceof Error) {
				const msg = error.message;
				if (msg.toLowerCase().includes("montly") || msg.toLowerCase().includes("pro")) {
					showQuotaModal();
				}

				if (error.message.includes("token seems invalid")) {
					token.reset();
				}

				if (error.name !== "AbortError") {
					addToast({ title: "Error", description: error.message, variant: "error" });
				}
			} else {
				addToast({ title: "Error", description: "An unknown error occurred", variant: "error" });
			}
		} finally {
			session.generating = false;
			this.#abortManager.clear();
		}
	}

	stopGenerating = () => {
		this.#abortManager.abortAll();
		session.generating = false;
	};

	runOrStop = (c?: Parameters<typeof this.run>[0]) => {
		if (session.generating) {
			this.stopGenerating();
		} else {
			this.run(c);
		}
	};
}

export const session = new SessionState();

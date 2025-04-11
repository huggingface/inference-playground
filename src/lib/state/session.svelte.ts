import { defaultGenerationConfig } from "$lib/components/inference-playground/generation-config-settings.js";
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

const LOCAL_STORAGE_KEY = "hf_inference_playground_session";

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
	// Call this only when the value is read, otherwise some values may have not
	// been loaded yet (page.data, for example)
	#init = createInit(() => {
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
			if (modelsFromSearch.length > 0) savedSession.activeProjectId = "default";

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

		this.$ = savedSession;
	});

	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (!this.#init.called) return;
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
		this.#init.fn();
		return this.#value;
	}

	set $(v: Session) {
		this.#value = v;
	}

	#setAnySession(s: unknown) {
		if (typia.is<Session>(s)) this.$ = s;
	}

	saveProject = (name: string) => {
		const defaultProject = this.$.projects.find(p => p.id === "default");
		if (!defaultProject) return;

		const project: Project = {
			...defaultProject,
			name,
			id: crypto.randomUUID(),
		};

		checkpoints.migrate(defaultProject.id, project.id);

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
}

export const session = new SessionState();

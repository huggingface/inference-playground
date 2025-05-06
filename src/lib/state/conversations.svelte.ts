import { defaultGenerationConfig } from "$lib/components/inference-playground/generation-config-settings.js";
import {
	handleNonStreamingResponse,
	handleStreamingResponse,
} from "$lib/components/inference-playground/utils.svelte.js";
import { addToast } from "$lib/components/toaster.svelte.js";
import { AbortManager } from "$lib/spells/abort-manager.svelte";
import {
	PipelineTag,
	type Conversation,
	type ConversationMessage,
	type CustomModel,
	type GenerationStatistics,
	type Model,
	type Project,
} from "$lib/types.js";
import { snapshot } from "$lib/utils/object.svelte";
import { db, type ConversationFromDb } from "./db.svelte";
import { models } from "./models.svelte";
import { projects } from "./projects.svelte";
import { token } from "./token.svelte";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Svelte imports are broken in TS files
import { showQuotaModal } from "$lib/components/quota-modal.svelte";

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

function getDefaultConversation(projectId: string): ConversationFromDb {
	return {
		projectId,
		modelId: models.trending[0]?.id ?? models.remote[0]?.id ?? emptyModel.id,
		config: { ...defaultGenerationConfig },
		messages: [{ ...startMessageUser }],
		systemMessage,
		streaming: true,
		id: undefined,
		createdAt: new Date().toLocaleString(),
	};
}

export type CoolConversationOld = ConversationFromDb & {
	readonly model: Model | CustomModel;
};

export class CoolConversation {
	#data = $state.raw() as ConversationFromDb;
	readonly model = $derived(models.all.find(m => m.id === this.data.modelId) ?? emptyModel);

	abortManager = new AbortManager();
	generationStats = $state({ latency: 0, tokens: 0 }) as GenerationStatistics;
	generating = $state(false);

	constructor(data: ConversationFromDb) {
		this.#data = data;
	}

	get data() {
		return this.#data;
	}

	async update(data: Partial<ConversationFromDb>) {
		console.log("id", this.data.id);
		if (this.data.id === -1) return;
		const cloned = snapshot({ ...this.data, ...data });

		if (this.data.id === undefined) {
			this.#data = { ...this.#data, id: await db.conversations.add(cloned) };
		} else {
			db.conversations.update(this.data.id, cloned);
		}

		this.#data = cloned;
	}

	async addMessage(message: ConversationMessage) {
		this.update({
			...this.data,
			messages: [...this.data.messages, snapshot(message)],
		});
	}

	async updateMessage(args: { index: number; message: ConversationMessage }) {
		this.update({
			...this.data,
			messages: [
				...this.data.messages.slice(0, args.index),
				snapshot(args.message),
				...this.data.messages.slice(args.index + 1),
			],
		});
	}

	async deleteMessages(from: number) {
		this.update({
			messages: this.data.messages.slice(0, from),
		});
	}

	async genNextMessage() {
		this.generating = true;
		const startTime = performance.now();

		const conv: Conversation = {
			model: this.model,
			...this.data,
			streaming: this.data.streaming ?? true,
		};

		try {
			if (conv.streaming) {
				let addedMessage = false;
				const streamingMessage = $state({ role: "assistant", content: "" });

				await handleStreamingResponse(
					conv,
					content => {
						if (!streamingMessage) return;
						streamingMessage.content = content;

						if (!addedMessage) {
							this.addMessage(streamingMessage);
							addedMessage = true;
						} else {
							this.updateMessage({ index: this.data.messages.length - 1, message: streamingMessage });
						}
					},
					this.abortManager.createController()
				);
			} else {
				const { message: newMessage, completion_tokens: newTokensCount } = await handleNonStreamingResponse(conv);
				this.addMessage(newMessage);
				this.generationStats.tokens += newTokensCount;
			}
		} catch {
			// no-op
		}

		const endTime = performance.now();
		this.generationStats.latency = Math.round(endTime - startTime);
		this.generating = false;
	}

	stopGenerating = () => {
		this.abortManager.abortAll();
		this.generating = false;
	};
}

class Conversations {
	#conversations: Record<Project["id"], CoolConversation[]> = $state.raw({});
	generating = $derived(this.active.some(c => c.generating));
	generationStats = $derived(this.active.map(c => c.generationStats));

	loaded = $state(false);

	#active = $derived(this.for(projects.activeId));

	get active() {
		return this.#active;
	}

	async create(args: { projectId: Project["id"]; modelId?: Model["id"] } & Partial<ConversationFromDb>) {
		const conv = snapshot({
			...getDefaultConversation(args.projectId),
			...args,
		});
		if (args.modelId) conv.modelId = args.modelId;

		const id = await db.conversations.add(conv);
		const prev = this.#conversations[args.projectId] ?? [];
		this.#conversations = {
			...this.#conversations,
			[args.projectId]: [...prev, new CoolConversation({ ...conv, id })],
		};
	}

	for(projectId: Project["id"]): CoolConversation[] {
		// Async load from db
		if (this.#conversations[projectId] === undefined) {
			db.conversations
				.where("projectId")
				.equals(projectId)
				.toArray()
				.then(c => {
					if (!c.length) c.push(getDefaultConversation(projectId));
					this.#conversations = { ...this.#conversations, [projectId]: c.map(c => new CoolConversation(c)) };
				});
		}

		let res = this.#conversations[projectId];
		if (res?.length === 0 || !res) {
			const dc = { ...getDefaultConversation(projectId), id: -1 };
			res = [new CoolConversation(dc)];
		}

		return res.slice(0, 2).toSorted((a, b) => {
			return a.data.createdAt.localeCompare(b.data.createdAt);
		});
	}

	async delete({ id, projectId }: ConversationFromDb) {
		if (!id) return;

		await db.conversations.delete(id);

		const prev = this.#conversations[projectId] ?? [];
		this.#conversations = { ...this.#conversations, [projectId]: prev.filter(c => c.data.id != id) };
	}

	async deleteAllFrom(projectId: string) {
		this.for(projectId).forEach(c => this.delete(c.data));
	}

	async reset() {
		this.active.forEach(c => this.delete(c.data));
		this.create(getDefaultConversation(projects.activeId));
	}

	async migrate(from: Project["id"], to: Project["id"]) {
		const fromArr = this.#conversations[from] ?? [];
		await Promise.allSettled(fromArr.map(c => c.update({ projectId: to })));
		this.#conversations[to] = [...fromArr];
		this.#conversations[from] = [];
	}

	async genNextMessages(conv: "left" | "right" | "both" | CoolConversation = "both") {
		if (!token.value) {
			token.showModal = true;
			return;
		}

		const conversations = (() => {
			if (typeof conv === "string") {
				return this.active.filter((_, idx) => {
					return conv === "both" || (conv === "left" ? idx === 0 : idx === 1);
				});
			}
			return [conv];
		})();

		for (let idx = 0; idx < conversations.length; idx++) {
			const conversation = conversations[idx];
			if (!conversation || conversation.data.messages.at(-1)?.role !== "assistant") continue;

			let prefix = "";
			if (this.active.length === 2) {
				prefix = `Error on ${idx === 0 ? "left" : "right"} conversation. `;
			}
			return addToast({
				title: "Failed to run inference",
				description: `${prefix}Messages must alternate between user/assistant roles.`,
				variant: "error",
			});
		}

		(document.activeElement as HTMLElement).blur();

		try {
			const promises = conversations.map(c => c.genNextMessage());
			await Promise.all(promises);
		} catch (error) {
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
		}
	}

	stopGenerating = () => {
		this.active.forEach(c => c.abortManager.abortAll());
	};

	genOrStop = (c?: Parameters<typeof this.genNextMessages>[0]) => {
		if (this.generating) {
			this.stopGenerating();
		} else {
			this.genNextMessages(c);
		}
	};
}

export const conversations = new Conversations();

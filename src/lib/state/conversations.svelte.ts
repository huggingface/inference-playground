import { defaultGenerationConfig } from "$lib/components/inference-playground/generation-config-settings.js";
import { PipelineTag, type ConversationMessage, type CustomModel, type Model, type Project } from "$lib/types.js";
import { snapshot } from "$lib/utils/object.svelte";
import { dequal } from "dequal";
import { db, type ConversationFromDb } from "./db.svelte";
import { models } from "./models.svelte";
import { AbortManager } from "$lib/spells/abort-manager.svelte";
import { message } from "typia/lib/protobuf";

const startMessageUser: ConversationMessage = { role: "user", content: "" };
const systemMessage: ConversationMessage = {
	role: "system",
	content: "",
};

const emptyModel: Model = {
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
	};
}

export type CoolConversationOld = ConversationFromDb & {
	readonly model: Model | CustomModel;
};

export class CoolConversation {
	data = $state() as ConversationFromDb;
	readonly model = $derived(models.all.find(m => m.id === this.data.modelId) ?? emptyModel);

	// abortManager = new AbortManager();
	generating = $state(false);

	constructor(data: ConversationFromDb) {
		this.data = data;
	}

	async update(data: ConversationFromDb) {
		const cloned = snapshot(data);

		if (this.data.id === undefined) {
			this.data.id = await db.conversations.add(cloned);
		} else {
			db.conversations.update(this.data.id, cloned);
		}

		this.data = cloned;
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
}

class Conversations {
	#conversations: Record<Project["id"], ConversationFromDb[]> = $state.raw({});

	async create(args: { projectId: Project["id"]; modelId?: Model["id"] }) {
		const conv = snapshot({
			...getDefaultConversation(args.projectId),
		});
		if (args.modelId) conv.modelId = args.modelId;

		const id = await db.conversations.add(conv);
		const prev: ConversationFromDb[] = this.#conversations[args.projectId] ?? [];
		this.#conversations[args.projectId] = [...prev, { ...conv, id }];
	}

	for(projectId: Project["id"]): CoolConversation[] {
		// Async load from db
		console.log("reloading");
		db.conversations
			.where("projectId")
			.equals(projectId)
			.toArray()
			.then(c => {
				// Dequal to avoid infinite loops
				if (dequal(c, this.#conversations[projectId])) return;
				this.#conversations = { ...this.#conversations, [projectId]: c };
			});

		let res = this.#conversations[projectId];
		if (res?.length === 0 || !res) {
			res = [getDefaultConversation(projectId)];
		}

		return res.map(c => {
			return new CoolConversation(c);
		});
	}

	async update({ id, ...data }: ConversationFromDb) {
		const convIndex = this.#conversations[data.projectId]?.findIndex(c => c.id === id) ?? -1;
		if (convIndex === -1) return;

		if (id === undefined) {
			id = await db.conversations.add(snapshot(data));
		} else {
			db.conversations.update(id, snapshot(data));
		}

		const prev: ConversationFromDb[] = this.#conversations[data.projectId] ?? [];
		this.#conversations[data.projectId] = [...prev.slice(0, convIndex), { ...data, id }, ...prev.slice(convIndex + 1)];
	}

	async delete({ id, projectId }: ConversationFromDb) {
		if (!id) return;

		await db.conversations.delete(id);

		const prev: ConversationFromDb[] = this.#conversations[projectId] ?? [];
		this.#conversations = { ...this.#conversations, [projectId]: prev.filter(c => c.id != id) };
	}
}

export const conversations = new Conversations();

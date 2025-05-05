import { defaultGenerationConfig } from "$lib/components/inference-playground/generation-config-settings.js";
import { PipelineTag, type ConversationMessage, type CustomModel, type Model, type Project } from "$lib/types.js";
import { snapshot } from "$lib/utils/object.svelte";
import { dequal } from "dequal";
import { db, type ConversationFromDb } from "./db.svelte";
import { models } from "./models.svelte";

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

export type CoolConversation = ConversationFromDb & {
	readonly model: Model | CustomModel;
};

class Conversations {
	#conversations: Record<Project["id"], ConversationFromDb[]> = $state({});

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
		db.conversations
			.where("projectId")
			.equals(projectId)
			.toArray()
			.then(c => {
				// Dequal to avoid infinite loops
				if (dequal(c, this.#conversations[projectId])) return;
				this.#conversations[projectId] = c;
			});

		let res = this.#conversations[projectId];
		if (res?.length === 0 || !res) {
			res = [getDefaultConversation(projectId)];
		}

		return res.map(c => {
			return {
				...c,
				get model() {
					return models.all.find(m => m.id === c.modelId) ?? emptyModel;
				},
			};
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
		this.#conversations[projectId] = prev.filter(c => c.id != id);
	}
}

export const conversations = new Conversations();

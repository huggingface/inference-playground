import type { GenerationConfig } from "$lib/components/inference-playground/generation-config-settings.js";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";
import typia from "typia";

export type ConversationMessage = Pick<ChatCompletionInputMessage, "name" | "role" | "tool_calls"> & {
	content?: string;
	images?: string[];
};

export type Conversation = {
	model: Model | CustomModel;
	config: GenerationConfig;
	messages: ConversationMessage[];
	systemMessage: ConversationMessage;
	streaming: boolean;
	provider?: string;
};

export type ConversationWithCustomModel = Conversation & {
	model: CustomModel;
};

export type ConversationWithHFModel = Conversation & {
	model: Model;
};

export const isConversationWithHFModel = typia.createIs<ConversationWithHFModel>();
export const isConversationWithCustomModel = typia.createIs<ConversationWithCustomModel>();

export const isCustomModel = typia.createIs<CustomModel>();

export type Project = {
	conversations: [Conversation] | [Conversation, Conversation];
	id: string;
	name: string;
};

export type DefaultProject = Project & {
	id: "default";
	name: "Default";
};

export type Session = {
	projects: [DefaultProject, ...Project[]];
	activeProjectId: string;
};

interface TokenizerConfig {
	chat_template?: string | Array<{ name: string; template: string }>;
	model_max_length?: number;
}

// export type ModelWithTokenizer = Model & {
// 	tokenizerConfig: TokenizerConfig;
// };

export type Model = {
	_id: string;
	id: string;
	inferenceProviderMapping: InferenceProviderMapping[];
	trendingScore: number;
	config: Config;
	tags: string[];
	pipeline_tag: PipelineTag;
	library_name?: LibraryName;
};

export type CustomModel = {
	id: string;
	/** UUID */
	_id: string;
	endpointUrl: string;
	accessToken?: string;
};

export type Config = {
	architectures: string[];
	model_type: string;
	tokenizer_config: TokenizerConfig;
	auto_map?: AutoMap;
	quantization_config?: QuantizationConfig;
};

export type AutoMap = {
	AutoConfig: string;
	AutoModel?: string;
	AutoModelForCausalLM: string;
	AutoModelForSequenceClassification?: string;
	AutoModelForTokenClassification?: string;
	AutoModelForQuestionAnswering?: string;
};

export type QuantizationConfig = {
	quant_method: string;
	bits?: number;
};

// export type TokenizerConfig = {
// 	bos_token?: Token | BosTokenEnum | null;
// 	chat_template: ChatTemplateElement[] | string;
// 	eos_token: Token | EOSTokenEnum;
// 	pad_token?: Token | null | string;
// 	unk_token?: Token | UnkTokenEnum | null;
// 	use_default_system_prompt?: boolean;
// };

export type Token = {
	__type: Type;
	content: Content;
	lstrip: boolean;
	normalized: boolean;
	rstrip: boolean;
	single_word: boolean;
};

export enum Type {
	AddedToken = "AddedToken",
}

export enum Content {
	BeginOfSentence = "<｜begin▁of▁sentence｜>",
	ContentS = "</s>",
	EndOfSentence = "<｜end▁of▁sentence｜>",
	S = "<s>",
	Unk = "<unk>",
}

export enum BosTokenEnum {
	BeginOfText = "<|begin_of_text|>",
	Bos = "<bos>",
	BosToken = "<BOS_TOKEN>",
	Endoftext = "<|endoftext|>",
	IMStart = "<|im_start|>",
	S = "<s>",
	Startoftext = "<|startoftext|>",
}

export type ChatTemplateElement = {
	name: string;
	template: string;
};

export enum EOSTokenEnum {
	EOS = "<eos>",
	EndOfText = "<|end_of_text|>",
	EndOfTurnToken = "<|END_OF_TURN_TOKEN|>",
	Endoftext = "<|endoftext|>",
	EotID = "<|eot_id|>",
	IMEnd = "<|im_end|>",
	S = "</s>",
}

export enum UnkTokenEnum {
	Endoftext = "<|endoftext|>",
	Unk = "<unk>",
}

export type InferenceProviderMapping = {
	provider: string;
	providerId: string;
	status: Status;
	task: Task;
};

export enum Provider {
	Cerebras = "cerebras",
	FalAI = "fal-ai",
	FireworksAI = "fireworks-ai",
	HFInference = "hf-inference",
	Hyperbolic = "hyperbolic",
	Nebius = "nebius",
	Novita = "novita",
	Replicate = "replicate",
	Sambanova = "sambanova",
	Together = "together",
	Cohere = "cohere",
}

export enum Status {
	Live = "live",
	Staging = "staging",
}

export enum Task {
	Conversational = "conversational",
}

export enum LibraryName {
	Mlx = "mlx",
	Transformers = "transformers",
	Vllm = "vllm",
}

export enum PipelineTag {
	TextGeneration = "text-generation",
	ImageTextToText = "image-text-to-text",
}

export type MaybeGetter<T> = T | (() => T);

export type ValueOf<T> = T[keyof T];

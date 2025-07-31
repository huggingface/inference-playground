import type { GenerationConfig } from "$lib/components/inference-playground/generation-config-settings.js";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";
import typia from "typia";
import type { ConversationEntityMembers } from "./state/conversations.svelte";

export type ConversationMessage = Pick<ChatCompletionInputMessage, "name" | "role"> & {
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
} & Pick<ConversationEntityMembers, "structuredOutput">;

export type ConversationWithCustomModel = Conversation & {
	model: CustomModel;
};

export type ConversationWithHFModel = Conversation & {
	model: Model;
};

export const isHFModel = typia.createIs<Model>();
export const isCustomModel = typia.createIs<CustomModel>();

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
	/** @default "text-generation" */
	pipeline_tag?: PipelineTag;
	supports_response_schema?: boolean;
};

export type Config = {
	architectures: string[];
	model_type: string;
	tokenizer_config?: TokenizerConfig;
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
	Groq = "groq",
	Auto = "auto",
}

export enum Status {
	Live = "live",
	Staging = "staging",
	Error = "error",
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

export const pipelineTagLabel: Record<PipelineTag, string> = {
	[PipelineTag.TextGeneration]: "Text→Text",
	[PipelineTag.ImageTextToText]: "Image+Text→Text",
};

export type MaybeGetter<T> = T | (() => T);

export type ValueOf<T> = T[keyof T];

export interface GenerationStatistics {
	latency: number;
	tokens: number;
	cost?: number;
}

export type ModelsJson = {
	[modelId: string]: ModelJsonSpec;
};

export interface ModelJsonSpec {
	max_tokens?: number;
	max_input_tokens?: number;
	max_output_tokens?: number;
	input_cost_per_token?: number;
	output_cost_per_token?: number;
	output_cost_per_reasoning_token?: number;
	litellm_provider: string;
	mode?: string;
	supports_function_calling?: boolean;
	supports_parallel_function_calling?: boolean;
	supports_vision?: boolean;
	supports_audio_input?: boolean;
	supports_audio_output?: boolean;
	supports_prompt_caching?: boolean;
	supports_response_schema?: boolean;
	supports_system_messages?: boolean;
	supports_reasoning?: boolean;
	supports_web_search?: boolean;
	search_context_cost_per_query?: SearchContextCostPerQuery;
	deprecation_date?: string;
}

export interface SearchContextCostPerQuery {
	search_context_size_low: number;
	search_context_size_medium: number;
	search_context_size_high: number;
}

import type { ModelEntry } from "@huggingface/hub";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";

type Model = string;

type ModelConfig = {
	temperature: number;
	maxTokens: number;
	streaming: boolean;
	jsonMode: boolean;
};

type Conversation = {
	id: string;
	model: ModelEntry;
	config: ModelConfig;
	messages: ChatCompletionInputMessage[];
};

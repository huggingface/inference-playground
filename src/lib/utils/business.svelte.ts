/** BUSINESS
 *
 * All utils that are bound to business logic
 * (and wouldn't be useful in another project)
 * should be here.
 *
 **/

import ctxLengthData from "$lib/data/context_length.json";
import { snippets } from "@huggingface/inference";
import { ConversationClass, type ConversationEntityMembers } from "$lib/state/conversations.svelte";
import { token } from "$lib/state/token.svelte";
import {
	isCustomModel,
	isHFModel,
	Provider,
	type Conversation,
	type ConversationMessage,
	type CustomModel,
	type Model,
} from "$lib/types.js";
import { safeParse } from "$lib/utils/json.js";
import { omit, tryGet } from "$lib/utils/object.svelte.js";
import { type InferenceProvider } from "@huggingface/inference";
import type { ChatCompletionInputMessage, InferenceSnippet } from "@huggingface/tasks";
import { type ChatCompletionOutputMessage } from "@huggingface/tasks";
import { AutoTokenizer, PreTrainedTokenizer } from "@huggingface/transformers";
import { images } from "$lib/state/images.svelte.js";
import { projects } from "$lib/state/projects.svelte.js";
import { structuredForbiddenProviders } from "$lib/state/models.svelte.js";
import { modifySnippet } from "$lib/utils/snippets.js";

type ChatCompletionInputMessageChunk =
	NonNullable<ChatCompletionInputMessage["content"]> extends string | (infer U)[] ? U : never;

async function parseMessage(message: ConversationMessage): Promise<ChatCompletionInputMessage> {
	if (!message.images) return message;

	const urls = await Promise.all(message.images?.map(k => images.get(k)) ?? []);

	return {
		...omit(message, "images"),
		content: [
			{
				type: "text",
				text: message.content ?? "",
			},
			...message.images.map((_imgKey, i) => {
				return {
					type: "image_url",
					image_url: { url: urls[i] as string },
				} satisfies ChatCompletionInputMessageChunk;
			}),
		],
	};
}

export function maxAllowedTokens(conversation: ConversationClass) {
	const ctxLength = (() => {
		const model = conversation.model;
		const { provider } = conversation.data;

		if (!provider || !isHFModel(model)) return;

		const idOnProvider = model.inferenceProviderMapping.find(data => data.provider === provider)?.providerId;
		if (!idOnProvider) return;

		const models = tryGet(ctxLengthData, provider);
		if (!models) return;

		return tryGet(models, idOnProvider) as number | undefined;
	})();

	if (!ctxLength) return customMaxTokens[conversation.model.id] ?? 100000;
	return ctxLength;
}

function getResponseFormatObj(conversation: ConversationClass | Conversation) {
	const data = conversation instanceof ConversationClass ? conversation.data : conversation;
	const json = safeParse(data.structuredOutput?.schema ?? "");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (json && data.structuredOutput?.enabled && !structuredForbiddenProviders.includes(data.provider as any)) {
		switch (data.provider) {
			case "cohere": {
				return {
					type: "json_object",
					...json,
				};
			}
			case Provider.Cerebras: {
				return {
					type: "json_schema",
					json_schema: { ...json, name: "schema" },
				};
			}
			default: {
				return {
					type: "json_schema",
					json_schema: json,
				};
			}
		}
	}
}

export async function handleStreamingResponse(
	conversation: ConversationClass | Conversation,
	onChunk: (content: string) => void,
	abortController: AbortController
): Promise<void> {
	const data = conversation instanceof ConversationClass ? conversation.data : conversation;
	const model = conversation.model;
	const systemMessage = projects.current?.systemMessage;

	const messages: ConversationMessage[] = [
		...(isSystemPromptSupported(model) && systemMessage?.length ? [{ role: "system", content: systemMessage }] : []),
		...(data.messages || []),
	];
	const parsed = await Promise.all(messages.map(parseMessage));

	const requestBody = {
		model: {
			id: model.id,
			isCustom: isCustomModel(model),
			accessToken: isCustomModel(model) ? model.accessToken : undefined,
			endpointUrl: isCustomModel(model) ? model.endpointUrl : undefined,
		},
		messages: parsed,
		config: data.config,
		provider: data.provider,
		streaming: true,
		response_format: getResponseFormatObj(conversation),
		accessToken: token.value,
	};

	const response = await fetch("/api/generate", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestBody),
		signal: abortController.signal,
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate response");
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error("No response body");

	const decoder = new TextDecoder();
	let out = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (line.startsWith("data: ")) {
					const data = line.slice(6);
					if (data === '{"type":"done"}') return;

					try {
						const parsed = JSON.parse(data);
						if (parsed.type === "chunk" && parsed.content) {
							out += parsed.content;
							onChunk(out);
						}
					} catch {
						// Ignore malformed JSON
					}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export async function handleNonStreamingResponse(
	conversation: ConversationClass | Conversation
): Promise<{ message: ChatCompletionOutputMessage; completion_tokens: number }> {
	const data = conversation instanceof ConversationClass ? conversation.data : conversation;
	const model = conversation.model;
	const systemMessage = projects.current?.systemMessage;

	const messages: ConversationMessage[] = [
		...(isSystemPromptSupported(model) && systemMessage?.length ? [{ role: "system", content: systemMessage }] : []),
		...(data.messages || []),
	];
	const parsed = await Promise.all(messages.map(parseMessage));

	const requestBody = {
		model: {
			id: model.id,
			isCustom: isCustomModel(model),
			accessToken: isCustomModel(model) ? model.accessToken : undefined,
			endpointUrl: isCustomModel(model) ? model.endpointUrl : undefined,
		},
		messages: parsed,
		config: data.config,
		provider: data.provider,
		streaming: false,
		response_format: getResponseFormatObj(conversation),
		accessToken: token.value,
	};

	const response = await fetch("/api/generate", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate response");
	}

	return await response.json();
}

export function isSystemPromptSupported(model: Model | CustomModel) {
	if (isCustomModel(model)) return true; // OpenAI-compatible models support system messages
	const template = model?.config.tokenizer_config?.chat_template;
	if (typeof template !== "string") return false;
	return template.includes("system");
}

export const defaultSystemMessage: { [key: string]: string } = {
	"Qwen/QwQ-32B-Preview":
		"You are a helpful and harmless assistant. You are Qwen developed by Alibaba. You should think step-by-step.",
} as const;

export const customMaxTokens: { [key: string]: number } = {
	"01-ai/Yi-1.5-34B-Chat": 2048,
	"HuggingFaceM4/idefics-9b-instruct": 2048,
	"deepseek-ai/DeepSeek-Coder-V2-Instruct": 16384,
	"bigcode/starcoder": 8192,
	"bigcode/starcoderplus": 8192,
	"HuggingFaceH4/starcoderbase-finetuned-oasst1": 8192,
	"google/gemma-7b": 8192,
	"google/gemma-1.1-7b-it": 8192,
	"google/gemma-2b": 8192,
	"google/gemma-1.1-2b-it": 8192,
	"google/gemma-2-27b-it": 8192,
	"google/gemma-2-9b-it": 4096,
	"google/gemma-2-2b-it": 8192,
	"tiiuae/falcon-7b": 8192,
	"tiiuae/falcon-7b-instruct": 8192,
	"timdettmers/guanaco-33b-merged": 2048,
	"mistralai/Mixtral-8x7B-Instruct-v0.1": 32768,
	"Qwen/Qwen2.5-72B-Instruct": 32768,
	"Qwen/Qwen2.5-Coder-32B-Instruct": 32768,
	"meta-llama/Meta-Llama-3-70B-Instruct": 8192,
	"CohereForAI/c4ai-command-r-plus-08-2024": 32768,
	"NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO": 32768,
	"meta-llama/Llama-2-70b-chat-hf": 8192,
	"HuggingFaceH4/zephyr-7b-alpha": 17432,
	"HuggingFaceH4/zephyr-7b-beta": 32768,
	"mistralai/Mistral-7B-Instruct-v0.1": 32768,
	"mistralai/Mistral-7B-Instruct-v0.2": 32768,
	"mistralai/Mistral-7B-Instruct-v0.3": 32768,
	"mistralai/Mistral-Nemo-Instruct-2407": 32768,
	"meta-llama/Meta-Llama-3-8B-Instruct": 8192,
	"mistralai/Mistral-7B-v0.1": 32768,
	"bigcode/starcoder2-3b": 16384,
	"bigcode/starcoder2-15b": 16384,
	"HuggingFaceH4/starchat2-15b-v0.1": 16384,
	"codellama/CodeLlama-7b-hf": 8192,
	"codellama/CodeLlama-13b-hf": 8192,
	"codellama/CodeLlama-34b-Instruct-hf": 8192,
	"meta-llama/Llama-2-7b-chat-hf": 8192,
	"meta-llama/Llama-2-13b-chat-hf": 8192,
	"OpenAssistant/oasst-sft-6-llama-30b": 2048,
	"TheBloke/vicuna-7B-v1.5-GPTQ": 2048,
	"HuggingFaceH4/starchat-beta": 8192,
	"bigcode/octocoder": 8192,
	"vwxyzjn/starcoderbase-triviaqa": 8192,
	"lvwerra/starcoderbase-gsm8k": 8192,
	"NousResearch/Hermes-3-Llama-3.1-8B": 16384,
	"microsoft/Phi-3.5-mini-instruct": 32768,
	"meta-llama/Llama-3.1-70B-Instruct": 32768,
	"meta-llama/Llama-3.1-8B-Instruct": 8192,
} as const;

// Order of the elements in InferenceModal.svelte is determined by this const
export const inferenceSnippetLanguages = ["python", "js", "sh"] as const;

export type InferenceSnippetLanguage = (typeof inferenceSnippetLanguages)[number];

export type GetInferenceSnippetReturn = InferenceSnippet[];

export function getInferenceSnippet(
	conversation: ConversationClass,
	language: InferenceSnippetLanguage,
	accessToken: string,
	opts?: {
		messages?: ConversationEntityMembers["messages"];
		streaming?: ConversationEntityMembers["streaming"];
		max_tokens?: ConversationEntityMembers["config"]["max_tokens"];
		temperature?: ConversationEntityMembers["config"]["temperature"];
		top_p?: ConversationEntityMembers["config"]["top_p"];
		structured_output?: ConversationEntityMembers["structuredOutput"];
	}
): GetInferenceSnippetReturn {
	const model = conversation.model;
	const data = conversation.data;
	const provider = (isCustomModel(model) ? "hf-inference" : data.provider) as InferenceProvider;

	// If it's a custom model, we don't generate inference snippets
	if (isCustomModel(model)) {
		return [];
	}

	const providerMapping = model.inferenceProviderMapping.find(p => p.provider === provider);
	if (!providerMapping) return [];
	const allSnippets = snippets.getInferenceSnippets(
		{ ...model, inference: "" },
		accessToken,
		provider,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		{ ...providerMapping, hfModelId: model.id } as any,
		opts
	);

	return allSnippets
		.filter(s => s.language === language)
		.map(s => {
			if (opts?.structured_output && !structuredForbiddenProviders.includes(provider as Provider)) {
				return {
					...s,
					content: modifySnippet(s.content, {
						response_format: getResponseFormatObj(conversation),
					}),
				};
			}
			return s;
		});
}

const tokenizers = new Map<string, PreTrainedTokenizer | null>();

export async function getTokenizer(model: Model) {
	if (tokenizers.has(model.id)) return tokenizers.get(model.id)!;
	try {
		const tokenizer = await AutoTokenizer.from_pretrained(model.id);
		tokenizers.set(model.id, tokenizer);
		return tokenizer;
	} catch {
		tokenizers.set(model.id, null);
		return null;
	}
}

// When you don't have access to a tokenizer, guesstimate
export function estimateTokens(conversation: Conversation) {
	const content = conversation.messages.reduce((acc, curr) => {
		return acc + (curr?.content ?? "");
	}, "");

	return content.length / 4; // 1 token ~ 4 characters
}

export async function getTokens(conversation: Conversation): Promise<number> {
	const model = conversation.model;
	if (isCustomModel(model)) return estimateTokens(conversation);
	const tokenizer = await getTokenizer(model);
	if (tokenizer === null) return estimateTokens(conversation);

	// This is a simplified version - you might need to adjust based on your exact needs
	let formattedText = "";

	conversation.messages.forEach((message, index) => {
		let content = `<|start_header_id|>${message.role}<|end_header_id|>\n\n${message.content?.trim()}<|eot_id|>`;

		// Add BOS token to the first message
		if (index === 0) {
			content = "<|begin_of_text|>" + content;
		}

		formattedText += content;
	});

	// Encode the text to get tokens
	const encodedInput = tokenizer.encode(formattedText);

	// Return the number of tokens
	return encodedInput.length;
}

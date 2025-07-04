/* eslint-disable @typescript-eslint/no-explicit-any -- Sorry */
import type { ChatCompletionInputMessage, ChatCompletionStreamOutput } from "@huggingface/tasks";
import type { GenerateRequest, OpenAIFunctionSchema } from "./types.js";
import OpenAI from "openai";
import type { Stream } from "openai/streaming.mjs";
import { InferenceClient } from "@huggingface/inference";

type GenerationArgs = {
	model: string;
	messages: ChatCompletionInputMessage[];
	provider?: string;
	config?: Record<string, unknown>;
	tools?: OpenAIFunctionSchema[];
	response_format?: unknown;
};

interface Adapter {
	stream: (args: GenerationArgs) => Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>;
	generate: (args: GenerationArgs) => Promise<ChatCompletionStreamOutput | OpenAI.Chat.Completions.ChatCompletion>;
}

function createCustomAdapter({ model }: GenerateRequest): Adapter {
	// Handle OpenAI-compatible custom models
	const openai = new OpenAI({
		apiKey: model.accessToken,
		baseURL: model.endpointUrl,
	});

	return {
		stream: async (args: GenerationArgs) => {
			return await openai.chat.completions.create({
				...args,
				stream: true,
			} as OpenAI.ChatCompletionCreateParamsStreaming);
		},
		generate: (args: GenerationArgs) => {
			return openai.chat.completions.create({
				...args,
				stream: false,
			} as OpenAI.ChatCompletionCreateParamsNonStreaming);
		},
	};
}

function createHFAdapter({ accessToken }: GenerateRequest): Adapter {
	const client = new InferenceClient(accessToken);
	return {
		stream: (args: GenerationArgs) => {
			return client.chatCompletionStream({
				...args,
				provider: args.provider as any,
				response_format: args.response_format as any,
				tools: args.tools as any,
			}) as any;
		},
		generate: (args: GenerationArgs) => {
			return client.chatCompletion(args as any) as any;
		},
	};
}

export function createAdapter(body: GenerateRequest): Adapter {
	const { model } = body;

	if (model.isCustom) {
		return createCustomAdapter(body);
	}
	return createHFAdapter(body);
}

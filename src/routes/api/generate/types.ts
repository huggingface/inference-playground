import type { ChatCompletionInputMessage } from "@huggingface/tasks";
import type { ChatCompletion, ChatCompletionChunk } from "openai/resources/index.mjs";

export interface MCPServerConfig {
	id: string;
	name: string;
	url: string;
	protocol: "sse" | "http";
	headers?: Record<string, string>;
}

export interface GenerateRequest {
	model: {
		id: string;
		isCustom?: boolean;
		accessToken?: string;
		endpointUrl?: string;
	};
	messages: ChatCompletionInputMessage[];
	config: Record<string, unknown>;
	provider?: string;
	streaming?: boolean;
	response_format?: unknown;
	accessToken: string;
	enabledMCPs?: MCPServerConfig[];
}

export interface OpenAIFunctionSchema {
	type?: string;
	function?: {
		name?: string;
		description?: string;
		parameters?: {
			type?: string;
			required?: string[];
			additionalProperties?: boolean;
			[key: string]: unknown;
		};
		strict?: boolean;
	};
}

export type McpToolSchema = {
	name: string;
	inputSchema: {
		type: string;
		required?: string[];
		additionalProperties?: boolean;
		[key: string]: unknown;
	};
};

export type FinishReason = ChatCompletionChunk.Choice["finish_reason"];

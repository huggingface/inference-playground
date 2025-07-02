import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { InferenceClient } from "@huggingface/inference";
import OpenAI from "openai";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const DEBUG_MCP = false;

const mcpLog = (...args: unknown[]) => {
	if (!DEBUG_MCP) return;
	console.log("[MCP DEBUG]", ...args);
};

const mcpError = (...args: unknown[]) => {
	if (!DEBUG_MCP) return;
	console.error("[MCP DEBUG]", ...args);
};

interface GenerateRequest {
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
}

interface OpenAIFunctionSchema {
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

type McpToolSchema = {
	name: string;
	inputSchema: {
		type: string;
		required?: string[];
		additionalProperties?: boolean;
		[key: string]: unknown;
	};
};

const mcpToolToOpenAIFunction = (tool: McpToolSchema): OpenAIFunctionSchema => {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.name,
			parameters: tool.inputSchema,
			strict: true,
		},
	};
};

const executeMcpTool = async (
	client: Client,
	toolCall: { id: string; function: { name: string; arguments: string } }
) => {
	try {
		mcpLog(`Executing tool: ${toolCall.function.name}`);
		mcpLog(`Tool arguments:`, JSON.parse(toolCall.function.arguments));

		const result = await client.callTool({
			name: toolCall.function.name,
			arguments: JSON.parse(toolCall.function.arguments),
		});

		mcpLog(`Tool result:`, result.content);

		return {
			tool_call_id: toolCall.id,
			role: "tool" as const,
			content: JSON.stringify(result.content),
		};
	} catch (error) {
		mcpError(`Tool execution failed:`, error);

		return {
			tool_call_id: toolCall.id,
			role: "tool" as const,
			content: JSON.stringify({ error: error instanceof Error ? error.message : "Tool execution failed" }),
		};
	}
};

const handleConversationWithTools = async (
	mcpClient: Client,
	inferenceClient: InferenceClient | OpenAI,
	args: Record<string, unknown>,
	isCustomModel: boolean
) => {
	const conversationMessages = [...(args.messages as ChatCompletionInputMessage[])];
	let finalResponse = null;
	let conversationRound = 0;

	mcpLog(`Starting conversation with tools enabled`);
	mcpLog(`Initial message count: ${conversationMessages.length}`);

	while (true) {
		conversationRound++;
		mcpLog(`Conversation round ${conversationRound}`);
		let response;

		if (isCustomModel) {
			response = await (inferenceClient as OpenAI).chat.completions.create({
				...args,
				messages: conversationMessages,
				stream: false,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any);
		} else {
			response = await (inferenceClient as InferenceClient).chatCompletion({
				...args,
				messages: conversationMessages,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any);
		}

		if (!response.choices || response.choices.length === 0) {
			throw new Error("No response from the model");
		}

		const choice = response.choices[0]!;
		const message = choice.message;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		conversationMessages.push(message as any);

		if (!message.tool_calls || message.tool_calls.length === 0) {
			mcpLog(`No tool calls in response, ending conversation`);
			finalResponse = response;
			break;
		}

		mcpLog(`Model requested ${message.tool_calls.length} tool calls`);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		message.tool_calls.forEach((toolCall: any, index: number) => {
			mcpLog(`Tool call ${index + 1}: ${toolCall.function.name}`);
		});

		const toolResults = await Promise.all(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			message.tool_calls.map((toolCall: any) => executeMcpTool(mcpClient, toolCall))
		);

		mcpLog(`All tool calls completed, adding ${toolResults.length} results to conversation`);

		conversationMessages.push(...toolResults);
	}

	mcpLog(`Conversation completed after ${conversationRound} rounds`);
	mcpLog(`Final message count: ${conversationMessages.length}`);

	return finalResponse;
};

export const POST: RequestHandler = async ({ request }) => {
	const firecrawlUrl = new URL("https://mcp.firecrawl.dev/fc-a93ffba8a7b348f99580c278adafcfa9/sse");
	const sseTransport = new SSEClientTransport(firecrawlUrl);

	const mcpClient = new Client({
		name: "playground-client",
		version: "0.0.1",
	});

	await mcpClient.connect(sseTransport);

	const { tools: mcpTools } = await mcpClient.listTools();
	const tools = mcpTools.map(mcpToolToOpenAIFunction);

	mcpLog(`Connected to MCP server`);
	mcpLog(`Available tools: ${mcpTools.length}`);
	mcpTools.forEach((tool, index) => {
		mcpLog(`Tool ${index + 1}: ${tool.name}`);
	});

	if (!DEBUG_MCP) {
		console.log(`MCP: Connected with ${mcpTools.length} tools available`);
	}

	try {
		const body: GenerateRequest = await request.json();
		const { model, messages, config, provider, streaming, response_format, accessToken } = body;

		if (model.isCustom) {
			// Handle OpenAI-compatible custom models
			const openai = new OpenAI({
				apiKey: model.accessToken,
				baseURL: model.endpointUrl,
			});

			const args = {
				model: model.id,
				messages,
				...config,
				tools,
				response_format,
				stream: streaming,
			};

			if (streaming) {
				// For streaming with tools, fall back to non-streaming when tools are involved
				if (tools && tools.length > 0) {
					mcpLog(`Streaming request with tools detected, falling back to non-streaming`);
					const response = await handleConversationWithTools(mcpClient, openai, args, true);
					if (response.choices && response.choices.length > 0 && response.choices[0]?.message) {
						return json({
							message: response.choices[0].message,
							completion_tokens: response.usage?.completion_tokens || 0,
						});
					}
					throw new Error("No response from the model");
				}

				const stream = await openai.chat.completions.create({
					...args,
					stream: true,
				} as OpenAI.ChatCompletionCreateParamsStreaming);

				const encoder = new TextEncoder();
				const readable = new ReadableStream({
					async start(controller) {
						try {
							for await (const chunk of stream) {
								if (chunk.choices[0]?.delta?.content) {
									const data = JSON.stringify({
										type: "chunk",
										content: chunk.choices[0].delta.content,
									});
									controller.enqueue(encoder.encode(`data: ${data}\n\n`));
								}
							}
							controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
							controller.close();
						} catch (error) {
							controller.error(error);
						}
					},
				});

				return new Response(readable, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						"Connection": "keep-alive",
					},
				});
			} else {
				if (tools && tools.length > 0) {
					mcpLog(`Non-streaming request with tools, using conversation handler`);
					const response = await handleConversationWithTools(mcpClient, openai, args, true);
					if (response.choices && response.choices.length > 0 && response.choices[0]?.message) {
						return json({
							message: response.choices[0].message,
							completion_tokens: response.usage?.completion_tokens || 0,
						});
					}
					throw new Error("No response from the model");
				}

				const response = await openai.chat.completions.create({
					...args,
					stream: false,
				} as OpenAI.ChatCompletionCreateParamsNonStreaming);

				if (response.choices && response.choices.length > 0 && response.choices[0]?.message) {
					return json({
						message: {
							role: "assistant",
							content: response.choices[0].message.content || "",
						},
						completion_tokens: response.usage?.completion_tokens || 0,
					});
				}
				throw new Error("No response from the model");
			}
		} else {
			// Handle HuggingFace models
			const client = new InferenceClient(accessToken);
			const args = {
				model: model.id,
				messages,
				provider,
				...config,
				tools,
				response_format,
			};

			if (streaming) {
				// For streaming with tools, fall back to non-streaming when tools are involved
				if (tools && tools.length > 0) {
					mcpLog(`HuggingFace streaming request with tools, falling back to non-streaming`);
					const response = await handleConversationWithTools(mcpClient, client, args, false);
					if (response.choices && response.choices.length > 0) {
						const { message } = response.choices[0]!;
						const completion_tokens = response.usage?.completion_tokens || 0;
						return json({ message, completion_tokens });
					}
					throw new Error("No response from the model");
				}

				const encoder = new TextEncoder();
				const readable = new ReadableStream({
					async start(controller) {
						try {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							for await (const chunk of client.chatCompletionStream(args as any)) {
								if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0]?.delta?.content) {
									const data = JSON.stringify({
										type: "chunk",
										content: chunk.choices[0].delta.content,
									});
									controller.enqueue(encoder.encode(`data: ${data}\n\n`));
								}
							}
							controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
							controller.close();
						} catch (error) {
							controller.error(error);
						}
					},
				});

				return new Response(readable, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						"Connection": "keep-alive",
					},
				});
			} else {
				if (tools && tools.length > 0) {
					mcpLog(`HuggingFace non-streaming request with tools, using conversation handler`);
					const response = await handleConversationWithTools(mcpClient, client, args, false);
					if (response.choices && response.choices.length > 0) {
						const { message } = response.choices[0]!;
						const completion_tokens = response.usage?.completion_tokens || 0;
						return json({ message, completion_tokens });
					}
					throw new Error("No response from the model");
				}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await client.chatCompletion(args as any);
				console.log(JSON.stringify(response, null, 2));
				if (response.choices && response.choices.length > 0) {
					const { message } = response.choices[0]!;
					const { completion_tokens } = response.usage;
					return json({ message, completion_tokens });
				}
				throw new Error("No response from the model");
			}
		}
	} catch (error) {
		console.error("Generation error:", error);
		return json({ error: error instanceof Error ? error.message : "Unknown error occurred" }, { status: 500 });
	}
};

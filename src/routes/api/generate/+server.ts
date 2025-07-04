import { last } from "$lib/utils/array.js";
import { StreamWriter } from "$lib/utils/stream.js";
import { json } from "@sveltejs/kit";
import type { ChatCompletionMessage } from "openai/resources/index.mjs";
import type { RequestHandler } from "./$types.js";
import { createAdapter, type GenerationArgs } from "./adapter.js";
import { connectToMCPServers, executeMcpTool, type MCPServerConnection } from "./mcp.js";
import type { FinishReason, GenerateRequest } from "./types.js";
import { debugLog } from "./utils.js";

type AssistantResponse = { message: ChatCompletionMessage; finish_reason: FinishReason };

type GenerateLoopArgs = {
	args: GenerationArgs;
	getAssistantResponse: (args: GenerationArgs) => Promise<AssistantResponse>;
	connections: MCPServerConnection[];
};

async function generateLoop({ args, getAssistantResponse, connections }: GenerateLoopArgs) {
	let finish_reason: FinishReason | null = null;
	const abortReasons: FinishReason[] = ["stop", "content_filter", "length"];

	while (!abortReasons.includes(finish_reason)) {
		debugLog("finish reason", finish_reason);
		switch (finish_reason) {
			case null: {
				const res = await getAssistantResponse(args);
				args.messages.push(res.message);
				finish_reason = res.finish_reason;
				break;
			}
			case "tool_calls": {
				const toolCalls = last(args.messages)?.tool_calls;
				if (!toolCalls) {
					debugLog("No tool calls found");
					finish_reason = null;
					break;
				}

				debugLog("Executing tool calls");
				debugLog(JSON.stringify(toolCalls, null, 2));

				await Promise.allSettled(
					toolCalls.map(async toolCall => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const response = await executeMcpTool(connections, toolCall as any);
						debugLog("Tool call response", response);
						args.messages.push(response);
					})
				);

				finish_reason = null;

				break;
			}
			default: {
				finish_reason = "stop";
				break;
			}
		}
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: GenerateRequest = await request.json();
		const { model, messages, config, provider, streaming, response_format, enabledMCPs } = body;

		// Connect to enabled MCP servers
		const connections = await connectToMCPServers(enabledMCPs || []);
		const tools = connections.flatMap(conn => conn.tools);

		debugLog(`MCP: Connected to ${connections.length} servers with ${tools.length} tools available`);

		const adapter = createAdapter(body);

		const args = {
			model: model.id,
			messages,
			provider,
			...config,
			tools,
			response_format,
			stream: streaming,
		};

		if (streaming) {
			const writer = new StreamWriter();

			generateLoop({
				args,
				connections,
				getAssistantResponse: async args => {
					debugLog("Generating streaming response");
					const res: AssistantResponse = {
						message: {
							role: "assistant",
							content: "",
							// refusal: null,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
						} as any,
						finish_reason: null,
					};

					try {
						const adapterStream = await adapter.stream(args);
						for await (const chunk of adapterStream) {
							const choice = chunk.choices[0];
							if (!choice) continue;

							if (choice.delta.content) {
								res.message.content += choice.delta.content;
								writer.writeChunk(choice.delta.content || "");
							}
							if (choice.delta.tool_calls) {
								res.message.tool_calls = res.message.tool_calls ?? [];

								for (const toolCall of choice.delta.tool_calls) {
									res.message.tool_calls[toolCall.index] = res.message.tool_calls[toolCall.index] ?? {
										id: toolCall.id ?? "",
										type: "function",
										function: {
											name: "",
											arguments: "",
										},
									};

									if (toolCall.function?.name) {
										res.message.tool_calls[toolCall.index]!.function.name += toolCall.function.name;
									}
									if (toolCall.function?.arguments) {
										res.message.tool_calls[toolCall.index]!.function.arguments += toolCall.function.arguments;
									}
								}
							}
							if (choice.finish_reason) {
								res.finish_reason = choice.finish_reason;
							}
						}
					} catch (error) {
						console.error("stream error", error);
						writer.error(error instanceof Error ? error : new Error(String(error)));
						res.finish_reason = "stop";
						return res;
					}

					debugLog("Generated message");
					debugLog(JSON.stringify(res.message, null, 2));
					return res;
				},
			}).then(() => writer.end());

			debugLog("Creating response...");

			return writer.createResponse();
		}

		const message: ChatCompletionMessage = {
			role: "assistant",
			content: "",
			// refusal: null,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;

		await generateLoop({
			args,
			connections,
			getAssistantResponse: async args => {
				debugLog("Generating non-streaming response");
				const response = await adapter.generate(args);
				debugLog("Generated the response");
				debugLog(JSON.stringify(response, null, 2));

				if (response.choices && response.choices.length > 0) {
					message.content += response.choices[0]!.message.content ?? "";
					// const { completion_tokens } = response.usage || { completion_tokens: 0 };

					return {
						message: response.choices[0]!.message,
						finish_reason: response.choices[0]!.finish_reason,
					};
				}
				throw new Error("No response from the model");
			},
		});

		return json({ message /* ,completion_tokens */ });
	} catch (error) {
		debugLog(JSON.stringify(error, null, 2));
		console.error("Generation error:", error);
		return json({ error: error instanceof Error ? error.message : "Unknown error occurred" }, { status: 500 });
	}
};

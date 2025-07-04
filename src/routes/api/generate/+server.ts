import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import type { FinishReason, GenerateRequest } from "./types.js";
import { connectToMCPServers, executeMcpTool } from "./mcp.js";
import { debugLog } from "./utils.js";
import { createAdapter } from "./adapter.js";
import { StreamWriter } from "$lib/utils/stream.js";
import type { ChatCompletionMessage } from "openai/resources/index.mjs";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";
import { last } from "$lib/utils/array.js";

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

			(async () => {
				let finish_reason: FinishReason | null = null;
				const abortReasons: FinishReason[] = ["stop", "content_filter", "length"];

				while (!abortReasons.includes(finish_reason)) {
					switch (finish_reason) {
						case null: {
							debugLog("Generating response");
							const message = {
								role: "assistant",
								content: "",
								// refusal: null,
							} as ChatCompletionMessage;

							try {
								const adapterStream = await adapter.stream(args);
								for await (const chunk of adapterStream) {
									const choice = chunk.choices[0];
									if (!choice) continue;

									if (choice.delta.content) {
										message.content += choice.delta.content;
										writer.writeChunk(choice.delta.content || "");
									}
									if (choice.delta.tool_calls) {
										message.tool_calls = message.tool_calls ?? [];

										for (const toolCall of choice.delta.tool_calls) {
											message.tool_calls[toolCall.index] = message.tool_calls[toolCall.index] ?? {
												id: toolCall.id ?? "",
												type: "function",
												function: {
													name: "",
													arguments: "",
												},
											};

											if (toolCall.function?.name) {
												message.tool_calls[toolCall.index]!.function.name += toolCall.function.name;
											}
											if (toolCall.function?.arguments) {
												message.tool_calls[toolCall.index]!.function.arguments += toolCall.function.arguments;
											}
										}
									}
									if (choice.finish_reason) {
										finish_reason = choice.finish_reason;
									}
								}
							} catch (error) {
								console.error("stream error", error);
								writer.error(error instanceof Error ? error : new Error(String(error)));
								finish_reason = "stop";
							}

							debugLog("Generated message");
							console.log(JSON.stringify(message, null, 2));
							// Add the message to the args in case we need to continue the conbo
							args.messages.push(message as unknown as ChatCompletionInputMessage);
							break;
						}
						case "tool_calls": {
							const toolCalls = last(args.messages)?.tool_calls;
							if (!toolCalls) break;

							debugLog("Executing tool calls");
							console.log(JSON.stringify(toolCalls, null, 2));

							await Promise.allSettled(
								toolCalls.map(async toolCall => {
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

				writer.end();
			})();

			return writer.createResponse();
		}

		console.log("Generating response");
		const response = await adapter.generate(args);
		console.log(JSON.stringify(response, null, 2));
		if (response.choices && response.choices.length > 0) {
			const { message } = response.choices[0]!;
			const { completion_tokens } = response.usage || { completion_tokens: 0 };
			return json({ message, completion_tokens });
		}
		throw new Error("No response from the model");
	} catch (error) {
		console.log(JSON.stringify(error, null, 2));
		console.error("Generation error:", error);
		return json({ error: error instanceof Error ? error.message : "Unknown error occurred" }, { status: 500 });
	}
};

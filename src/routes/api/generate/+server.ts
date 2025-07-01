import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { InferenceClient } from "@huggingface/inference";
import OpenAI from "openai";
import type { ChatCompletionInputMessage } from "@huggingface/tasks";

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

export const POST: RequestHandler = async ({ request }) => {
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
				response_format,
				stream: streaming,
			};

			if (streaming) {
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
				response_format,
			};

			if (streaming) {
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await client.chatCompletion(args as any);
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

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import type { GenerateRequest } from "./types.js";
import { connectToMCPServers } from "./mcp.js";
import { mcpLog } from "./utils.js";
import { createAdapter } from "./adapter.js";
import { StreamWriter } from "$lib/utils/stream.js";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: GenerateRequest = await request.json();
		const { model, messages, config, provider, streaming, response_format, enabledMCPs } = body;

		// Connect to enabled MCP servers
		const connections = await connectToMCPServers(enabledMCPs || []);
		const tools = connections.flatMap(conn => conn.tools);

		mcpLog(`MCP: Connected to ${connections.length} servers with ${tools.length} tools available`);

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
				try {
					const adapterStream = await adapter.stream(args);
					for await (const chunk of adapterStream) {
						const choice = chunk.choices[0];
						if (!choice) continue;
						writer.writeChunk(choice.delta.content || "");
					}
					writer.end();
				} catch (error) {
					console.error("stream error", error);
					writer.error(error instanceof Error ? error : new Error(String(error)));
				}
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

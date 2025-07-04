import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { MCPServerConfig, McpToolSchema, OpenAIFunctionSchema } from "./types.js";
import { mcpError, mcpLog } from "./utils.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export const mcpToolToOpenAIFunction = (tool: McpToolSchema): OpenAIFunctionSchema => {
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

type MCPServerConnection = { client: Client; tools: OpenAIFunctionSchema[] };

export const connectToMCPServers = async (servers: MCPServerConfig[]): Promise<MCPServerConnection[]> => {
	const connections: MCPServerConnection[] = [];

	await Promise.allSettled(
		servers.map(async server => {
			try {
				const conn: MCPServerConnection = {
					client: new Client({
						name: "playground-client",
						version: "0.0.1",
					}),
					tools: [],
				};

				mcpLog(`Connecting to MCP server: ${server.name} (${server.url})`);

				let transport;
				const url = new URL(server.url);
				if (server.protocol === "sse") {
					transport = new SSEClientTransport(url);
				} else {
					transport = new StreamableHTTPClientTransport(url);
				}

				await conn.client.connect(transport);

				const { tools: mcpTools } = await conn.client.listTools();
				const serverTools = mcpTools.map(mcpToolToOpenAIFunction);
				conn.tools.push(...serverTools);
				mcpLog(`Connected to ${server.name} with ${mcpTools.length} tools`);
				connections.push(conn);
			} catch (error) {
				mcpError(`Failed to connect to MCP server ${server.name}:`, error);
			}
		})
	);

	return connections;
};

export const executeMcpTool = async (
	connections: MCPServerConnection[],
	toolCall: { id: string; function: { name: string; arguments: string } }
) => {
	try {
		mcpLog(`Executing tool: ${toolCall.function.name}`);
		mcpLog(`Tool arguments:`, JSON.parse(toolCall.function.arguments));

		// Try to find the tool in any of the connected clients
		let result = null;
		for (const conn of connections) {
			try {
				const toolExists = conn.tools.some(tool => tool.function?.name === toolCall.function.name);

				if (!toolExists) continue;
				result = await conn.client.callTool({
					name: toolCall.function.name,
					arguments: JSON.parse(toolCall.function.arguments),
				});
			} catch (clientError) {
				mcpError(`Failed to execute tool on client:`, clientError);
				continue;
			}
		}

		if (!result) {
			throw new Error(`Tool ${toolCall.function.name} not found in any connected MCP server`);
		}

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

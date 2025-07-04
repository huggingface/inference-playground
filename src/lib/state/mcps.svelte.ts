import { idb } from "$lib/remult.js";
import { dequal } from "dequal";
import { Entity, Fields, repo, type MembersOnly } from "remult";

export type MCPProtocol = "sse" | "http";

export interface MCPServer {
	id: string;
	name: string;
	url: string;
	protocol: MCPProtocol;
	headers?: Record<string, string>;
}

@Entity("mcp_server")
export class MCPServerEntity {
	@Fields.cuid()
	id!: string;

	@Fields.string()
	name!: string;

	@Fields.string()
	url!: string;

	@Fields.string()
	protocol: MCPProtocol = "sse";

	@Fields.json()
	headers?: Record<string, string>;
}

export type MCPServerEntityMembers = MembersOnly<MCPServerEntity>;

export type MCPFormData = {
	name: string;
	url: string;
	protocol: MCPProtocol;
	headers: Record<string, string>;
};

const mcpServersRepo = repo(MCPServerEntity, idb);

class MCPServers {
	#servers: Record<MCPServerEntity["id"], MCPServerEntity> = $state({});

	constructor() {
		mcpServersRepo.find().then(res => {
			res.forEach(server => {
				if (dequal(this.#servers[server.id], server)) return;
				this.#servers[server.id] = server;
			});
		});
	}

	async create(args: Omit<MCPServerEntity, "id">): Promise<string> {
		const server = await mcpServersRepo.save({ ...args });
		this.#servers[server.id] = server;
		return server.id;
	}

	get all() {
		return Object.values(this.#servers);
	}

	async update(data: MCPServerEntity) {
		if (!data.id) return;
		await mcpServersRepo.upsert({ where: { id: data.id }, set: data });
		this.#servers[data.id] = { ...data };
	}

	async delete(id: string) {
		if (!id) return;
		await mcpServersRepo.delete(id);
		delete this.#servers[id];
	}
}

export const mcpServers = new MCPServers();

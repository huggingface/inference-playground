import type { Project } from "$lib/types.js";
import { dequal } from "dequal";
import { db, type ProjectFromDb } from "./db.svelte";
import { checkpoints } from "./checkpoints.svelte";
import { conversations } from "./conversations.svelte";

const LOCAL_STORAGE_KEY = "hf_inf_pg_active_pid";

class Projects {
	#projects: Record<Project["id"], ProjectFromDb> = $state({});
	activeId = $state("default");

	constructor() {
		const aIdFromStorage = localStorage.getItem(LOCAL_STORAGE_KEY) ?? "default";
		db.projects
			.where("id")
			.equals(aIdFromStorage)
			.first()
			.then(p => {
				if (p) {
					this.activeId = aIdFromStorage;
					return;
				}

				this.activeId = "default";
				this.#projects[this.activeId] = {
					name: "Default",
					id: "default",
				};
			})
			.finally(() => {
				db.projects.toArray().then(res => {
					res.forEach(p => {
						if (dequal(this.#projects[p.id], p)) return;
						this.#projects[p.id] = p;
					});
				});
			});
	}

	async create(name: string): Promise<string> {
		const id = crypto.randomUUID();
		await db.projects.add({ name, id });
		this.#projects[id] = { name, id };
		return id;
	}

	saveProject = async (args: { name: string; moveCheckpoints?: boolean }) => {
		const defaultProject = this.all.find(p => p.id === "default");
		if (!defaultProject) return;

		const id = await this.create(args.name);

		if (args.moveCheckpoints) {
			checkpoints.migrate(defaultProject.id, id);
		}

		conversations.migrate(defaultProject.id, id);
	};

	get current() {
		return this.#projects[this.activeId];
	}

	get all() {
		return Object.values(this.#projects);
	}

	async update(data: ProjectFromDb) {
		if (!data.id) return;
		await db.projects.update(data.id, data);
		this.#projects[data.id] = { ...data };
	}

	async delete(id: string) {
		if (!id) return;

		await db.projects.delete(id);
		delete this.#projects[id];
	}
}

export const projects = new Projects();

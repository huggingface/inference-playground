import { idb } from "$lib/remult.js";
import { dequal } from "dequal";
import { Entity, Fields, repo, type MembersOnly } from "remult";
import { conversations } from "./conversations.svelte";
import { PersistedState } from "runed";
import { checkpoints } from "./checkpoints.svelte";

@Entity("project")
export class ProjectEntity {
	@Fields.cuid()
	id!: string;

	@Fields.string()
	name!: string;
}

export type ProjectEntityMembers = MembersOnly<ProjectEntity>;

const projectsRepo = repo(ProjectEntity, idb);

const LOCAL_STORAGE_KEY = "hf_inf_pg_active_pid";
export const DEFAULT_PROJECT_ID = "default";
const defaultProj = projectsRepo.create({ id: DEFAULT_PROJECT_ID, name: "Default" });

class Projects {
	#projects: Record<ProjectEntity["id"], ProjectEntity> = $state({ default: defaultProj });
	#activeId = new PersistedState(LOCAL_STORAGE_KEY, "default");

	get activeId() {
		return this.#activeId.current;
	}

	set activeId(id: string) {
		this.#activeId.current = id;
	}

	constructor() {
		projectsRepo.find().then(res => {
			if (!res.some(p => p.id === this.activeId)) this.activeId === DEFAULT_PROJECT_ID;

			res.forEach(p => {
				if (dequal(this.#projects[p.id], p)) return;
				this.#projects[p.id] = p;
			});
		});
	}

	async create(name: string): Promise<string> {
		const { id } = await projectsRepo.save({ name });
		this.#projects[id] = { name, id };
		return id;
	}

	saveProject = async (args: { name: string; moveCheckpoints?: boolean }) => {
		const defaultProject = this.all.find(p => p.id === DEFAULT_PROJECT_ID);
		if (!defaultProject) return;

		const id = await this.create(args.name);

		if (args.moveCheckpoints) {
			checkpoints.migrate(defaultProject.id, id);
		}

		// conversations.migrate(defaultProject.id, id).then(_ => (this.#activeId.current = id));
		conversations.migrate(defaultProject.id, id).then(() => {
			this.activeId = id;
		});

		return id;
	};

	setCurrent = async (id: string) => {
		await checkpoints.migrate(id, this.activeId);
		conversations.migrate(this.activeId, id).then(() => {
			this.#activeId.current = id;
		});
		this.activeId = id;
	};

	get current() {
		return this.#projects[this.activeId];
	}

	get all() {
		return Object.values(this.#projects);
	}

	async update(data: ProjectEntity) {
		if (!data.id) return;
		await projectsRepo.update(data.id, data);
		this.#projects[data.id] = { ...data };
	}

	async delete(id: string) {
		if (!id) return;

		await projectsRepo.delete(id);
		await conversations.deleteAllFrom(id);
		delete this.#projects[id];

		if (this.activeId === id) {
			this.activeId = DEFAULT_PROJECT_ID;
		}
	}
}

export const projects = new Projects();

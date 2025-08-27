import { idb } from "$lib/remult.js";
import { dequal } from "dequal";
import { Entity, Fields, repo, type MembersOnly } from "remult";
import { PersistedState } from "runed";
import { checkpoints } from "./checkpoints.svelte";
import { conversations } from "./conversations.svelte";

@Entity("project")
export class ProjectEntity {
	@Fields.cuid()
	id!: string;

	@Fields.string()
	name!: string;

	@Fields.string()
	systemMessage?: string;

	@Fields.string()
	branchedFromId?: string | null;

	@Fields.number()
	branchedFromMessageIndex?: number | null;
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

	async create(args: Omit<ProjectEntity, "id">): Promise<string> {
		const p = await projectsRepo.save({ ...args });
		this.#projects[p.id] = p;
		return p.id;
	}

	saveProject = async (args: { name: string; moveCheckpoints?: boolean }) => {
		const defaultProject = this.all.find(p => p.id === DEFAULT_PROJECT_ID);
		if (!defaultProject) return;

		const id = await this.create({ name: args.name, systemMessage: defaultProject.systemMessage });

		if (args.moveCheckpoints) {
			checkpoints.migrate(defaultProject.id, id);
		}

		// conversations.migrate(defaultProject.id, id).then(_ => (this.#activeId.current = id));
		conversations.migrate(defaultProject.id, id).then(() => {
			this.activeId = id;
		});

		return id;
	};

	get current() {
		return this.#projects[this.activeId];
	}

	get all() {
		return Object.values(this.#projects);
	}

	async update(data: ProjectEntity) {
		if (!data.id) return;
		await projectsRepo.upsert({ where: { id: data.id }, set: data });
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

	branch = async (fromProjectId: string, messageIndex: number): Promise<string> => {
		const fromProject = this.#projects[fromProjectId];
		if (!fromProject) throw new Error("Source project not found");

		// Create new project with branching info
		const newProjectId = await this.create({
			name: `${fromProject.name} (branch)`,
			systemMessage: fromProject.systemMessage,
			branchedFromId: fromProjectId,
			branchedFromMessageIndex: messageIndex,
		});

		// Copy conversations up to the specified message index
		await conversations.duplicateUpToMessage(fromProjectId, newProjectId, messageIndex);

		// Switch to the new project
		this.activeId = newProjectId;

		return newProjectId;
	};

	getBranchedFromProject = (projectId: string) => {
		const project = this.#projects[projectId];
		if (!project?.branchedFromId) return null;

		const originalProject = this.#projects[project.branchedFromId];
		return originalProject;
	};

	clearBranchStatus = async (projectId: string) => {
		const project = this.#projects[projectId];
		if (!project?.branchedFromId) return;

		await this.update({
			...project,
			branchedFromId: null,
			branchedFromMessageIndex: null,
		});
	};
}

export const projects = new Projects();

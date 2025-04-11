import type { Project } from "$lib/types.js";
import { PersistedState } from "runed";
import { session } from "./session.svelte";

const ls_key = "checkpoints";

type Checkpoint = {
	id: string;
	timestamp: string;
	projectState: Project;
	favorite?: boolean;
};

class Checkpoints {
	#checkpoints = new PersistedState<Record<Project["id"], Checkpoint[]>>(
		ls_key,
		{},
		{
			serializer: {
				serialize: JSON.stringify,
				deserialize: v => {
					return JSON.parse(v);
				},
			},
		}
	);

	for(projectId: Project["id"]) {
		return (
			this.#checkpoints.current[projectId]?.toSorted((a, b) => {
				return b.timestamp.localeCompare(a.timestamp);
			}) ?? []
		);
	}

	commit(projectId: Project["id"]) {
		const project = session.$.projects.find(p => p.id == projectId);
		if (!project) return;
		const prev: Checkpoint[] = this.#checkpoints.current[projectId] ?? [];
		this.#checkpoints.current[projectId] = [
			...prev,
			{ projectState: project, timestamp: new Date().toLocaleString(), id: crypto.randomUUID() },
		];
	}

	restore(projectId: Project["id"], checkpoint: Checkpoint) {
		const project = session.$.projects.find(p => p.id == projectId);
		if (!project) return;

		session.$.activeProjectId = projectId;
		session.project = checkpoint.projectState;
	}

	toggleFavorite(projectId: Project["id"], checkpoint: Checkpoint) {
		const prev: Checkpoint[] = this.#checkpoints.current[projectId] ?? [];
		this.#checkpoints.current[projectId] = prev.map(c => {
			if (c.id == checkpoint.id) {
				return { ...c, favorite: !c.favorite };
			}
			return c;
		});
	}

	delete(projectId: Project["id"], checkpoint: Checkpoint) {
		const prev: Checkpoint[] = this.#checkpoints.current[projectId] ?? [];
		this.#checkpoints.current[projectId] = prev.filter(c => c.id != checkpoint.id);
	}

	clear(projectId: Project["id"]) {
		this.#checkpoints.current[projectId] = [];
	}

	migrate(from: Project["id"], to: Project["id"]) {
		const fromArr = this.#checkpoints.current[from] ?? [];
		this.#checkpoints.current[to] = [...fromArr];
		this.#checkpoints.current[from] = [];
	}
}

export const checkpoints = new Checkpoints();

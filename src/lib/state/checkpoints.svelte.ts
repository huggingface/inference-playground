import type { Project } from "$lib/types.js";
import { PersistedState } from "runed";
import { session } from "./session.svelte";

const ls_key = "checkpoints";

type Checkpoint = {
	id: string;
	timestamp: string;
	projectState: Project;
};

class Checkpoints {
	#checkpoints = new PersistedState<Record<Project["id"], Checkpoint[]>>(
		ls_key,
		{},
		{
			serializer: {
				serialize: JSON.stringify,
				deserialize: v => {
					console.log(v);
					return JSON.parse(v);
				},
			},
		}
	);

	for(projectId: Project["id"]) {
		return this.#checkpoints.current[projectId] ?? [];
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

	delete(projectId: Project["id"], checkpoint: Checkpoint) {
		const prev: Checkpoint[] = this.#checkpoints.current[projectId] ?? [];
		this.#checkpoints.current[projectId] = prev.filter(c => c.id != checkpoint.id);
	}
}

export const checkpoints = new Checkpoints();

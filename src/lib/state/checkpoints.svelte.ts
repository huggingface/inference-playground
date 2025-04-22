import type { Project } from "$lib/types.js";
import { session } from "./session.svelte";
import { db, type Checkpoint } from "./db.svelte";

class Checkpoints {
	#checkpoints: Record<Project["id"], Checkpoint[]> = $state({});

	for(projectId: Project["id"]) {
		// Async load from db
		db.checkpoints
			.where("projectId")
			.equals(projectId)
			.toArray()
			.then(c => {
				if (!c) return;
				this.#checkpoints[projectId] = c;
			});

		return (
			this.#checkpoints[projectId]?.toSorted((a, b) => {
				return b.timestamp.localeCompare(a.timestamp);
			}) ?? []
		);
	}

	commit(projectId: Project["id"]) {
		const project = session.$.projects.find(p => p.id == projectId);
		if (!project) return;

		console.log("YOOO");
		const newCheckpoint: Checkpoint = $state.snapshot({
			projectState: { id: project.id, conversations: [], name: project.name },
			timestamp: new Date().toLocaleString(),
			projectId: project.id,
		});
		console.log("let me try fucking adding");
		db.checkpoints
			.add(newCheckpoint)
			.then(id => {
				console.log("added");
				const prev: Checkpoint[] = this.#checkpoints[projectId] ?? [];
				// this.#checkpoints[projectId] = [...prev, { ...newCheckpoint, id }];
			})
			.catch(e => {
				console.log("ohno");
			});
	}

	restore(projectId: Project["id"], checkpoint: Checkpoint) {
		const project = session.$.projects.find(p => p.id == projectId);
		if (!project) return;

		session.$.activeProjectId = projectId;
		session.project = checkpoint.projectState;
	}

	async toggleFavorite({ id, projectId }: Checkpoint) {
		if (!id) return;
		// update local state
		const prev: Checkpoint[] = this.#checkpoints[projectId] ?? [];
		this.#checkpoints[projectId] = prev.map(c => {
			if (c.id == id) {
				return { ...c, favorite: !c.favorite };
			}
			return c;
		});

		const p = await db.checkpoints.where("id").equals(id).first();
		if (!p) return;
		await db.checkpoints.update(id, { favorite: !p.favorite });
	}

	async delete({ id, projectId }: Checkpoint) {
		if (!id) return;

		const prev: Checkpoint[] = this.#checkpoints[projectId] ?? [];
		this.#checkpoints[projectId] = prev.filter(c => c.id != id);

		db.checkpoints.delete(id);
	}

	clear(projectId: Project["id"]) {
		this.#checkpoints[projectId] = [];
		db.checkpoints.where("projectId").equals(projectId).delete();
	}

	migrate(from: Project["id"], to: Project["id"]) {
		const fromArr = this.#checkpoints[from] ?? [];
		this.#checkpoints[to] = [...fromArr];
		this.#checkpoints[from] = [];

		db.checkpoints.where("projectId").equals(from).modify({ projectId: to });
	}
}

export const checkpoints = new Checkpoints();

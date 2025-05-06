import type { Project } from "$lib/types.js";
import { dequal } from "dequal";
import { db, type Checkpoint } from "./db.svelte";
import { snapshot } from "$lib/utils/object.svelte";
import { projects } from "./projects.svelte";
import { conversations } from "./conversations.svelte";

class Checkpoints {
	#checkpoints: Record<Project["id"], Checkpoint[]> = $state({});

	for(projectId: Project["id"]) {
		// Async load from db
		db.checkpoints
			.where("projectId")
			.equals(projectId)
			.toArray()
			.then(c => {
				// Dequal to avoid infinite loops
				if (dequal(c, this.#checkpoints[projectId])) return;
				this.#checkpoints[projectId] = c;
			});

		return (
			this.#checkpoints[projectId]?.toSorted((a, b) => {
				return b.timestamp.localeCompare(a.timestamp);
			}) ?? []
		);
	}

	async commit(projectId: Project["id"]) {
		const project = projects.all.find(p => p.id == projectId);
		if (!project) return;

		const newCheckpoint = snapshot({
			conversations: conversations.for(project.id).map(c => c.data),
			timestamp: new Date().toLocaleString(),
			projectId: project.id,
		} satisfies Checkpoint);

		const id = await db.checkpoints.add(newCheckpoint);
		const prev: Checkpoint[] = this.#checkpoints[projectId] ?? [];
		this.#checkpoints[projectId] = [...prev, { ...newCheckpoint, id }];
	}

	restore(checkpoint: Checkpoint) {
		const cloned = snapshot(checkpoint);
		const project = projects.all.find(p => p.id == cloned.projectId);
		if (!project) return;

		projects.activeId = cloned.projectId;

		// conversations.deleteAllFrom(cloned.projectId);
		const prev = conversations.for(cloned.projectId);
		cloned.conversations.forEach((c, i) => {
			const p = prev[i];
			if (p) return p.update(c);
			conversations.create({
				...c,
				projectId: cloned.projectId,
			});
		});

		if (cloned.conversations.length < prev.length) {
			prev.forEach((p, i) => {
				if (i < cloned.conversations.length) return;
				conversations.delete(p.data);
			});
		}
	}

	async toggleFavorite({ id, projectId }: Checkpoint) {
		if (!id) return;

		const p = await db.checkpoints.where("id").equals(id).first();
		if (!p) return;

		await db.checkpoints.update(id, { favorite: !p.favorite });
		const prev: Checkpoint[] = snapshot(this.#checkpoints[projectId] ?? []);

		this.#checkpoints[projectId] = prev.map(c => {
			if (c.id !== id) return c;
			return { ...c, favorite: !c.favorite };
		});
	}

	async delete({ id, projectId }: Checkpoint) {
		if (!id) return;

		await db.checkpoints.delete(id);

		const prev: Checkpoint[] = this.#checkpoints[projectId] ?? [];
		this.#checkpoints[projectId] = prev.filter(c => c.id != id);
	}

	async clear(projectId: Project["id"]) {
		await db.checkpoints.where("projectId").equals(projectId).delete();
		this.#checkpoints[projectId] = [];
	}

	async migrate(from: Project["id"], to: Project["id"]) {
		await db.checkpoints.where("projectId").equals(from).modify({ projectId: to });

		const fromArr = this.#checkpoints[from] ?? [];
		this.#checkpoints[to] = [...fromArr.map(c => ({ ...c, projectId: to }))];
		this.#checkpoints[from] = [];
	}
}

export const checkpoints = new Checkpoints();

import { idb } from "$lib/remult.js";
import type { Project } from "$lib/types.js";
import { snapshot } from "$lib/utils/object.svelte";
import { dequal } from "dequal";
import { Entity, Fields, repo } from "remult";
import { conversations, type ConversationEntityMembers } from "./conversations.svelte";
import { projects } from "./projects.svelte";

@Entity("checkpoint")
export class Checkpoint {
	@Fields.cuid()
	id!: string;

	@Fields.boolean()
	favorite: boolean = false;

	@Fields.createdAt()
	timestamp!: Date;

	@Fields.json()
	conversations: ConversationEntityMembers[] = [];

	@Fields.string()
	projectId!: string;
}

const checkpointsRepo = repo(Checkpoint, idb);

class Checkpoints {
	#checkpoints: Record<Project["id"], Checkpoint[]> = $state({});

	for(projectId: Project["id"]) {
		// Async load from db
		checkpointsRepo
			.find({
				where: {
					projectId,
				},
			})
			.then(c => {
				// Dequal to avoid infinite loops
				if (dequal(c, this.#checkpoints[projectId])) return;
				this.#checkpoints[projectId] = c;
			});

		return (
			this.#checkpoints[projectId]?.toSorted((a, b) => {
				const aTime = a.timestamp?.getTime() ?? new Date().getTime();
				const bTime = b.timestamp?.getTime() ?? new Date().getTime();
				return bTime - aTime;
			}) ?? []
		);
	}

	async commit(projectId: Project["id"]) {
		const project = projects.all.find(p => p.id == projectId);
		if (!project) return;

		const newCheckpoint = await checkpointsRepo.save(
			snapshot({
				conversations: conversations.for(project.id).map(c => c.data),
				timestamp: new Date(),
				projectId: project.id,
			})
		);

		const prev: Checkpoint[] = this.#checkpoints[projectId] ?? [];
		this.#checkpoints[projectId] = [...prev, newCheckpoint];
	}

	restore(checkpoint: Checkpoint) {
		const cloned = snapshot(checkpoint);
		const modified = {
			...cloned,
			conversations: cloned.conversations.map(c => ({
				...c,
				projectId: cloned.projectId,
			})),
		};

		const project = projects.all.find(p => p.id == modified.projectId);
		if (!project) return;

		projects.activeId = modified.projectId;

		// conversations.deleteAllFrom(cloned.projectId);
		const prev = conversations.for(modified.projectId);
		modified.conversations.forEach((c, i) => {
			const p = prev[i];
			if (p) return p.update(c);
			conversations.create({
				...c,
				projectId: modified.projectId,
			});
		});

		if (modified.conversations.length < prev.length) {
			prev.forEach((p, i) => {
				if (i < modified.conversations.length) return;
				conversations.delete(p.data);
			});
		}
	}

	async toggleFavorite({ id, projectId }: Checkpoint) {
		if (!id) return;

		const p = await checkpointsRepo.findFirst({ id });
		if (!p) return;

		await checkpointsRepo.update(id, { favorite: !p.favorite });
		const prev: Checkpoint[] = snapshot(this.#checkpoints[projectId] ?? []);

		this.#checkpoints[projectId] = prev.map(c => {
			if (c.id !== id) return c;
			return { ...c, favorite: !c.favorite };
		});
	}

	async delete({ id, projectId }: Checkpoint) {
		if (!id) return;

		await checkpointsRepo.delete(id);

		const prev: Checkpoint[] = this.#checkpoints[projectId] ?? [];
		this.#checkpoints[projectId] = prev.filter(c => c.id != id);
	}

	async clear(projectId: Project["id"]) {
		await checkpointsRepo.deleteMany({ where: { projectId } });
		this.#checkpoints[projectId] = [];
	}

	async migrate(from: Project["id"], to: Project["id"]) {
		await checkpointsRepo.updateMany({ where: { projectId: from }, set: { projectId: to } });

		const fromArr = snapshot(this.#checkpoints[from] ?? []);
		this.#checkpoints[to] = [
			...fromArr.map(c => ({
				...c,
				projectId: to,
				conversations: c.conversations.map(cn => ({ ...cn, projectId: to })),
			})),
		];
		this.#checkpoints[from] = [];
	}
}

export const checkpoints = new Checkpoints();

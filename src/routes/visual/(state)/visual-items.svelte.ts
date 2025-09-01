import { idb, JsonEntityIndexedDbStorage } from "$lib/remult.js";
import { dataURLtoBlob, fileToDataURL } from "$lib/utils/file.js";
import { omit } from "$lib/utils/object.svelte";
import { Entity, Fields, repo, type MembersOnly } from "remult";
import { createSubscriber } from "svelte/reactivity";
import typia from "typia";

export enum VisualEntityType {
	Video = "video",
	Image = "image",
}

@Entity("visual-item")
export class VisualItemEntity {
	@Fields.cuid()
	id!: string;

	@Fields.enum(() => VisualEntityType)
	type!: VisualEntityType;

	@Fields.createdAt()
	createdAt!: Date;

	/**
	 * The key for the blob in storage
	 */
	@Fields.string()
	storageKey?: string;

	@Fields.json()
	config?: {
		prompt: string;
		model?: string;
		provider?: string;
		guidance_scale?: number;
		negative_prompt?: string;
		num_inference_steps?: number;
		width?: number;
		height?: number;
		scheduler?: string;
		seed?: number;
	};

	@Fields.number()
	generationTimeMs?: number;
}

const visualItemRepo = repo(VisualItemEntity, idb);

export type VisualItemEntityMembers = MembersOnly<VisualItemEntity>;

export type VisualItemArgs = VisualItemEntityMembers & {};

export class VisualItem {
	#src = $state<string>();
	data = $state.raw() as VisualItemEntityMembers;
	config = $derived(this.data.config);
	type = $derived(this.data.type);
	id = $derived(this.data.id);

	constructor(args: VisualItemArgs) {
		this.data = args;
	}

	get blob() {
		if (!this.src) return;
		return dataURLtoBlob(this.src);
	}

	get src() {
		if (!this.#src && this.data.storageKey) {
			blobs.get(this.data.storageKey).then(b => (this.#src = b));
		}

		return this.#src;
	}

	delete() {
		if (this.data.storageKey) blobs.delete(this.data.storageKey);
		return visualItemRepo.delete(this.data.id);
	}
}

export type GeneratingItem = Pick<VisualItemEntityMembers, "type" | "config" | "id"> & {
	abortController?: AbortController;
};

class VisualItems {
	#items = $state<VisualItem[]>([]);
	generating = $state.raw<GeneratingItem[]>([]);

	#sub = createSubscriber(() => {
		visualItemRepo.find().then(res => {
			res.forEach(item => this.#items.push(new VisualItem(item)));
		});
		return visualItemRepo.addEventListener({
			saved: item => {
				this.#items.push(new VisualItem(item));
			},
			deleted: item => {
				this.#items = this.#items.filter(_item => _item.id !== item.id);
			},
		});
		// return visualItemRepo.liveQuery().subscribe(info => {
		// 	this.#items = info.items.map(item => new VisualItem(item));
		// });
	});

	get all() {
		this.#sub();
		return [
			...this.generating,
			...this.#items.toSorted((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime()),
		];
	}

	create(args: Partial<VisualItemEntityMembers>) {
		return visualItemRepo.save(omit(args, "id"));
	}

	delete(item: VisualItem | GeneratingItem) {
		if (item instanceof VisualItem) {
			return visualItemRepo.delete(item.data.id);
		} else {
			// Cancel generation if it's still running
			if (item.abortController && !item.abortController.signal.aborted) {
				item.abortController.abort();
			}
			this.generating = this.generating.filter(_item => _item !== item);
		}
	}

	cancelGeneration(item: GeneratingItem) {
		if (item.abortController && !item.abortController.signal.aborted) {
			item.abortController.abort();
		}
	}

	cancelAllGenerations() {
		this.generating.forEach(item => {
			if (item.abortController && !item.abortController.signal.aborted) {
				item.abortController.abort();
			}
		});
		this.generating = [];
	}
}

export const visualItems = new VisualItems();

export const isVisualItem = typia.createIs<VisualItem>();

const store = new JsonEntityIndexedDbStorage();

class Blobs {
	async upload(blob: Blob) {
		const dataUrl = await fileToDataURL(blob);

		const key = `blob-${crypto.randomUUID()}`;
		store.setItem(key, dataUrl);

		return key;
	}

	async get(key: string): Promise<string> {
		return await store.getItem(key);
	}

	async delete(key: string) {
		return await store.deleteItem(key);
	}
}

export const blobs = new Blobs();

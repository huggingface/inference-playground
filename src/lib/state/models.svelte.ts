import { page } from "$app/state";
import type { CustomModel, Model } from "$lib/types.js";
import { edit, randomPick } from "$lib/utils/array.js";
import { safeParse } from "$lib/utils/json.js";
import typia from "typia";
import { session } from "./session.svelte";

const LOCAL_STORAGE_KEY = "hf_inference_playground_custom_models";

class Models {
	remote = $derived(page.data.models as Model[]);
	trending = $derived(this.remote.toSorted((a, b) => b.trendingScore - a.trendingScore).slice(0, 5));
	nonTrending = $derived(this.remote.filter(m => !this.trending.includes(m)));
	all = $derived([...this.remote, ...this.custom]);

	constructor() {
		const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (!savedData) return;

		const parsed = safeParse(savedData);
		const res = typia.validate<CustomModel[]>(parsed);
		if (res.success) {
			this.#custom = parsed;
		} else {
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
		}
	}

	#custom = $state.raw<CustomModel[]>([]);

	get custom() {
		return this.#custom;
	}

	set custom(models: CustomModel[]) {
		this.#custom = models;

		try {
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(models));
		} catch (e) {
			console.error("Failed to save session to localStorage:", e);
		}
	}

	addCustom(model: CustomModel) {
		if (this.#custom.find(m => m.id === model.id)) return null;
		this.custom = [...this.custom, model];
		return model;
	}

	upsertCustom(model: CustomModel) {
		const index = this.#custom.findIndex(m => m._id === model._id);
		if (index === -1) {
			this.addCustom(model);
		} else {
			this.custom = edit(this.custom, index, model);
		}
	}

	removeCustom(uuid: CustomModel["_id"]) {
		this.custom = this.custom.filter(m => m._id !== uuid);
		session.project.conversations.forEach((c, i) => {
			if (c.model._id !== uuid) return;
			session.project.conversations[i]!.model = randomPick(models.trending)!;
		});
	}
}

export const models = new Models();

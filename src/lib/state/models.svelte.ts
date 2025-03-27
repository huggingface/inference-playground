import { page } from "$app/state";
import { createInit } from "$lib/spells/create-init.svelte";
import type { CustomModel, ModelWithTokenizer } from "$lib/types.js";
import { safeParse } from "$lib/utils/json.js";
import typia from "typia";

const LOCAL_STORAGE_KEY = "hf_inference_playground_custom_models";

class Models {
	all = $derived(page.data.models as ModelWithTokenizer[]);
	trending = $derived(this.all.toSorted((a, b) => b.trendingScore - a.trendingScore).slice(0, 5));
	nonTrending = $derived(this.all.filter(m => !this.trending.includes(m)));

	#custom = $state<CustomModel[]>([]);
	#initCustom = createInit(() => {
		const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (!savedData) return;
		const parsed = safeParse(savedData);
		const res = typia.validate<CustomModel[]>(parsed);
		if (res.success) {
			this.#custom = parsed;
		} else {
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
		}
	});

	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (!this.#initCustom.called) return;
				const v = $state.snapshot(this.#custom);
				try {
					localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(v));
				} catch (e) {
					console.error("Failed to save session to localStorage:", e);
				}
			});
		});
	}

	get custom() {
		this.#initCustom.fn();
		return this.#custom;
	}

	// set local(v: CustomModel[]) {
	// 	this.local = v;
	// }

	addCustom(model: CustomModel) {
		if (this.#custom.find(m => m.id === model.id)) return null;
		this.#custom = [...this.#custom, model];
		return model;
	}

	upsertCustom(model: CustomModel) {
		const index = this.#custom.findIndex(m => m.id === model.id);
		if (index === -1) {
			this.addCustom(model);
		} else {
			this.#custom[index] = model;
		}
	}

	removeCustom(model: CustomModel) {
		this.#custom = this.#custom.filter(m => m !== model);
	}
}

export const models = new Models();

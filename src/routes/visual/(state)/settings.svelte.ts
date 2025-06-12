import { createPersistedObj } from "$lib/spells/persisted-obj.svelte";
import { PipelineTag, type InferenceProviderMapping, type Model } from "$lib/types.js";

export const settings = createPersistedObj("inf-pg-vis-settings", {
	columns: 2,
	model: undefined as Model | undefined,
	provider: undefined as InferenceProviderMapping["provider"] | undefined,
	filterTag: PipelineTag.TextToImage,
	prompt: "",
});

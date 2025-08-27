import { createPersistedObj } from "$lib/spells/persisted-obj.svelte";
import { PipelineTag, type InferenceProviderMapping, type Model } from "$lib/types.js";

export const settings = createPersistedObj("inf-pg-vis-settings", {
	columns: 2,
	filterTag: PipelineTag.TextToImage,
	prompt: "",
	model: undefined as Model | undefined,
	provider: undefined as InferenceProviderMapping["provider"] | undefined,
	// Text-to-image parameters
	guidance_scale: 7.5,
	negative_prompt: "",
	num_inference_steps: 4,
	width: 512,
	height: 512,
	scheduler: undefined as string | undefined,
	seed: undefined as number | undefined,
});

import type { ChatCompletionInput } from "@huggingface/tasks";

export const GENERATION_CONFIG_KEYS = ["temperature", "max_tokens", "top_p"] as const;

export type GenerationConfigKey = (typeof GENERATION_CONFIG_KEYS)[number];

export type GenerationConfig = Pick<ChatCompletionInput, GenerationConfigKey>;

interface GenerationKeySettings {
	default?: number;
	step: number;
	min: number;
	max: number;
	label: string;
}

export const GENERATION_CONFIG_SETTINGS: Record<GenerationConfigKey, GenerationKeySettings> = {
	temperature: {
		default: 0.5,
		step: 0.1,
		min: 0,
		max: 2,
		label: "Temperature",
	},
	max_tokens: {
		step: 256,
		min: 0,
		max: 8192, // changed dynamically based on model
		label: "Max Tokens",
	},
	top_p: {
		default: 0.7,
		step: 0.1,
		min: 0,
		max: 1,
		label: "Top-P",
	},
};

export const defaultGenerationConfig = GENERATION_CONFIG_KEYS.reduce((acc, key) => {
	acc[key] = GENERATION_CONFIG_SETTINGS[key].default;
	return acc;
}, {} as GenerationConfig);

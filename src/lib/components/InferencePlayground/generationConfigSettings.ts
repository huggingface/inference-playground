interface GenerationKeySettings {
	default: number;
	step: number;
	min: number;
	max: number;
	label: string;
}

export const GENERATION_CONFIG_SETTINGS: Record<string, GenerationKeySettings> = {
	temperature: {
		default: 0.7,
		step: 0.01,
		min: 0,
		max: 2,
		label: 'Temperature'
	},
	max_tokens: {
		default: 0.7,
		step: 512,
		min: 1,
		max: 8192, // changed dynamically based on model
		label: 'Output Length'
	},
	top_p: {
		default: 0.7,
		step: 0.01,
		min: 0,
		max: 1,
		label: 'Top-P'
	},
	top_k: {
		default: 50,
		step: 1,
		min: 1,
		max: 100,
		label: 'Top-K'
	},
	repetition_penalty: {
		default: 1,
		step: 0.01,
		min: 1,
		max: 2,
		label: 'Repetition Penalty'
	}
};

export type GenerationConfigKey = keyof typeof GENERATION_CONFIG_SETTINGS;

export const GENERATION_CONFIG_KEYS: GenerationConfigKey[] = Object.keys(
	GENERATION_CONFIG_SETTINGS
);

export type GenerationConfig = Record<GenerationConfigKey, number>;

export const defaultGenerationConfig = Object.keys(GENERATION_CONFIG_SETTINGS).reduce(
	(acc, key) => {
		acc[key] = GENERATION_CONFIG_SETTINGS[key].default;
		return acc;
	},
	{} as GenerationConfig
);

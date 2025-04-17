import { getTokens } from "$lib/components/inference-playground/utils.js";
import { watch } from "runed";
import { session } from "./session.svelte";

export interface GenerationStats {
	latency: number;
	generatedTokensCount: number;
}

function createGenerationStats() {
	let stats = $state([] as Array<GenerationStats>);

	const init = () => {
		watch(
			() => $state.snapshot(session.project),
			() => {
				session.project.conversations.forEach(async (c, i) => {
					generationStats[i] = { latency: 0, ...generationStats[i], generatedTokensCount: await getTokens(c) };
				});
			}
		);
	};

	const set = (s: Array<GenerationStats>) => {
		stats = s;
	};

	return Object.assign(stats, { set, init });
}

export const generationStats = createGenerationStats();

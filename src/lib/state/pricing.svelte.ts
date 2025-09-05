import { page } from "$app/state";
import { atLeastNDecimals } from "$lib/utils/number.js";
import type { PageData } from "../../routes/$types.js";

interface RouterProvider {
	provider: string;
	status: string;
	context_length?: number;
	pricing?: {
		input: number;
		output: number;
	};
	supports_tools?: boolean;
	supports_structured_output?: boolean;
}

interface RouterModel {
	id: string;
	providers: RouterProvider[];
}

interface RouterData {
	data: RouterModel[];
}

const pageData = $derived(page.data as PageData & { routerData: RouterData });

class Pricing {
	routerData = $derived(pageData.routerData as RouterData);

	getPricing(modelId: string, provider: string) {
		const model = this.routerData?.data?.find((m: RouterModel) => m.id === modelId);
		if (!model) return null;

		const providerData = model.providers.find((p: RouterProvider) => p.provider === provider);
		return providerData?.pricing || null;
	}

	getContextLength(modelId: string, provider: string) {
		const model = this.routerData?.data?.find((m: RouterModel) => m.id === modelId);
		if (!model) return null;

		const providerData = model.providers.find((p: RouterProvider) => p.provider === provider);
		return providerData?.context_length || null;
	}

	formatPricing(pricing: { input: number; output: number } | null) {
		if (!pricing) return null;

		const inputCost = atLeastNDecimals(pricing.input, 2);
		const outputCost = atLeastNDecimals(pricing.output, 2);

		return {
			input: `$${inputCost}/1M`,
			output: `$${outputCost}/1M`,
			inputRaw: pricing.input,
			outputRaw: pricing.output,
		};
	}

	estimateCost(modelId: string, provider: string, inputTokens: number, outputTokens: number = 0) {
		const pricing = this.getPricing(modelId, provider);
		if (!pricing) return null;

		const inputCost = (inputTokens / 1000000) * pricing.input;
		const outputCost = (outputTokens / 1000000) * pricing.output;
		const totalCost = inputCost + outputCost;

		return {
			input: inputCost,
			output: outputCost,
			total: totalCost,
			formatted: `$${totalCost.toFixed(6)}`,
		};
	}
}

export const pricing = new Pricing();

<script lang="ts">
	import type { ConversationClass } from "$lib/state/conversations.svelte";
	import { pricing } from "$lib/state/pricing.svelte";
	import { isHFModel } from "$lib/types.js";
	import { estimateTokens } from "$lib/utils/business.svelte.js";

	interface Props {
		conversation: ConversationClass;
		class?: string;
	}

	const { conversation, class: classes = "" }: Props = $props();

	const estimate = $derived.by(() => {
		const model = conversation.model;
		const { provider } = conversation.data;

		if (!provider || !isHFModel(model) || provider === "auto") return null;

		// Estimate input tokens from current messages
		const inputTokens = estimateTokens(conversation);

		// Estimate output tokens (assume average response length)
		const outputTokens = 100; // Conservative estimate

		return pricing.estimateCost(model.id, provider, inputTokens, outputTokens);
	});
	$inspect(estimate);
</script>

{#if estimate}
	<div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 {classes}">
		<span>Est. cost: {estimate.formatted}</span>
		<span class="text-gray-400">•</span>
		<span>Input: ${estimate.input.toFixed(6)}</span>
		<span class="text-gray-400">•</span>
		<span>Output: ${estimate.output.toFixed(6)}</span>
	</div>
{/if}

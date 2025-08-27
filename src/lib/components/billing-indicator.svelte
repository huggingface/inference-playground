<script lang="ts">
	import { billing } from "$lib/state/billing.svelte";
	import IconUser from "~icons/carbon/user";
	import IconGroup from "~icons/carbon/group";
	import IconWarning from "~icons/carbon/warning";
	import IconCheckmark from "~icons/carbon/checkmark";

	interface Props {
		showModal?: () => void;
	}

	const { showModal }: Props = $props();
</script>

<button
	onclick={showModal}
	class={[
		"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
		"bg-gray-100/50 hover:bg-gray-100 active:bg-gray-200",
		"dark:bg-gray-800/70 dark:hover:bg-gray-700 dark:active:bg-gray-700/50",
	]}
>
	<!-- Avatar or Icon -->
	{#if billing.organization && billing.organizationInfo?.avatar && billing.isValid}
		<img src={billing.organizationInfo.avatar} alt={billing.displayName} class="h-5 w-5 rounded-full" />
	{:else if billing.organization}
		<IconGroup class="h-4 w-4" />
	{:else}
		<IconUser class="h-4 w-4" />
	{/if}

	<!-- Billing info -->
	<div class="flex flex-col items-start">
		<div class="flex items-center gap-1.5">
			<span class="font-medium">
				{billing.displayName}
			</span>

			<!-- Status indicator -->
			{#if billing.organization}
				{#if billing.validating}
					<div class="h-3 w-3 animate-spin rounded-full border border-yellow-600 border-t-transparent"></div>
				{:else if billing.isValid}
					<IconCheckmark class="h-3 w-3 text-green-600 dark:text-green-400" />
				{:else}
					<IconWarning class="h-3 w-3 text-red-600 dark:text-red-400" />
				{/if}
			{/if}
		</div>

		<span class="text-xs text-gray-500 dark:text-gray-400">
			{#if billing.organization}
				{#if billing.validating}
					Validating organization...
				{:else if billing.isValid}
					Organization billing
				{:else}
					Organization not found
				{/if}
			{:else}
				Personal billing
			{/if}
		</span>
	</div>
</button>

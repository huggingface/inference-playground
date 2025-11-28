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

<button onclick={showModal} class="btn-sm">
	<!-- Avatar or Icon -->
	{#if billing.organization && billing.organizationInfo?.avatar && billing.isValid}
		<img src={billing.organizationInfo.avatar} alt={billing.displayName} class="size-4 rounded-full" />
	{:else if billing.organization}
		<IconGroup class="size-4" />
	{:else}
		<IconUser class="size-4" />
	{/if}

	<span class="max-w-32 truncate">{billing.displayName}</span>

	<!-- Status indicator for organization -->
	{#if billing.organization}
		{#if billing.validating}
			<div class="size-3 animate-spin rounded-full border border-yellow-600 border-t-transparent"></div>
		{:else if billing.isValid}
			<IconCheckmark class="size-3 text-green-600 dark:text-green-400" />
		{:else}
			<IconWarning class="size-3 text-red-600 dark:text-red-400" />
		{/if}
	{/if}
</button>

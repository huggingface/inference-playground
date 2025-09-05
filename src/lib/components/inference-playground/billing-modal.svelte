<script lang="ts">
	import { billing } from "$lib/state/billing.svelte";
	import Dialog from "../dialog.svelte";

	interface Props {
		onClose: () => void;
	}

	const { onClose }: Props = $props();

	let inputValue = $state(billing.organization);

	function handleSubmit(e: Event) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const org = (formData.get("billing-org") as string).trim() ?? "";
		billing.organization = org;
		inputValue = org;
		onClose();
	}

	function handleReset() {
		billing.reset();
		inputValue = "";
	}
</script>

<Dialog title="Billing Settings" open={true} {onClose}>
	<div class="space-y-4">
		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<div class="mb-2 flex items-center gap-2">
					<label for="billing-org" class="text-sm font-medium text-gray-900 dark:text-white"> Organization Name </label>
				</div>
				<input
					type="text"
					id="billing-org"
					name="billing-org"
					bind:value={inputValue}
					placeholder="my-org-name"
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
				/>
			</div>

			<!-- Current Status -->
			{#if billing.organization}
				{#if billing.validating}
					<div class="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
						<div class="flex items-center gap-2">
							<div class="h-3 w-3 animate-spin rounded-full border border-yellow-600 border-t-transparent"></div>
							<span class="text-sm font-medium text-yellow-800 dark:text-yellow-400">
								Validating organization: <strong>{billing.organization}</strong>
							</span>
						</div>
					</div>
				{:else if billing.isValid && billing.organizationInfo}
					<div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
						<div class="flex items-center gap-3">
							{#if billing.organizationInfo.avatar}
								<img
									src={billing.organizationInfo.avatar}
									alt={billing.organizationInfo.displayName}
									class="h-8 w-8 rounded-full"
								/>
							{/if}
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-green-800 dark:text-green-400">
										Currently billing to: <strong>{billing.organizationInfo.displayName}</strong>
									</span>
								</div>
								{#if billing.organizationInfo.displayName !== billing.organization}
									<span class="text-xs text-green-700 dark:text-green-300">
										({billing.organization})
									</span>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full bg-red-500"></div>
							<span class="text-sm font-medium text-red-800 dark:text-red-400">
								Organization not found: <strong>{billing.organization}</strong>
							</span>
						</div>
						<p class="mt-1 text-xs text-red-700 dark:text-red-300">
							Please check the organization name or use personal billing.
						</p>
					</div>
				{/if}
			{:else}
				<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
					<div class="flex items-center gap-2">
						<span class="text-sm text-gray-600 dark:text-gray-400"> Currently using personal billing </span>
					</div>
				</div>
			{/if}
			<!-- Actions -->
			<div class="flex gap-3 pt-2">
				{#if billing.organization}
					<button
						type="button"
						onclick={handleReset}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700"
					>
						Reset
					</button>
				{/if}

				<button
					type="submit"
					class="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
				>
					Save Settings
				</button>
			</div>
		</form>

		<!-- Help Link -->
		<div class="border-t border-gray-200 pt-4 dark:border-gray-700">
			<a
				href="https://huggingface.co/docs/inference-providers/pricing#billing-for-team-and-enterprise-organizations"
				target="_blank"
				class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
			>
				Learn more about organization billing →
			</a>
		</div>
	</div>
</Dialog>

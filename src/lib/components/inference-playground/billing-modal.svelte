<script lang="ts">
	import { billing } from "$lib/state/billing.svelte";
	import { user } from "$lib/state/user.svelte";
	import { cn } from "$lib/utils/cn.js";
	import { Select } from "melt/builders";
	import IconCaret from "~icons/carbon/chevron-down";
	import Dialog from "../dialog.svelte";
	import { Avatar } from "melt/components";
	import { omit } from "$lib/utils/object.svelte";
	import IconLoading from "~icons/line-md/loading-loop";

	interface Props {
		onClose: () => void;
	}

	const { onClose }: Props = $props();

	const options = $derived([
		{ value: "", label: "Personal Account", avatarUrl: user.avatarUrl, isEnterprise: false },
		...user.orgs.map(org => ({
			value: org.name,
			label: org.fullname,
			avatarUrl: org.avatarUrl,
			isEnterprise: org.isEnterprise,
		})),
	]);

	const select = new Select({
		value: () => billing.organization,
		onValueChange(v) {
			if (v !== undefined) {
				billing.organization = v;
			}
		},
		sameWidth: true,
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		onClose();
	}

	const getInitials = (username: string): string => {
		// Handle empty strings
		if (!username) return "";

		// Split by common separators and handle camelCase/PascalCase
		const parts = username
			// Insert space before capitals in camelCase/PascalCase
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			// Split by common separators
			.split(/[\s\-_/.]+/)
			// Remove empty parts
			.filter(part => part.length > 0);

		// Get first letter of first part
		const firstInitial = parts[0]?.[0]?.toUpperCase() || "";

		// Get first letter of last part if different from first part
		const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0]?.toUpperCase() : "";

		return firstInitial + (lastInitial === firstInitial ? "" : lastInitial);
	};
</script>

<Dialog title="Billing Settings" open={true} {onClose}>
	<div class="space-y-4">
		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<div class="mb-2 flex items-center gap-2">
					<label for="billing-org" class="text-sm font-medium text-gray-900 dark:text-white">
						Billing Organization
					</label>
				</div>

				{#if user.loading}
					<div
						class="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"
					>
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white"
						></div>
						<span class="text-sm text-gray-600 dark:text-gray-400">Loading organizations...</span>
					</div>
				{:else}
					<button
						{...select.trigger}
						type="button"
						class={cn(
							"relative flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-gray-50 p-3 text-left text-sm",
							"hover:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500",
							"dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:border-blue-500 dark:focus:ring-blue-500",
						)}
					>
						{#each options as option}
							{#if option.value === billing.organization}
								<div class="flex items-center gap-3">
									{#if option.avatarUrl}
										<img src={option.avatarUrl} alt="" class="h-6 w-6 rounded-full" />
									{/if}
									<span class="text-gray-900 dark:text-white">
										{option.label}
									</span>
									{#if option.isEnterprise}
										<span
											class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
										>
											Enterprise
										</span>
									{/if}
								</div>
							{/if}
						{/each}
						<div class="flex-none text-gray-500 dark:text-gray-400">
							<IconCaret />
						</div>
					</button>

					<div
						{...select.content}
						class="z-50 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
					>
						{#each options as option (option.value)}
							{@const optionProps = select.getOption(option.value)}
							<div {...optionProps} class="group cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
								<div class="flex items-center gap-3">
									{#if option.avatarUrl}
										<Avatar src={option.avatarUrl}>
											{#snippet children(avatar)}
												<div
													class="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-100"
												>
													<img
														{...avatar.image}
														alt="{option.label}'s avatar"
														class={[
															"absolute inset-0 !block h-full w-full rounded-[inherit] ",
															avatar.loadingStatus === "loaded" ? "" : "invisible",
														]}
													/>
													<span {...avatar.fallback} class="!block text-4xl font-medium text-neutral-700">
														{getInitials(option.label)}
													</span>
												</div>
											{/snippet}
										</Avatar>
									{/if}

									<span class="text-sm text-gray-900 dark:text-white">{option.label}</span>
									{#if option.isEnterprise}
										<span
											class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
										>
											Enterprise
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
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
								<Avatar src={billing.organizationInfo.avatar}>
									{#snippet children(avatar)}
										<div
											class="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-800"
										>
											<img
												{...avatar.image}
												alt="{billing.organizationInfo?.displayName}'s avatar"
												class={[
													"absolute inset-0 !block h-full w-full rounded-[inherit] ",
													avatar.loadingStatus === "loaded" ? "fade-in" : "invisible",
												]}
											/>
											<span
												{...omit(avatar.fallback, "style", "hidden")}
												class="!block text-sm font-medium text-neutral-200"
											>
												<IconLoading />
											</span>
										</div>
									{/snippet}
								</Avatar>
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
						onclick={() => billing.reset()}
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

<style>
	.fade-in {
		animation: fade-in 0.25s ease-in-out;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			filter: blur(10px);
			scale: 1.2;
		}
		to {
			opacity: 1;
			filter: blur(0);
			scale: 1;
		}
	}
</style>

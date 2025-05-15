<script lang="ts" module>
	let open = $state(false);

	export function showQuotaModal() {
		open = true;
	}
</script>

<script lang="ts">
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import IconCross from "~icons/carbon/close";
	import IconCheck from "~icons/carbon/checkmark";
	import IconExternal from "~icons/carbon/arrow-up-right";
	import { fade, scale } from "svelte/transition";
	import LabelPro from "./label-pro.svelte";
	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (open) {
			dialog?.showModal();
		} else {
			setTimeout(() => dialog?.close(), 250);
		}
	});

	const actions: string[] = [
		"Exchange a million words with leading models",
		"Use the fastest inference providers",
		"Compare 80+ conversational models",
		"Process hundreds of images",
	];
</script>

<dialog class="backdrop:bg-transparent" bind:this={dialog} onclose={() => (open = false)}>
	{#if open}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<!-- Content -->
			<div
				class="relative w-lg rounded-xl bg-white shadow-sm dark:bg-gray-900"
				{@attach clickOutside(() => (open = false))}
				transition:scale={{ start: 0.975, duration: 250 }}
			>
				<h2 class="mt-8 text-center text-2xl font-semibold text-balance sm:text-3xl dark:text-white">
					Upgrade Your AI Experience with a <LabelPro
						class="mx-0.5 -translate-y-px align-middle leading-6 max-sm:py-0! sm:text-xl"
					/> Account
				</h2>
				<button
					type="button"
					class="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
					onclick={() => (open = false)}
					aria-label="Close modal"
				>
					<div class="text-xl">
						<IconCross />
					</div>
				</button>

				<!-- Modal body -->
				<div class="p-4 md:p-5 dark:text-white">
					<p
						class="rounded-xl border border-amber-900 bg-amber-700/25 p-4 font-medium text-amber-800 dark:bg-amber-800/25 dark:text-amber-200"
					>
						You have reached your usage limits. To continue using the playground, please consider creating a PRO
						account!
					</p>
					<p class="mt-4 text-gray-600 dark:text-gray-400">
						By subscribing to PRO, you get <span class="text-black dark:text-white"
							>$2 worth of Inference credits every month.</span
						> Meaning you could:
					</p>
					<ul class="mt-4 flex flex-col gap-2">
						{#each actions as action}
							<li class="flex items-center justify-start gap-2.5">
								<div
									class="flex size-5 items-center justify-center rounded-full border border-green-500/15 bg-green-500/10 dark:bg-green-500/20"
								>
									<IconCheck class="text-xs text-green-600 dark:text-green-300" />
								</div>
								{action}
							</li>
						{/each}
					</ul>
				</div>

				<!-- Modal footer -->
				<div class="flex rounded-b p-4 !pb-8 md:p-5 dark:border-gray-800">
					<a
						href="https://huggingface.co/settings/billing/subscription#subscribe"
						class="mx-auto mt-1 flex w-fit items-center justify-between gap-6 rounded-full bg-black py-2.5 pr-4 pl-5 text-white hover:bg-gray-900 dark:bg-white/85 dark:text-black dark:hover:bg-white"
					>
						<p>
							Subscribe to PRO
							<span class="text-gray-400 dark:text-gray-500">($9/month)</span>
						</p>
						<IconExternal />
					</a>
				</div>
			</div>
		</div>
	{/if}
</dialog>

<script lang="ts" module>
	let project = $state<ProjectEntity>();

	export function showShareModal(p: ProjectEntity) {
		project = p;
	}

	function close() {
		project = undefined;
	}
</script>

<script lang="ts">
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import { ProjectEntity, projects, type ProjectEntityMembers } from "$lib/state/projects.svelte";
	import { copyToClipboard } from "$lib/utils/copy.js";
	import { decodeString, encodeObject } from "$lib/utils/encode.js";
	import { fade, scale } from "svelte/transition";
	import typia from "typia";
	import IconCross from "~icons/carbon/close";
	import IconCopy from "~icons/carbon/copy";
	import IconSave from "~icons/carbon/save";
	import LocalToasts from "./local-toasts.svelte";
	import { addToast as addToastGlobally } from "./toaster.svelte.js";
	import { conversations, type ConversationEntityMembers } from "$lib/state/conversations.svelte";
	import { omit } from "$lib/utils/object.svelte";
	import { watch } from "runed";
	import { sleep } from "$lib/utils/sleep.js";

	let dialog: HTMLDialogElement | undefined = $state();

	const open = $derived(!!project);

	type ParsedConversation = Omit<ConversationEntityMembers, "createdAt"> & {
		createdAt: string;
	};

	type ParsedProject = Omit<FullProject, "conversations"> & {
		conversations: ParsedConversation[];
	};

	type FullProject = ProjectEntityMembers & {
		conversations: ConversationEntityMembers[];
	};

	const fullProject: FullProject | undefined = $derived.by(() => {
		if (!project) return;
		return {
			...project,
			conversations: conversations.for(project.id).map(c => c.data),
		};
	});
	let encoded = $state("");
	watch(
		() => fullProject,
		() => {
			(async function () {
				await sleep(100);
				encoded = encodeObject(fullProject);
			})();
		},
	);
	let pasted = $state("");

	$effect(() => {
		if (open) {
			dialog?.showModal();
		} else {
			setTimeout(() => {
				dialog?.close();
				pasted = "";
			}, 250);
		}
	});

	const isProject = typia.createIs<ParsedProject>();
	let saving = $state(false);
</script>

<dialog class="backdrop:bg-transparent" bind:this={dialog} onclose={() => close()}>
	{#if open}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<!-- Content -->
			<div
				class="relative w-xl max-w-[calc(100dvw-2rem)] rounded-xl bg-white shadow-sm dark:bg-gray-900"
				{@attach clickOutside(() => close())}
				transition:scale={{ start: 0.975, duration: 250 }}
			>
				<div class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-800">
					<h2 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">Sharing</h2>
					<button
						type="button"
						class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
						onclick={close}
					>
						<div class="text-xl">
							<IconCross />
						</div>
						<span class="sr-only">Close modal</span>
					</button>
				</div>
				<!-- Modal body -->
				<div class="p-4 md:p-5">
					<h3 class="text-lg font-semibold">Share your project</h3>
					<p>Copy an unique string that shares your entire project until this point.</p>
					<div class="mt-4 flex gap-2">
						<input
							class="grow cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							type="text"
							value={encoded}
							disabled
						/>
						<LocalToasts>
							{#snippet children({ addToast, trigger })}
								<button
									{...trigger}
									class="btn flex items-center gap-2"
									onclick={() => {
										copyToClipboard(encoded);
										addToast({ data: { content: "Copied to clipboard", variant: "info" } });
									}}
								>
									<IconCopy />
									Copy
								</button>
							{/snippet}
						</LocalToasts>
					</div>

					<div class="my-4 flex items-center gap-2">
						<div class="h-px grow bg-gray-500" aria-hidden="true"></div>
						<span class="text-xs text-gray-400">or</span>
						<div class="h-px grow bg-gray-500" aria-hidden="true"></div>
					</div>

					<h3 class="text-lg font-semibold">Save a copied project</h3>
					<p>Paste a copied project string, and save it for your local usage.</p>
					<LocalToasts>
						{#snippet children({ addToast, trigger })}
							<form
								class="mt-4 flex gap-2"
								onsubmit={async e => {
									e.preventDefault();
									saving = true;

									const decoded = decodeString(pasted);
									if (!isProject(decoded)) {
										addToast({ data: { content: "String isn't valid", variant: "danger" } });
										saving = false;
										return;
									}
									const projectId = await projects.create({ name: `Saved - ${decoded.name}` });
									await Promise.allSettled(
										decoded.conversations.map(c => {
											conversations.create({
												...omit(c, "id", "createdAt"),
												projectId,
											});
										}),
									);
									projects.activeId = projectId;
									saving = false;

									addToastGlobally({
										variant: "success",
										title: "Saved project",
										description: "The project you pasted in was successfully saved.",
									});
									close();
								}}
							>
								<input
									class="grow rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
									type="text"
									bind:value={pasted}
								/>
								<button {...trigger} class="btn flex items-center gap-2" type="submit">
									{#if saving}
										<svg
											class="mr-2 h-4 w-4 animate-spin text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Saving...
									{:else}
										<IconSave />
										Save
									{/if}
								</button>
							</form>
						{/snippet}
					</LocalToasts>
				</div>

				<!-- Modal footer -->
				<!--
				<div class="flex rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
					<button
						type="submit"
						class="ml-auto rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
						>Submit</button
					>
				</div>
				-->
			</div>
		</div>
	{/if}
</dialog>

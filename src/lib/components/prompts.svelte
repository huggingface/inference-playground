<script lang="ts" module>
	import { autofocus } from "$lib/attachments/autofocus.js";
	import { clickOutside } from "$lib/attachments/click-outside.js";
	import IconCross from "~icons/carbon/close";

	type Prompt = {
		label: string;
		value?: string;
		placeholder?: string;
		callback: (value: string) => void;
	};

	let prompts = $state<Prompt[]>([]);
	const current = $derived(prompts[0]);

	export function resolvePrompt() {
		if (!current) return;
		current.callback(current.value ?? "");
		prompts.splice(0, 1);
	}

	export async function prompt(label: string, defaultValue?: string): Promise<string> {
		return new Promise(res => {
			prompts.push({ label, value: defaultValue, callback: res });
		});
	}
</script>

<script lang="ts">
	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (current) {
			dialog?.showModal();
		} else {
			dialog?.close();
		}
	});

	function onSubmit(e: Event) {
		e.preventDefault();
		resolvePrompt();
	}
</script>

<dialog bind:this={dialog} onclose={resolvePrompt}>
	{#if current}
		<div class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85">
			<form
				onsubmit={onSubmit}
				class="relative w-xl rounded-lg bg-white shadow-sm dark:bg-gray-900"
				{@attach clickOutside(resolvePrompt)}
			>
				<div class="flex items-center justify-between rounded-t border-b p-4 md:px-5 md:py-4 dark:border-gray-800">
					<h3 class="flex items-center gap-2.5 text-lg font-semibold text-gray-900 dark:text-white">
						{current.label ?? "Prompt"}
					</h3>
					<button
						type="button"
						class="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
						onclick={resolvePrompt}
					>
						<div class="text-xl">
							<IconCross />
						</div>
						<span class="sr-only">Close modal</span>
					</button>
				</div>
				<!-- Modal body -->
				<div class="p-4 md:p-5">
					<label class="flex flex-col gap-2 font-medium text-gray-900 dark:text-white">
						<input
							bind:value={current.value}
							placeholder={current.placeholder}
							required
							type="text"
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							{@attach autofocus()}
						/>
					</label>
				</div>

				<!-- Modal footer -->
				<div class="flex rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-800">
					<button
						type="submit"
						class="ml-auto rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:ring-4 focus:ring-gray-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
						>Submit</button
					>
				</div>
			</form>
		</div>
	{/if}
</dialog>

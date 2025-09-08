<script lang="ts">
	import { getAvatarUrl } from "$lib/remote/avatar.remote";
	import { isCustomModel, type CustomModel, type Model } from "$lib/types.js";
	import IconCube from "~icons/carbon/cube";

	interface Props {
		model: Model | CustomModel;
		orgName?: string | undefined;
		size?: "sm" | "md";
	}

	let { model, orgName: _orgName = undefined, size = "md" }: Props = $props();

	let sizeClass = $derived(size === "sm" ? "size-3" : "size-4");
	let isCustom = $derived(isCustomModel(model));
	let orgName = $derived(_orgName ?? (!isCustom ? model.id.split("/")[0] : undefined));
	let avatarUrl = $state<string>();

	$effect(() => {
		avatarUrl = undefined;
		getAvatarUrl(orgName).then(url => (avatarUrl = url));
	});
</script>

{#if isCustom}
	<div
		class="{sizeClass} grid place-items-center rounded-sm bg-gray-500/10 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300"
	>
		<IconCube class="size-full p-0.5" />
	</div>
{:else if avatarUrl}
	<img class="{sizeClass} flex-none rounded-sm bg-gray-200 object-cover" src={avatarUrl} alt="{orgName} avatar" />
{:else}
	<div class="{sizeClass} flex-none rounded-sm bg-gray-200"></div>
{/if}

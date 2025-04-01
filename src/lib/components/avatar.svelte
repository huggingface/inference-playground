<script lang="ts">
	import { isCustomModel, type CustomModel, type Model } from "$lib/types.js";
	import IconCube from "~icons/carbon/cube";

	interface Props {
		model: Model | CustomModel;
		orgName?: string | undefined;
		size?: "sm" | "md";
	}

	let { model, orgName = undefined, size = "md" }: Props = $props();

	let sizeClass = $derived(size === "sm" ? "size-3" : "size-4");
	let isCustom = $derived(isCustomModel(model));
	let _orgName = $derived(orgName ?? (!isCustom ? model.id.split("/")[0] : undefined));

	async function getAvatarUrl(orgName?: string) {
		if (!orgName) return;
		const url = `https://huggingface.co/api/organizations/${orgName}/avatar`;
		const res = await fetch(url);
		if (!res.ok) {
			console.error(`Error getting avatar url for org: ${orgName}`, res.status, res.statusText);
			return;
		}
		const json = await res.json();
		const { avatarUrl } = json;
		return avatarUrl;
	}
</script>

{#if isCustom}
	<div
		class="{sizeClass} grid place-items-center rounded-sm bg-gray-500/10 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300"
	>
		<IconCube class="size-full p-0.5" />
	</div>
{:else}
	{#await getAvatarUrl(_orgName)}
		<div class="{sizeClass} flex-none rounded-sm bg-gray-200"></div>
	{:then avatarUrl}
		{#if avatarUrl}
			<img class="{sizeClass} flex-none rounded-sm bg-gray-200 object-cover" src={avatarUrl} alt="{_orgName} avatar" />
		{:else}
			<div class="{sizeClass} flex-none rounded-sm bg-gray-200"></div>
		{/if}
	{:catch}
		<div class="{sizeClass} flex-none rounded-sm bg-gray-200"></div>
	{/await}
{/if}

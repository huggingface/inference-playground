<script lang="ts">
	export let orgName: string | undefined;
	export let size: "sm" | "md" = "md";

	$: sizeClass = size === "sm" ? "size-3" : "size-4";

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

{#await getAvatarUrl(orgName)}
	<div class="{sizeClass} flex-none rounded-sm bg-gray-200"></div>
{:then avatarUrl}
	{#if avatarUrl}
		<img class="{sizeClass} flex-none rounded-sm bg-gray-200 object-cover" src={avatarUrl} alt="{orgName} avatar" />
	{:else}
		<div class="{sizeClass} flex-none rounded-sm bg-gray-200"></div>
	{/if}
{:catch}
	<div class="{sizeClass} flex-none rounded-sm bg-gray-200"></div>
{/await}

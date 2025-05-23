<script lang="ts">
	let { data } = $props();
</script>

<div class="dark:text-white">
	{JSON.stringify(data, null, 2)}
</div>

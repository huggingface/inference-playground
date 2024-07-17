<script lang="ts">
	export let data;
	import InferencePlayground from '$lib/components/InferencePlayground/InferencePlayground.svelte';
</script>

<InferencePlayground models={data.models} />

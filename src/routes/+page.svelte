<script lang="ts">
	import Playground from "$lib/components/inference-playground/playground.svelte";
	import { conversations } from "$lib/state/conversations.svelte";
	import { models } from "$lib/state/models.svelte";
	import { projects } from "$lib/state/projects.svelte";

	await models.load();
	await projects.init();
	await conversations.init();
</script>

<Playground />

<script lang="ts">
	import Playground from "$lib/components/inference-playground/playground.svelte";
	import { conversations } from "$lib/state/conversations.svelte";

	conversations.init();
</script>

<Playground />

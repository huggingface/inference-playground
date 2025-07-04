<script>
	function throwTestError() {
		throw new Error("Sentry Example Frontend Error");
	}
</script>

<button type="button" onclick={throwTestError}>Throw error</button>

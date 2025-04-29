export function createInit(cb: () => void) {
	let called = $state(false);

	function init() {
		if (called) return;
		called = true;
		cb();
	}

	return Object.assign(init, {
		get called() {
			return called;
		},
	});
}

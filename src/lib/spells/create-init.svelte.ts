export function createInit(cb: () => void | Promise<void>) {
	let called = $state(false);

	async function init() {
		if (called) return;
		called = true;
		await cb();
	}

	return Object.defineProperties(init, {
		called: {
			get() {
				return called;
			},
			enumerable: true,
		},
	}) as typeof init & { readonly called: boolean };
}

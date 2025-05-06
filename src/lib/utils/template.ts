export function onchange(cb: (value: string, e: Event) => void): { onchange: (e: Event) => void } {
	return {
		onchange: (e: Event) => {
			const el = e.target as HTMLInputElement;
			if (!el) return;
			cb(el.value, e);
		},
	};
}

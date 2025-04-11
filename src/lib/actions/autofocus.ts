import { tick } from "svelte";

export function autofocus(node: HTMLElement, enabled = true) {
	function update(enabled = true) {
		if (enabled) {
			tick().then(() => {
				node.focus();
			});
		}
	}
	update(enabled);

	return { update };
}

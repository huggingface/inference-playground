import type { Action } from "svelte/action";

export const clickOutside: Action<HTMLElement, () => void> = (node, callback) => {
	let _callback = callback;

	function update(callback: () => void) {
		_callback = callback;
	}

	function handleClick(event: MouseEvent) {
		if (window.getSelection()?.toString()) {
			// Don't close if text is selected
			return;
		}
		if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
			_callback();
		}
	}

	document.addEventListener("click", handleClick, true);

	return {
		update,
		destroy() {
			document.removeEventListener("click", handleClick, true);
		},
	};
};

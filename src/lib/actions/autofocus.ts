import { tick } from "svelte";
import type { Attachment } from "svelte/attachments";

export function autofocus(enabled = true): Attachment<HTMLElement> {
	return node => {
		if (!enabled) return;

		tick().then(() => {
			node.focus();
		});
	};
}

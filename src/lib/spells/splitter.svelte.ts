import { Synced } from "$lib/spells/synced.svelte.js";
import type { MaybeGetter } from "$lib/types.js";
import { clamp } from "$lib/utils/number.js";
import { untrack } from "svelte";
import { type Attachment } from "svelte/attachments";
import type { HTMLAttributes } from "svelte/elements";
import { on } from "svelte/events";

type SplitterProps = {
	min?: number;
	max?: number;
	value?: MaybeGetter<number>;
	onValueChange?: (v: number) => void;
};
export class Splitter {
	isResizing = $state(false);
	min: number;
	max: number;
	#value: Synced<number>;

	// prettier-ignore
	get value() { return this.#value.current }
	// prettier-ignore
	set value(v) { this.#value.current = v }

	constructor(props?: SplitterProps) {
		this.min = props?.min ?? 0;
		this.max = props?.max ?? Infinity;
		this.#value = new Synced({
			value: props?.value,
			onChange: props?.onValueChange,
			defaultValue: 0,
		});
	}

	#createOverlay = () => {
		const overlay = document.createElement("div");

		// Apply styles to make it cover the document, be invisible, and have a resize cursor
		overlay.style.position = "fixed";
		overlay.style.top = "0";
		overlay.style.left = "0";
		overlay.style.width = "100%";
		overlay.style.height = "100%";
		overlay.style.backgroundColor = "transparent"; // Invisible
		overlay.style.zIndex = "9999"; // On top of most things
		overlay.style.cursor = "col-resize"; // Your desired resize cursor
		overlay.style.pointerEvents = "auto"; // Ensure it receives pointer events
		overlay.style.userSelect = "none";

		// Append the overlay to the document body
		document.body.appendChild(overlay);

		this.#removeOverlay = () => {
			overlay.remove();
			this.#removeOverlay = undefined;
		};
	};

	#removeOverlay: (() => void) | undefined = undefined;

	get separator() {
		const obj = {
			role: "separator",
			tabindex: 0,
			onkeydown: e => {
				const step = 20;
				if (e.key === "ArrowLeft") {
					e.preventDefault();
					this.value = clamp(this.min, this.value - step, this.max);
				} else if (e.key === "ArrowRight") {
					e.preventDefault();
					this.value = clamp(this.min, this.value + step, this.max);
				}
			},
			onmousedown: () => {
				this.isResizing = true;
				this.#createOverlay();
			},
		} satisfies HTMLAttributes<HTMLDivElement>;

		Object.defineProperty(obj, "attach", {
			enumerable: false,
			get: () => {
				return () => {
					const callbacks: Array<() => void> = untrack(() => [
						on(document, "mousemove", e => {
							if (!this.isResizing) return;
							this.value = clamp(this.min, e.clientX, this.max);
						}),
						on(document, "mouseup", _ => {
							this.isResizing = false;
							this.#removeOverlay?.();
						}),
					]);

					return () => {
						callbacks.forEach(c => c());
						this.#removeOverlay?.();
					};
				};
			},
		});
		return obj as typeof obj & { attach: Attachment };
	}
}

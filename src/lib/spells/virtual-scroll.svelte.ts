import type { MaybeGetter } from "$lib/types.js";
import { ElementSize } from "runed";
import { createAttachmentKey } from "svelte/attachments";
import type { HTMLAttributes } from "svelte/elements";
import { extract } from "./extract.svelte";

interface VirtualScrollOptions {
	totalItems?: MaybeGetter<number>;
	itemHeight: MaybeGetter<number>;
	overscan?: MaybeGetter<number | undefined>;
}

export class VirtualScroll {
	#options: VirtualScrollOptions;
	itemHeight = $derived.by(() => extract(this.#options.itemHeight));
	overscan = $derived.by(() => extract(this.#options.overscan, 10));
	totalItems = $derived.by(() => extract(this.#options.totalItems, 0));

	#scrollTop = $state(0);

	#containerEl = $state<HTMLElement>();
	#containerSize = new ElementSize(() => this.#containerEl);

	constructor(options: VirtualScrollOptions) {
		this.#options = options;
	}

	get scrollTop() {
		return this.#scrollTop;
	}

	set scrollTop(value: number) {
		this.#scrollTop = value;
	}

	get visibleRange() {
		const startIndex = Math.floor(this.#scrollTop / this.itemHeight);
		const endIndex = Math.min(
			startIndex + Math.ceil(this.#containerSize.height / this.itemHeight),
			this.totalItems - 1,
		);

		return {
			start: Math.max(0, startIndex - this.overscan),
			end: Math.min(this.totalItems - 1, endIndex + this.overscan),
		};
	}

	get totalHeight() {
		return this.totalItems * this.itemHeight;
	}

	get offsetY() {
		return this.visibleRange.start * this.itemHeight;
	}

	getVisibleItems<T>(items: T[]): Array<{ item: T; index: number }> {
		const { start, end } = this.visibleRange;
		return items.slice(start, end + 1).map((item, i) => ({
			item,
			index: start + i,
		}));
	}

	scrollToIndex(index: number) {
		const { start, end } = this.visibleRange;

		// Only scroll if the index is not currently visible
		if (index >= start && index <= end) {
			return; // Already visible, no need to scroll
		}

		let targetScrollTop: number;

		if (index < start) {
			// Scrolling up - position item at top with some buffer
			targetScrollTop = (index - this.overscan) * this.itemHeight;
		} else {
			// Scrolling down - position item at bottom with some buffer
			const visibleItems = Math.floor(this.#containerSize.height / this.itemHeight);
			targetScrollTop = (index - visibleItems + 1 + this.overscan) * this.itemHeight;
		}

		const maxScrollTop = this.totalHeight - this.#containerSize.height;
		this.#scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

		// Update the actual scroll container
		if (this.#containerEl) {
			this.#containerEl.scrollTop = this.#scrollTop;
		}
	}

	#attachmentKey = createAttachmentKey();
	get container() {
		return {
			onscroll: e => {
				this.scrollTop = e.currentTarget.scrollTop;
			},
			[this.#attachmentKey]: node => {
				this.#containerEl = node;
				return () => {
					this.#containerEl = undefined;
				};
			},
		} as const satisfies HTMLAttributes<HTMLElement>;
	}
}

import { AnimationFrames } from "runed";
import type { Attachment } from "svelte/attachments";

export enum ObservedElements {
	BottomActions = "bottom-actions",
	TokenCountEnd = "token-count-end",
	TokenCountStart = "token-count-start",
	// Add other elements here as needed
}

type ObservedData = {
	rect: {
		width: number;
		height: number;
		top: number;
		left: number;
		right: number;
		bottom: number;
	};
	offset: {
		width: number;
		height: number;
		top: number;
		left: number;
		right: number;
		bottom: number;
	};
};

export const observed: Record<ObservedElements, ObservedData> = $state(
	Object.values(ObservedElements).reduce(
		(acc, key) => {
			acc[key] = {
				rect: {
					width: 0,
					height: 0,
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
				},
				offset: {
					width: 0,
					height: 0,
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
				},
			};
			return acc;
		},
		{} as Record<ObservedElements, ObservedData>
	)
);

type ObserveArgs = {
	name: ObservedElements;
	useRaf?: boolean;
};

function getOffsetPosition(el: HTMLElement) {
	let top = 0;
	let left = 0;
	const width = el.offsetWidth;
	const height = el.offsetHeight;

	while (el) {
		top += el.offsetTop;
		left += el.offsetLeft;
		el = el.offsetParent as HTMLElement;
	}

	return { top, left, width, height, right: left + width, bottom: top + height };
}

export function observe(args: ObserveArgs): Attachment<HTMLElement> {
	return node => {
		function setVars(name: ObservedElements) {
			// 1. Standard rect (includes transforms)
			const rect = node.getBoundingClientRect();
			document.documentElement.style.setProperty(`--${name}-width`, `${rect.width}px`);
			document.documentElement.style.setProperty(`--${name}-height`, `${rect.height}px`);
			document.documentElement.style.setProperty(`--${name}-top`, `${rect.top}px`);
			document.documentElement.style.setProperty(`--${name}-left`, `${rect.left}px`);
			document.documentElement.style.setProperty(`--${name}-right`, `${rect.right}px`);
			document.documentElement.style.setProperty(`--${name}-bottom`, `${rect.bottom}px`);

			// 2. Offset position (ignores transforms)
			const offset = getOffsetPosition(node);
			document.documentElement.style.setProperty(`--${name}-width-offset`, `${offset.width}px`);
			document.documentElement.style.setProperty(`--${name}-height-offset`, `${offset.height}px`);
			document.documentElement.style.setProperty(`--${name}-top-offset`, `${offset.top}px`);
			document.documentElement.style.setProperty(`--${name}-left-offset`, `${offset.left}px`);
			document.documentElement.style.setProperty(`--${name}-right-offset`, `${offset.right}px`);
			document.documentElement.style.setProperty(`--${name}-bottom-offset`, `${offset.bottom}px`);

			observed[name] = {
				rect,
				offset,
			};
		}

		function onWindowChange() {
			setVars(args.name);
		}

		/** Initialize */
		const resizeObserver = new ResizeObserver(() => {
			setVars(args.name);
		});

		resizeObserver.observe(node);

		// Listen for scroll and resize events
		window.addEventListener("scroll", onWindowChange, true);
		window.addEventListener("resize", onWindowChange, true);

		setVars(args.name); // Initial set after observing
		if (args.useRaf) {
			new AnimationFrames(() => {
				setVars(args.name);
			});
		}

		return function destroy() {
			resizeObserver.disconnect();
			window.removeEventListener("scroll", onWindowChange, true);
			window.removeEventListener("resize", onWindowChange, true);
		};
	};
}

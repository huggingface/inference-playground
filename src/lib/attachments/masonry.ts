import type { Attachment } from "svelte/attachments";

function noop() {}

function isHTMLElement(element: ChildNode): element is HTMLElement {
	return element.nodeType === 1;
}

function getStyleInfo(
	el: HTMLElement,
	property: "grid-template-columns" | "grid-template-rows",
	attribute: "gridTemplateColumns" | "gridTemplateRows"
) {
	const inline = el.style[attribute];
	const computedValue = getComputedStyle(el)[attribute];

	// First check inline style
	if (inline) return computedValue;

	// Then check stylesheets
	const isExplicit = (() => {
		for (const sheet of document.styleSheets) {
			let rules;
			try {
				rules = sheet.cssRules;
			} catch {
				continue; // CORS-restricted stylesheet
			}
			if (!rules) continue;

			for (const rule of rules) {
				if (!(rule instanceof CSSStyleRule)) continue;
				if (!el.matches(rule.selectorText)) continue;

				const val = rule.style.getPropertyValue(property);
				if (val) return true;
			}
		}
		return false;
	})();

	if (isExplicit) return computedValue;
	return "masonry";
}

function adjustGridItems(grid: HTMLElement) {
	const items = Array.from(grid.childNodes).filter(isHTMLElement);

	items.forEach(({ style }) => {
		style.removeProperty("margin-top");
		style.removeProperty("margin-left");
	});

	const style = getComputedStyle(grid);
	const columnsRule = style.gridTemplateColumns;
	const columns = columnsRule.split(" ").length;

	const rowsRule = getStyleInfo(grid, "grid-template-rows", "gridTemplateRows");
	const rows = rowsRule.split(" ").length;

	if (rowsRule !== "masonry" && columnsRule !== "masonry") return;

	if (rowsRule === "masonry") {
		if (columns <= 1) return;
		if (items.length <= columns) return;

		const gap = parseFloat(style.rowGap);

		items.slice(columns).forEach((item, index) => {
			const { bottom: prevBottom } = items[index]!.getBoundingClientRect();
			const { top } = item.getBoundingClientRect();

			item.style.setProperty("margin-top", `${prevBottom + gap - top}px`);
		});
	} else {
		if (rows <= 1) return;
		if (items.length <= rows) return;

		const gap = parseFloat(style.columnGap);

		items.slice(rows).forEach((item, index) => {
			const { right: prevRight } = items[index]!.getBoundingClientRect();
			const { left } = item.getBoundingClientRect();

			item.style.setProperty("margin-left", `${prevRight + gap - left}px`);
		});
	}
}

export const masonry: Attachment<HTMLElement> = node => {
	if (!node) return noop;

	const style = getComputedStyle(node);

	// exit if masonry is supported
	if (style.gridTemplateRows === "masonry") return noop;
	if (style.gridTemplateColumns === "masonry") return noop;

	function onFrame() {
		if (node.isConnected) adjustGridItems(node);
		frame = requestAnimationFrame(onFrame);
	}

	let frame = requestAnimationFrame(onFrame);

	return () => {
		cancelAnimationFrame(frame);
	};
};

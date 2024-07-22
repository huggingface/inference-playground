export default {
	arrowParens: "avoid",
	quoteProps: "consistent",
	trailingComma: "es5",
	useTabs: true,
	tabWidth: 2,
	printWidth: 120,
	overrides: [{ files: "*.svelte", options: { parser: "svelte" } }],
	tailwindConfig: "./tailwind.config.ts",
	plugins: [import("prettier-plugin-svelte"), import("prettier-plugin-tailwindcss")],
};

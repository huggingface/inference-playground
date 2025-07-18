import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";
import enforceExt from "./eslint-rules/enforce-extensions.js";
import prettier from "eslint-plugin-prettier/recommended";

export default ts.config(
	js.configs.recommended,
	ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	// Configure svelte
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		// See more details at: https://typescript-eslint.io/packages/parser/
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: [".svelte"], // Add support for additional file extensions, such as .svelte
				parser: ts.parser,
				// Specify a parser for each language, if needed:
				// parser: {
				//   ts: ts.parser,
				//   js: espree,    // Use espree for .js files (add: import espree from 'espree')
				//   typescript: ts.parser
				// },

				// We recommend importing and specifying svelte.config.js.
				// By doing so, some rules in eslint-plugin-svelte will automatically read the configuration and adjust their behavior accordingly.
				// While certain Svelte settings may be statically loaded from svelte.config.js even if you don’t specify it,
				// explicitly specifying it ensures better compatibility and functionality.
				svelteConfig,
				svelteFeatures: {
					experimentalGenerics: true,
				},
			},
		},
	},
	{
		plugins: {
			local: {
				rules: {
					"enforce-ext": enforceExt,
				},
			},
		},
	},
	{
		rules: {
			"require-yield": "off",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unused-expressions": "off",
			// "@typescript-eslint/no-non-null-assertion": "error",

			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
				},
			],

			"object-shorthand": ["error", "always"],
			"svelte/no-at-html-tags": "off",
			"svelte/require-each-key": "off",
			"local/enforce-ext": [
				"error",
				{
					includePaths: ["$lib/"],
					aliases: {
						$lib: "src/lib",
					},
				},
			],
		},
	},
	{
		ignores: [
			"**/*.cjs",
			"**/.DS_Store",
			"**/node_modules",
			"build",
			".svelte-kit",
			"package",
			"**/.env",
			"**/.env.*",
			"!**/.env.example",
			"**/pnpm-lock.yaml",
			"**/package-lock.json",
			"**/yarn.lock",
			"context_length.json",
		],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
);

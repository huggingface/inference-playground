import { defineConfig } from "@playwright/test";

export default defineConfig({
	webServer: {
		command: "npm run build && npm run preview",
		port: 4173,
		timeout: 1000 * 60 * 10,
	},
	testDir: "e2e",
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
	webServer: {
		command: process.env.CI ? "npm run build && npm run preview" : "",
		port: process.env.CI ? 4173 : 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 1000 * 60 * 10,
	},
	testDir: "e2e",
});

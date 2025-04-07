import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import Icons from "unplugin-icons/vite";

export const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
	plugins: [
		UnpluginTypia({
			log: "verbose",
			cache: false,
		}),
		sveltekit(),
		Icons({
			compiler: "svelte",
			autoInstall: true,
		}),
	],
	server: {
		allowedHosts: isDev ? true : undefined,
	},
});

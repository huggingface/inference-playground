import { svelteTesting } from "@testing-library/svelte/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import Icons from "unplugin-icons/vite";

export const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
	plugins: [
		UnpluginTypia({ log: "verbose", cache: false }),
		sveltekit(),
		Icons({ compiler: "svelte", autoInstall: true }),
	],
	server: {
		allowedHosts: isDev ? true : undefined,
		proxy: {
			"/api/sb-image": {
				target:
					"https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=1&pid=0&tags=clair_obscur%3a_expedition_33+sort%3arandom",
				changeOrigin: true,
				rewrite: () => "",
				selfHandleResponse: true,
				configure: proxy => {
					proxy.on("proxyReq", proxyReq => {
						// Set headers to ensure we get uncompressed JSON
						proxyReq.setHeader("Accept", "application/json");
						proxyReq.setHeader("Accept-Encoding", "identity");
						proxyReq.setHeader("User-Agent", "Mozilla/5.0 (compatible; proxy)");
					});

					proxy.on("proxyRes", (proxyRes, req, res) => {
						let body = Buffer.alloc(0);

						proxyRes.on("data", chunk => {
							body = Buffer.concat([body, chunk]);
						});

						proxyRes.on("end", async () => {
							try {
								const bodyString = body.toString("utf8");
								console.log("Safebooru API response:", bodyString);

								const data = JSON.parse(bodyString);
								if (Array.isArray(data) && data.length > 0 && data[0].file_url) {
									// Fetch the actual image
									const imageUrl = data[0].file_url;
									const imageResponse = await fetch(imageUrl);

									if (!imageResponse.ok) {
										throw new Error(`Failed to fetch image: ${imageResponse.status}`);
									}

									// Forward the image response
									res.writeHead(200, {
										"Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
										"Content-Length": imageResponse.headers.get("content-length") || "",
									});

									const imageBuffer = await imageResponse.arrayBuffer();
									res.end(Buffer.from(imageBuffer));
								} else {
									res.writeHead(404, { "Content-Type": "application/json" });
									res.end(JSON.stringify({ error: "No image found" }));
								}
							} catch (error) {
								console.log("Safebooru error:", error);
								res.writeHead(500, { "Content-Type": "application/json" });
								res.end(JSON.stringify({ error: "Failed to fetch image" }));
							}
						});
					});
				},
			},
			"/api/db-image": {
				target: "https://danbooru.donmai.us/posts/random.json?tags=rating:general",
				changeOrigin: true,
				rewrite: () => "",
				selfHandleResponse: true,
				configure: proxy => {
					proxy.on("proxyReq", proxyReq => {
						// Set headers to ensure we get uncompressed JSON
						proxyReq.setHeader("Accept", "application/json");
						proxyReq.setHeader("Accept-Encoding", "identity");
						proxyReq.setHeader("User-Agent", "Mozilla/5.0 (compatible; proxy)");
					});

					proxy.on("proxyRes", (proxyRes, req, res) => {
						let body = Buffer.alloc(0);

						proxyRes.on("data", chunk => {
							body = Buffer.concat([body, chunk]);
						});

						proxyRes.on("end", async () => {
							try {
								const bodyString = body.toString("utf8");
								console.log("Danbooru API response:", bodyString);

								const data = JSON.parse(bodyString);
								if (data && data.file_url) {
									// Fetch the actual image
									const imageUrl = data.file_url;
									const imageResponse = await fetch(imageUrl);

									if (!imageResponse.ok) {
										throw new Error(`Failed to fetch image: ${imageResponse.status}`);
									}

									// Forward the image response
									res.writeHead(200, {
										"Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
										"Content-Length": imageResponse.headers.get("content-length") || "",
									});

									const imageBuffer = await imageResponse.arrayBuffer();
									res.end(Buffer.from(imageBuffer));
								} else {
									res.writeHead(404, { "Content-Type": "application/json" });
									res.end(JSON.stringify({ error: "No image found" }));
								}
							} catch (error) {
								console.log("Danbooru error:", error);
								res.writeHead(500, { "Content-Type": "application/json" });
								res.end(JSON.stringify({ error: "Failed to fetch image" }));
							}
						});
					});
				},
			},
		},
	},
	test: {
		workspace: [
			{
				extends: "./vite.config.ts",
				plugins: [svelteTesting()],
				test: {
					name: "client",
					environment: "browser",
					browser: {
						enabled: true,
						provider: "playwright",
						instances: [
							{
								browser: "chromium",
							},
							{
								browser: "firefox",
							},
						],
					},
					clearMocks: true,
					include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
					exclude: ["src/lib/server/**"],
					setupFiles: ["./vitest-setup-client.ts"],
				},
			},
			{
				extends: "./vite.config.ts",
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.{test,spec}.{js,ts}"],
					exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
				},
			},
		],
	},
});

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const GET: RequestHandler = async ({ fetch }) => {
	try {
		// Fetch from Danbooru API
		const apiResponse = await fetch("https://danbooru.donmai.us/posts/random.json?tags=rating:explicit", {
			headers: {
				"Accept": "application/json",
				"Accept-Encoding": "identity",
				"User-Agent": "Mozilla/5.0 (compatible; proxy)",
			},
		});

		if (!apiResponse.ok) {
			throw new Error(`Danbooru API failed: ${apiResponse.status}`);
		}

		const bodyString = await apiResponse.text();
		console.log("Danbooru API response:", bodyString);

		const data = JSON.parse(bodyString);

		if (data && data.file_url) {
			// Fetch the actual image
			const imageUrl = data.file_url;
			const imageResponse = await fetch(imageUrl);

			if (!imageResponse.ok) {
				throw new Error(`Failed to fetch image: ${imageResponse.status}`);
			}

			const imageBuffer = await imageResponse.arrayBuffer();
			const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

			return new Response(imageBuffer, {
				headers: {
					"Content-Type": contentType,
					"Content-Length": imageBuffer.byteLength.toString(),
				},
			});
		} else {
			return json({ error: "No image found" }, { status: 404 });
		}
	} catch (error) {
		console.log("Danbooru error:", error);
		return json({ error: "Failed to fetch image" }, { status: 500 });
	}
};

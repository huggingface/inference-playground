import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ fetch }) => {
	try {
		// Fetch from Safebooru API
		const apiResponse = await fetch(
			"https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=1&pid=0&tags=clair_obscur%3a_expedition_33+sort%3arandom",
			{
				headers: {
					"Accept": "application/json",
					"Accept-Encoding": "identity",
					"User-Agent": "Mozilla/5.0 (compatible; proxy)",
				},
			}
		);

		if (!apiResponse.ok) {
			throw new Error(`Safebooru API failed: ${apiResponse.status}`);
		}

		const bodyString = await apiResponse.text();
		console.log("Safebooru API response:", bodyString);

		const data = JSON.parse(bodyString);

		if (Array.isArray(data) && data.length > 0 && data[0].file_url) {
			// Fetch the actual image
			const imageUrl = data[0].file_url;
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
		console.log("Safebooru error:", error);
		return json({ error: "Failed to fetch image" }, { status: 500 });
	}
};

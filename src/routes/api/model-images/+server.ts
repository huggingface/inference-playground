import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
	const modelId = url.searchParams.get("modelId");

	if (!modelId) {
		return json({ error: "modelId parameter is required" }, { status: 400 });
	}

	try {
		const hfPage = `https://huggingface.co/${modelId}`;
		const res = await fetch(hfPage, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; InferencePlayground/1.0)",
			},
		});

		if (!res.ok) {
			console.error(`Failed to fetch ${hfPage}:`, res.status, res.statusText);
			return json({ error: `Failed to fetch model page: ${res.status}` }, { status: res.status });
		}

		const html = await res.text();
		const allImages = html.match(/<img[^>]+src="([^"]+)"/g);

		if (!allImages) {
			return json({ images: [] });
		}

		const images = allImages
			.map(img => {
				const match = img.match(/src="([^"]+)"/);
				return match ? match[1] : null;
			})
			.filter((src): src is string => Boolean(src))
			.filter(src => src.startsWith(`/${modelId}/`))
			.map(src => `https://huggingface.co${src}`);

		return json({ images });
	} catch (error) {
		console.error("Error fetching model images:", error);
		return json({ error: "Internal server error" }, { status: 500 });
	}
};

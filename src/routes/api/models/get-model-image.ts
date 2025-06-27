export async function getModelPreviewImage(
	modelId: string,
	fetch: typeof globalThis.fetch
): Promise<string | undefined> {
	try {
		const hfPage = `https://huggingface.co/${modelId}`;
		const res = await fetch(hfPage, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; InferencePlayground/1.0)",
			},
		});

		if (!res.ok) {
			return undefined;
		}

		const html = await res.text();
		const allImages = html.match(/<img[^>]+src="([^"]+)"/g);

		if (!allImages) {
			return undefined;
		}

		const modelImages = allImages
			.map(img => {
				const match = img.match(/src="([^"]+)"/);
				return match ? match[1] : null;
			})
			.filter((src): src is string => Boolean(src))
			.filter(src => src.startsWith(`/${modelId}/`))
			.map(src => `https://huggingface.co${src}`);

		return modelImages[0]; // Return the first image found
	} catch (error) {
		console.error(`Error fetching preview image for ${modelId}:`, error);
		return undefined;
	}
}

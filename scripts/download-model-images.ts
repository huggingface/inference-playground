import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { PipelineTag } from "../src/lib/types.js";

// Manual blacklist of models to skip (add model IDs here)
const MODEL_BLACKLIST: string[] = [
	// Add model IDs you want to skip, e.g.:
	// 'some-org/inappropriate-model',
	// 'another-org/unwanted-model',
	"uriel353/flux-pawg", // it's nsfw
];

function isBlacklisted(modelId: string): boolean {
	return MODEL_BLACKLIST.includes(modelId);
}

async function getModelPreviewImages(modelId: string): Promise<string[]> {
	try {
		const hfPage = `https://huggingface.co/${modelId}`;
		const res = await fetch(hfPage, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; InferencePlayground/1.0)",
			},
		});

		if (!res.ok) {
			console.log(`❌ Failed to fetch ${modelId}: ${res.status}`);
			return [];
		}

		const html = await res.text();
		const allImages = html.match(/<img[^>]+src="([^"]+)"/g);

		if (!allImages) {
			return [];
		}

		const modelImages = allImages
			.map(img => {
				const match = img.match(/src="([^"]+)"/);
				return match ? match[1] : null;
			})
			.filter((src): src is string => Boolean(src))
			.filter(src => {
				// Check if the URL contains the model ID in the path
				return src.includes(`/${modelId}/`) || src.includes(`/${modelId}/resolve/`);
			})
			.map(src => {
				// Convert relative URLs to absolute
				if (src.startsWith("/")) {
					return `https://huggingface.co${src}`;
				}
				return src;
			});
		return modelImages;
	} catch (error) {
		console.error(`❌ Error fetching images for ${modelId}:`, error);
		return [];
	}
}

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.log(`❌ Failed to download ${url}: ${response.status}`);
			return false;
		}

		const buffer = await response.arrayBuffer();
		writeFileSync(outputPath, new Uint8Array(buffer));
		console.log(`✅ Downloaded: ${outputPath}`);
		return true;
	} catch (error) {
		console.error(`❌ Error downloading ${url}:`, error);
		return false;
	}
}

async function getModelsForTag(tag: PipelineTag): Promise<any[]> {
	const requestInit: RequestInit = {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; InferencePlayground/1.0)",
		},
		method: "GET",
	};

	const url = new URL("https://huggingface.co/api/models");
	url.searchParams.append("inference_provider", "all");
	url.searchParams.append("limit", "100");
	url.searchParams.append("pipeline_tag", tag);
	["inferenceProviderMapping", "config", "library_name", "pipeline_tag", "tags", "mask_token", "trendingScore"].forEach(
		s => url.searchParams.append("expand[]", s)
	);

	if ([PipelineTag.TextGeneration, PipelineTag.ImageTextToText].includes(tag)) {
		url.searchParams.append("filter", "conversational");
	}

	const res = await fetch(url, requestInit);

	if (!res.ok) {
		console.error(`Failed to fetch models for ${tag}: ${res.status}`);
		return [];
	}

	return await res.json();
}

function sanitizeFilename(filename: string): string {
	return filename.replace(/[^a-z0-9.-]/gi, "_");
}

async function main() {
	console.log("🚀 Starting model image download...");

	// Create static directory structure
	const staticDir = join(process.cwd(), "static");
	const imagesDir = join(staticDir, "model-images");

	if (!existsSync(staticDir)) {
		mkdirSync(staticDir, { recursive: true });
	}
	if (!existsSync(imagesDir)) {
		mkdirSync(imagesDir, { recursive: true });
	}

	// Visual pipeline tags that need images
	const visualTags = [PipelineTag.TextToImage, PipelineTag.TextToVideo, PipelineTag.ImageTextToText];

	const modelImageMap: Record<string, string> = {};
	let totalDownloaded = 0;

	for (const tag of visualTags) {
		console.log(`\n📋 Processing ${tag} models...`);
		const models = await getModelsForTag(tag);
		console.log(`Found ${models.length} models for ${tag}`);

		// Filter out blacklisted models
		const validModels = models.filter(model => {
			if (isBlacklisted(model.id)) {
				console.log(`🚫 Skipping blacklisted model: ${model.id}`);
				return false;
			}
			return true;
		});

		console.log(`Processing ${validModels.length} valid models...`);

		// Process models in parallel batches of 10
		const BATCH_SIZE = 10;
		for (let i = 0; i < validModels.length; i += BATCH_SIZE) {
			const batch = validModels.slice(i, i + BATCH_SIZE);
			console.log(
				`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validModels.length / BATCH_SIZE)} (${batch.length} models)`
			);

			const batchPromises = batch.map(async model => {
				try {
					console.log(`🔍 Processing ${model.id}...`);
					const imageUrls = await getModelPreviewImages(model.id);

					if (imageUrls.length === 0) {
						console.log(`⚠️  No images found for ${model.id}`);
						return null;
					}

					// Try to download the first image
					const firstImageUrl = imageUrls[0];
					const extension = firstImageUrl.split(".").pop()?.split("?")[0] || "jpg";
					const filename = `${sanitizeFilename(model.id.replace("/", "_"))}.${extension}`;
					const outputPath = join(imagesDir, filename);

					// Skip if already exists
					if (existsSync(outputPath)) {
						console.log(`⏭️  Image already exists: ${filename}`);
						return { modelId: model.id, path: `/model-images/${filename}`, downloaded: false };
					}

					const success = await downloadImage(firstImageUrl, outputPath);
					if (success) {
						return { modelId: model.id, path: `/model-images/${filename}`, downloaded: true };
					}
					return null;
				} catch (error) {
					console.error(`❌ Error processing ${model.id}:`, error);
					return null;
				}
			});

			// Wait for batch to complete
			const results = await Promise.all(batchPromises);

			// Update mapping and count
			results.forEach(result => {
				if (result) {
					modelImageMap[result.modelId] = result.path;
					if (result.downloaded) {
						totalDownloaded++;
					}
				}
			});

			// Small delay between batches to be nice to HuggingFace
			if (i + BATCH_SIZE < validModels.length) {
				console.log(`⏸️  Waiting 2s before next batch...`);
				await new Promise(resolve => setTimeout(resolve, 2000));
			}
		}
	}

	// Save the mapping to a JSON file
	const mappingPath = join(staticDir, "model-image-mapping.json");
	writeFileSync(mappingPath, JSON.stringify(modelImageMap, null, 2));

	console.log(`\n🎉 Download complete!`);
	console.log(`📊 Total images downloaded: ${totalDownloaded}`);
	console.log(`📁 Images saved to: ${imagesDir}`);
	console.log(`🗺️  Mapping saved to: ${mappingPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { main as downloadModelImages };

import dotenv from "dotenv";
dotenv.config(); // Load .env file into process.env

import { fetchAllProviderData, type ApiKeys } from "../src/lib/server/providers.js"; // Import ApiKeys type
import fs from "fs/promises";
import path from "path";

const CACHE_FILE_PATH = path.resolve("src/lib/server/data/max_tokens.json");

async function runUpdate() {
	console.log("Starting max tokens cache update...");

	// Gather API keys from process.env
	const apiKeys: ApiKeys = {
		COHERE_API_KEY: process.env.COHERE_API_KEY,
		TOGETHER_API_KEY: process.env.TOGETHER_API_KEY,
		FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY,
		HYPERBOLIC_API_KEY: process.env.HYPERBOLIC_API_KEY,
		// Add other keys here if needed by fetchAllProviderData
	};

	try {
		// Fetch data from all supported providers concurrently, passing keys
		const fetchedData = await fetchAllProviderData(apiKeys);

		// Read existing manual/cached data
		let existingData = {};
		try {
			const currentCache = await fs.readFile(CACHE_FILE_PATH, "utf-8");
			existingData = JSON.parse(currentCache);
		} catch {
			// Remove unused variable name
			console.log("No existing cache file found or error reading, creating new one.");
		}

		// Merge fetched data with existing data (fetched data takes precedence)
		const combinedData = { ...existingData, ...fetchedData };

		// Write the combined data back to the file
		const tempFilePath = CACHE_FILE_PATH + ".tmp";
		await fs.writeFile(tempFilePath, JSON.stringify(combinedData, null, "\t"), "utf-8");
		await fs.rename(tempFilePath, CACHE_FILE_PATH);

		console.log("Max tokens cache update complete.");
		console.log(`Cache file written to: ${CACHE_FILE_PATH}`);
	} catch (error) {
		console.error("Error during max tokens cache update:", error);
		process.exit(1); // Exit with error code
	}
}

runUpdate();

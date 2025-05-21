export function modifySnippet(snippet: string, newProperties: Record<string, any>): string {
	// Determine language type and specific library
	const isPythonOpenAI = snippet.includes("from openai import OpenAI");
	const isPythonHF = snippet.includes("from huggingface_hub import");
	const isPythonRequests = snippet.includes("import requests");
	const isJavaScript =
		snippet.includes("const") || (snippet.includes("import {") && !snippet.includes("import requests"));
	const isCurl = snippet.includes("curl");

	try {
		// Handle each language type and library differently
		if (isPythonOpenAI || isPythonHF) {
			// For Python with OpenAI or HuggingFace client
			const configRegex = /(completion = client\.chat\.completions\.create\(\s*[\s\S]*?top_p=.*?)(\s*,?\s*\))/;
			const match = snippet.match(configRegex);

			if (match) {
				const formattedProps = Object.entries(newProperties)
					.map(([key, value]) => {
						let valueStr;
						if (typeof value === "string") valueStr = `"${value}"`;
						else if (typeof value === "boolean") valueStr = value ? "True" : "False";
						else valueStr = value;

						return `    ${key}=${valueStr},`;
					})
					.join("\n");

				// Remove trailing comma if present before the closing parenthesis
				const prefix = match[1].replace(/,\s*$/, "");
				return snippet.replace(match[0], `${prefix},\n${formattedProps}\n)`);
			}
		} else if (isPythonRequests) {
			// For Python with requests
			const configRegex = /(response = query\(\{\s*[\s\S]*?"top_p":.*?)(\s*\}\))/;
			const match = snippet.match(configRegex);

			if (match) {
				const formattedProps = Object.entries(newProperties)
					.map(([key, value]) => {
						let valueStr;
						if (typeof value === "string") valueStr = `"${value}"`;
						else if (typeof value === "boolean") valueStr = value ? "True" : "False";
						else valueStr = value;

						return `    "${key}": ${valueStr},`;
					})
					.join("\n");

				// Remove trailing comma if present before the closing brace
				const prefix = match[1].replace(/,\s*$/, "");
				return snippet.replace(match[0], `${prefix},\n${formattedProps}\n})`);
			}
		} else if (isJavaScript) {
			// For JavaScript/TypeScript
			const configObjectRegex = /(client\.chatCompletion\(\{\s*[\s\S]*?top_p:.*?)(\s*\}\))/;
			const match = snippet.match(configObjectRegex);

			if (match) {
				const formattedProps = Object.entries(newProperties)
					.map(([key, value]) => {
						const valueStr = typeof value === "string" ? `"${value}"` : value;
						return `    ${key}: ${valueStr},`;
					})
					.join("\n");

				// Remove trailing comma if present before the closing brace
				const prefix = match[1].replace(/,\s*$/, "");
				return snippet.replace(match[0], `${prefix},\n${formattedProps}\n})`);
			}
		} else if (isCurl) {
			// For curl
			const configRegex = /(curl.*?\{\s*[\s\S]*?"top_p":.*?)(\s*\}\')/;
			const match = snippet.match(configRegex);

			if (match) {
				const formattedProps = Object.entries(newProperties)
					.map(([key, value]) => {
						let valueStr;
						if (typeof value === "string") valueStr = `"${value}"`;
						else valueStr = value;

						return `        "${key}": ${valueStr},`;
					})
					.join("\n");

				// Remove trailing comma if present before the closing brace
				const prefix = match[1].replace(/,\s*$/, "");
				return snippet.replace(match[0], `${prefix},\n${formattedProps}\n    }'`);
			}
		}

		// If we couldn't match with the above patterns, try a more general approach
		// Look for common patterns in the code
		if (isPythonRequests) {
			// Try to find the dictionary in the query function
			const dictMatch = snippet.match(/(query\(\s*\{[\s\S]*?)(\}\s*\))/);
			if (dictMatch) {
				const formattedProps = Object.entries(newProperties)
					.map(([key, value]) => {
						let valueStr;
						if (typeof value === "string") valueStr = `"${value}"`;
						else if (typeof value === "boolean") valueStr = value ? "True" : "False";
						else valueStr = value;

						return `    "${key}": ${valueStr},`;
					})
					.join("\n");

				return snippet.replace(dictMatch[0], `${dictMatch[1]},\n${formattedProps}\n})`);
			}
		}

		// If we still couldn't find a good insertion point, return the original snippet
		console.warn("Could not find appropriate insertion point for new properties");
		return snippet;
	} catch (error) {
		console.error("Error modifying snippet:", error);
		return snippet; // Return original if there's an error
	}
}

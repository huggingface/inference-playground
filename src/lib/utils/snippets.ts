// Helper to format values for JS/JSON
function formatJsJsonValue(value: unknown): string {
	if (typeof value === "string") return `"${value}"`;
	if (value === null) return "null";
	// For booleans and numbers, String(value) works fine for JS/JSON
	return String(value);
}

// Helper to format values for Python
function formatPythonValue(value: unknown): string {
	if (typeof value === "string") return `"${value}"`;
	if (typeof value === "boolean") return value ? "True" : "False";
	if (value === null) return "None";
	return String(value);
}

/**
 * Inserts new properties into a code snippet block (like a JS object or Python dict).
 */
function insertPropertiesInternal(
	snippet: string,
	newProperties: Record<string, unknown>,
	blockStartMarker: RegExp, // Regex to find the character *opening* the block (e.g., '{' or '(')
	openChar: string, // The opening character, e.g., '{' or '('
	closeChar: string, // The closing character, e.g., '}' or ')'
	propFormatter: (key: string, formattedValue: string, indent: string) => string,
	valueFormatter: (value: unknown) => string
): string {
	if (Object.keys(newProperties).length === 0) {
		return snippet;
	}

	const match = snippet.match(blockStartMarker);
	// match.index is the start of the whole marker, e.g. "client.chatCompletionStream("
	// We need the index of the openChar itself.
	if (!match || typeof match.index !== "number") {
		return snippet;
	}

	const openCharIndex = snippet.indexOf(openChar, match.index + match[0].length - 1);
	if (openCharIndex === -1) {
		return snippet;
	}

	let balance = 1;
	let closeCharIndex = -1;
	for (let i = openCharIndex + 1; i < snippet.length; i++) {
		if (snippet[i] === openChar) {
			balance++;
		} else if (snippet[i] === closeChar) {
			balance--;
		}
		if (balance === 0) {
			closeCharIndex = i;
			break;
		}
	}

	if (closeCharIndex === -1) {
		return snippet; // Malformed or not found
	}

	const contentBeforeBlock = snippet.substring(0, openCharIndex + 1);
	const currentContent = snippet.substring(openCharIndex + 1, closeCharIndex);
	const contentAfterBlock = snippet.substring(closeCharIndex);

	// Determine indentation
	let indent = "";
	const lines = currentContent.split("\n");
	if (lines.length > 1) {
		for (const line of lines) {
			const lineIndentMatch = line.match(/^(\s+)\S/);
			if (lineIndentMatch) {
				indent = lineIndentMatch[1];
				break;
			}
		}
	}
	if (!indent) {
		// If no indent found, or content is empty/single line, derive from openChar line
		const lineOfOpenCharStart = snippet.lastIndexOf("\n", openCharIndex) + 1;
		const lineOfOpenChar = snippet.substring(lineOfOpenCharStart, openCharIndex);
		const openCharLineIndentMatch = lineOfOpenChar.match(/^(\s*)/);
		indent = (openCharLineIndentMatch ? openCharLineIndentMatch[1] : "") + "    "; // Default to 4 spaces more
	}

	let newPropsStr = "";
	Object.entries(newProperties).forEach(([key, value]) => {
		newPropsStr += propFormatter(key, valueFormatter(value), indent);
	});

	let existingContentProcessed = currentContent.trimEnd();
	if (existingContentProcessed && !existingContentProcessed.endsWith(",")) {
		existingContentProcessed += ",";
	}

	let combinedContent;
	if (existingContentProcessed) {
		combinedContent = existingContentProcessed + "\n" + newPropsStr;
	} else {
		// If currentContent was empty or just whitespace, new props need to be formatted correctly.
		// Check if openChar was followed by a newline.
		if (currentContent.startsWith("\n") || snippet[openCharIndex + 1] === "\n") {
			combinedContent = newPropsStr; // Indent is already part of newPropsStr
		} else {
			combinedContent = "\n" + newPropsStr; // Add newline if it was like {prop:val} or {}
		}
	}

	// Remove trailing comma from the very end
	combinedContent = combinedContent.replace(/,\s*$/, "");

	// Ensure a newline before the closing character if there's content
	if (combinedContent.trim() && !combinedContent.endsWith("\n")) {
		combinedContent += "\n";
		// Add indent for the closing char line if it wasn't there
		const closingLineIndent = indent.length >= 4 ? indent.substring(0, indent.length - 4) : "";
		combinedContent += closingLineIndent;
	} else if (!combinedContent.trim() && !currentContent.includes("\n")) {
        // Handles empty {} -> {\n}
        combinedContent = "\n";
    }


	return contentBeforeBlock + combinedContent + contentAfterBlock;
}

export function modifySnippet(snippet: string, newProperties: Record<string, unknown>): string {
	if (snippet.includes("client.chatCompletionStream")) {
		// JS/TS
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/client\.chatCompletionStream\s*\(\s*/,
			"{",
			"}",
			(key, value, indent) => `${indent}${key}: ${value},\n`,
			formatJsJsonValue
		);
	} else if (snippet.includes("client.chat.completions.create")) {
		// Python
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/client\.chat\.completions\.create\s*\(/,
			"(",
			")",
			(key, value, indent) => `${indent}${key}=${value},\n`,
			formatPythonValue
		);
	} else if (snippet.includes("curl") && snippet.includes("-d")) {
		// Shell/curl (JSON content)
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/-d\s*'(?:\\n)?\s*/, // Matches up to the opening quote of the JSON string
			"{", // JSON content starts with {
			"}", // JSON content ends with }
			(key, value, indent) => `${indent}"${key}": ${value},\n`,
			formatJsJsonValue
		);
	}
	return snippet;
}

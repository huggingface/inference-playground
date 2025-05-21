const INDENT_STEP = "    "; // 4 spaces for indentation

function stringifyJsJsonRecursive(value: unknown, currentIndent: string): string {
	if (typeof value === "string") return `"${value}"`;
	if (value === null) return "null";
	if (typeof value === "boolean" || typeof value === "number") return String(value);

	if (typeof value === "object" && value !== null) {
		const nextIndent = currentIndent + INDENT_STEP;
		if (Array.isArray(value)) {
			if (value.length === 0) return "[]";
			const items = value.map(v => stringifyJsJsonRecursive(v, nextIndent));
			return "[\n" + items.map(item => nextIndent + item).join(",\n") + "\n" + currentIndent + "]";
		}

		const entries = Object.entries(value);
		if (entries.length === 0) return "{}";
		const properties = entries.map(([k, v]) => `${nextIndent}"${k}": ${stringifyJsJsonRecursive(v, nextIndent)}`);

		return "{\n" + properties.join(",\n") + "\n" + currentIndent + "}";
	}
	return String(value); // Fallback for other types
}

function formatJsJsonValue(value: unknown, baseIndent: string): string {
	return stringifyJsJsonRecursive(value, baseIndent);
}

function stringifyPythonRecursive(value: unknown, currentIndent: string): string {
	if (typeof value === "string") return `"${value}"`;
	if (typeof value === "boolean") return value ? "True" : "False";
	if (value === null) return "None";
	if (typeof value === "number") return String(value);

	if (typeof value === "object" && value !== null) {
		const nextIndent = currentIndent + INDENT_STEP;
		if (Array.isArray(value)) {
			if (value.length === 0) return "[]";
			const items = value.map(v => stringifyPythonRecursive(v, nextIndent));
			return "[\n" + items.map(item => nextIndent + item).join(",\n") + "\n" + currentIndent + "]";
		}

		const entries = Object.entries(value);
		if (entries.length === 0) return "{}";
		// In Python, dictionary keys are typically strings.
		const properties = entries.map(([k, v]) => `${nextIndent}"${k}": ${stringifyPythonRecursive(v, nextIndent)}`);

		return "{\n" + properties.join(",\n") + "\n" + currentIndent + "}";
	}
	return String(value); // Fallback
}

function formatPythonValue(value: unknown, baseIndent: string): string {
	return stringifyPythonRecursive(value, baseIndent);
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
	valueFormatter: (value: unknown, baseIndent: string) => string
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
				indent = lineIndentMatch[1] ?? "";
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
		newPropsStr += propFormatter(key, valueFormatter(value, indent), indent);
	});

	const trimmedOriginalContent = currentContent.trim();
	let combinedContent;

	if (trimmedOriginalContent) {
		// There was actual non-whitespace content.
		// Preserve original currentContent structure as much as possible.
		// Find the end of the textual part of currentContent (before any pure trailing whitespace).
		let endOfTextualPart = currentContent.length;
		while (endOfTextualPart > 0 && /\s/.test(currentContent.charAt(endOfTextualPart - 1))) {
			endOfTextualPart--;
		}
		const textualPartOfCurrentContent = currentContent.substring(0, endOfTextualPart);
		const trailingWhitespaceOfCurrentContent = currentContent.substring(endOfTextualPart);

		let processedTextualPart = textualPartOfCurrentContent;
		if (processedTextualPart && !processedTextualPart.endsWith(",")) {
			processedTextualPart += ",";
		}

		// Add a newline separator if the original trailing whitespace doesn't end with one.
		const separator =
			trailingWhitespaceOfCurrentContent.endsWith("\n") || trailingWhitespaceOfCurrentContent.endsWith("\r")
				? ""
				: "\n";
		combinedContent = processedTextualPart + trailingWhitespaceOfCurrentContent + separator + newPropsStr;
	} else {
		// currentContent was empty or contained only whitespace.
		// Check if the original block opening (e.g., '{' or '(') was immediately followed by a newline.
		const openCharFollowedByNewline =
			snippet[openCharIndex + 1] === "\n" ||
			(snippet[openCharIndex + 1] === "\r" && snippet[openCharIndex + 2] === "\n");
		if (openCharFollowedByNewline) {
			combinedContent = newPropsStr; // newPropsStr already starts with indent
		} else {
			combinedContent = "\n" + newPropsStr; // Add a newline first, then newPropsStr
		}
	}

	// Remove the trailing comma (and its trailing whitespace/newline) from the last property added.
	combinedContent = combinedContent.replace(/,\s*$/, "");

	// Ensure the block content ends with a newline, and the closing character is on its own line, indented.
	if (combinedContent.trim()) {
		// If there's any actual content in the block
		if (!combinedContent.endsWith("\n")) {
			combinedContent += "\n";
		}
		// Determine the base indent for the closing character's line
		const lineOfOpenCharStart = snippet.lastIndexOf("\n", openCharIndex) + 1;
		const openCharLine = snippet.substring(lineOfOpenCharStart, openCharIndex);
		const baseIndentMatch = openCharLine.match(/^(\s*)/);
		const baseIndent = baseIndentMatch ? baseIndentMatch[1] : "";
		combinedContent += baseIndent;
	} else {
		// Block is effectively empty (e.g., was {} and no properties added, or newPropsStr was empty - though current logic prevents this if newProperties is not empty).
		// Format as an empty block with the closing char on a new, indented line.
		const lineOfOpenCharStart = snippet.lastIndexOf("\n", openCharIndex) + 1;
		const openCharLine = snippet.substring(lineOfOpenCharStart, openCharIndex);
		const baseIndentMatch = openCharLine.match(/^(\s*)/);
		const baseIndent = baseIndentMatch ? baseIndentMatch[1] : "";

		const openCharFollowedByNewline =
			snippet[openCharIndex + 1] === "\n" ||
			(snippet[openCharIndex + 1] === "\r" && snippet[openCharIndex + 2] === "\n");
		if (openCharFollowedByNewline) {
			// Original was like {\n}
			combinedContent = baseIndent; // Just the indent for the closing char
		} else {
			// Original was like {}
			combinedContent = "\n" + baseIndent; // Newline, then indent for closing char
		}
	}

	return contentBeforeBlock + combinedContent + contentAfterBlock;
}

export function modifySnippet(snippet: string, newProperties: Record<string, unknown>): string {
	// JS: HuggingFace InferenceClient (streaming)
	if (snippet.includes("client.chatCompletionStream")) {
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/client\.chatCompletionStream\s*\(\s*/, // Finds "client.chatCompletionStream("
			"{", // The parameters are in an object literal
			"}",
			(key, value, indent) => `${indent}${key}: ${value},\n`, // JS object literal style
			formatJsJsonValue
		);
	}
	// JS: HuggingFace InferenceClient (non-streaming)
	else if (snippet.includes("client.chatCompletion") && snippet.includes("InferenceClient")) {
		// Ensure it's not the OpenAI client by also checking for InferenceClient
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/client\.chatCompletion\s*\(\s*/, // Finds "client.chatCompletion("
			"{", // The parameters are in an object literal
			"}",
			(key, value, indent) => `${indent}${key}: ${value},\n`, // JS object literal style
			formatJsJsonValue
		);
	}
	// JS: OpenAI Client
	// Check for client.chat.completions.create and a common JS import pattern
	else if (
		snippet.includes("client.chat.completions.create") &&
		(snippet.includes('import { OpenAI } from "openai"') || snippet.includes("new OpenAI("))
	) {
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/client\.chat\.completions\.create\s*\(\s*/, // Finds "client.chat.completions.create("
			"{", // The parameters are in an object literal
			"}",
			(key, value, indent) => `${indent}${key}: ${value},\n`,
			formatJsJsonValue
		);
	}
	// Python: OpenAI or HuggingFace Client using client.chat.completions.create
	else if (snippet.includes("client.chat.completions.create")) {
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/client\.chat\.completions\.create\s*\(/, // Finds "client.chat.completions.create("
			"(", // The parameters are directly in the function call tuple
			")",
			(key, value, indent) => {
				const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
				return `${indent}${snakeKey}=${value},\n`;
			},
			formatPythonValue
		);
	}
	// Python: requests example with query({...})
	else if (snippet.includes("def query(payload):") && snippet.includes("query({")) {
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/query\s*\(\s*/, // Finds "query(" and expects a dictionary literal next
			"{", // The parameters are in a dictionary literal
			"}",
			// Python dict keys are strings, values formatted for Python
			(key, formattedValue, indent) => `${indent}"${key}": ${formattedValue},\n`,
			formatPythonValue // Use formatPythonValue for the values themselves
		);
	}
	// Shell/curl (JSON content)
	else if (snippet.includes("curl") && snippet.includes("-d")) {
		return insertPropertiesInternal(
			snippet,
			newProperties,
			/-d\s*'(?:\\n)?\s*/,
			"{",
			"}",
			(key, value, indent) => {
				const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
				return `${indent}"${snakeKey}": ${value},\n`;
			},
			formatJsJsonValue
		);
	}
	return snippet;
}

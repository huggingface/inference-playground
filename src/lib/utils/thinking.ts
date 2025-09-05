export interface ParsedMessage {
	thinking: string;
	content: string;
}

/**
 * Parses a message to separate thinking tokens from the main content
 * @param content The raw message content
 * @returns Object with thinking and content separated
 */
export function parseThinkingTokens(content: string): ParsedMessage {
	if (!content) {
		return { thinking: "", content: "" };
	}

	// Match thinking tokens like <think>...</think> or <thinking>...</thinking>
	const thinkingRegex = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
	const matches = Array.from(content.matchAll(thinkingRegex));

	if (matches.length === 0) {
		return { thinking: "", content };
	}

	// Extract all thinking content
	const thinking = matches.map(match => match[1]?.trim() ?? "").join("\n\n");

	// Remove thinking tokens from the main content and clean up extra whitespace
	const cleanContent = content
		.replace(thinkingRegex, "")
		.replace(/\n\s*\n\s*\n/g, "\n\n") // Replace multiple newlines with double newlines
		.trim();

	return { thinking, content: cleanContent };
}

import { describe, it, expect } from "vitest";
import { parseThinkingTokens } from "./thinking.js";

describe("parseThinkingTokens", () => {
	it("should parse thinking tokens correctly", () => {
		const content = `<think>Got it, the user just sent "hi". I need to respond in a friendly way. Let's make it warm and welcoming. Maybe say "Hi there! How can I help you today?" That's a common and helpful response.</think>

Hi there! How can I help you today?`;

		const result = parseThinkingTokens(content);

		expect(result.thinking).toBe(
			`Got it, the user just sent "hi". I need to respond in a friendly way. Let's make it warm and welcoming. Maybe say "Hi there! How can I help you today?" That's a common and helpful response.`,
		);
		expect(result.content).toBe("Hi there! How can I help you today?");
	});

	it("should handle thinking tags", () => {
		const content = `<thinking>This is a thinking section</thinking>

This is the main response.`;

		const result = parseThinkingTokens(content);

		expect(result.thinking).toBe("This is a thinking section");
		expect(result.content).toBe("This is the main response.");
	});

	it("should handle multiple thinking sections", () => {
		const content = `<think>First thought</think>

Some content here.

<think>Second thought</think>

More content.`;

		const result = parseThinkingTokens(content);

		expect(result.thinking).toBe("First thought\n\nSecond thought");
		expect(result.content).toBe("Some content here.\n\nMore content.");
	});

	it("should handle content without thinking tokens", () => {
		const content = "Just regular content here.";

		const result = parseThinkingTokens(content);

		expect(result.thinking).toBe("");
		expect(result.content).toBe("Just regular content here.");
	});

	it("should handle empty content", () => {
		const result = parseThinkingTokens("");

		expect(result.thinking).toBe("");
		expect(result.content).toBe("");
	});
});

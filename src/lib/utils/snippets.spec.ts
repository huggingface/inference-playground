/* eslint-disable no-useless-escape */
import { describe, it, expect } from "vitest";
import { modifySnippet } from "./snippets.js";

type TestCase = {
	snippet: string;
	objToAdd: Record<string, unknown>;
	description: string; // Optional description for the test
};

// JavaScript/TypeScript test cases
const jsTestCases: TestCase[] = [
	{
		description: "JavaScript InferenceClient with chatCompletionStream",
		snippet: `
import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient("YOUR_HF_TOKEN");

let out = "";

const stream = client.chatCompletionStream({
    provider: "cerebras",
    model: "Qwen/Qwen3-32B",
    messages: [
        {
            role: "user",
            content: "What is the capital of Brazil?",
        },
        {
            content: "{\"answer_the_question\": 5, \"how_many_legs_does_a_dog_have\": true, \"answer_the_question_HERE\": \"elderberry\"}",
            role: "assistant",
        },
    ],
    temperature: 0.5,
    top_p: 0.7,
});

for await (const chunk of stream) {
  if (chunk.choices && chunk.choices.length > 0) {
    const newContent = chunk.choices[0].delta.content;
    out += newContent;
    console.log(newContent);
  }
}
`,
		objToAdd: { maxTokens: 100, frequencyPenalty: 0.2 },
	},
	// Add more JavaScript test cases as needed
];

// Python test cases
const pythonTestCases: TestCase[] = [
	{
		description: "Python OpenAI client",
		snippet: `
from openai import OpenAI

client = OpenAI(
    base_url="https://api.cerebras.ai/v1",
    api_key="YOUR_HF_TOKEN",
)

completion = client.chat.completions.create(
    model="qwen-3-32b",
    messages=[
        {
            "role": "user",
            "content": "What is the capital of Brazil?"
        },
        {
            "content": "{\"answer_the_question\": 5, \"how_many_legs_does_a_dog_have\": true, \"answer_the_question_HERE\": \"elderberry\"}",
            "role": "assistant"
        }
    ],
    temperature=0.5,
    top_p=0.7,
)

print(completion.choices[0].message)
`,
		objToAdd: { max_tokens: 100, frequency_penalty: 0.2 },
	},
	// Add more Python test cases as needed
];

// Shell/curl test cases
const shellTestCases: TestCase[] = [
	{
		description: "curl request to Cerebras API",
		snippet: `
curl https://api.cerebras.ai/v1/chat/completions \\
    -H 'Authorization: Bearer YOUR_HF_TOKEN' \\
    -H 'Content-Type: application/json' \\
    -d '{
        "messages": [
            {
                "role": "user",
                "content": "What is the capital of Brazil?"
            },
            {
                "content": "{\"answer_the_question\": 5, \"how_many_legs_does_a_dog_have\": true, \"answer_the_question_HERE\": \"elderberry\"}",
                "role": "assistant"
            }
        ],
        "temperature": 0.5,
        "top_p": 0.7,
        "model": "qwen-3-32b",
        "stream": false
    }'
`,
		objToAdd: { max_tokens: 100, frequency_penalty: 0.2 },
	},
	// Add more shell test cases as needed
];

describe("modifySnippet", () => {
	// Test JavaScript/TypeScript snippets
	describe("JavaScript/TypeScript", () => {
		jsTestCases.forEach((testCase, index) => {
			it(`should add properties to JS snippet #${index + 1}: ${testCase.description}`, () => {
				const result = modifySnippet(testCase.snippet, testCase.objToAdd);

				// Check that all new properties are added with correct JS syntax
				Object.entries(testCase.objToAdd).forEach(([key, value]) => {
					const formattedKey = key.replace(/([A-Z])/g, match => match.toLowerCase()); // Convert camelCase to lowercase for comparison
					const expectedValue = typeof value === "string" ? `"${value}"` : value;

					// Check for either camelCase or snake_case versions of the key
					const camelCasePattern = new RegExp(`${key}:\\s*${expectedValue}`);
					const snakeCasePattern = new RegExp(`${formattedKey}:\\s*${expectedValue}`);

					expect(camelCasePattern.test(result) || snakeCasePattern.test(result)).toBeTruthy();
				});

				// Check that original properties are preserved
				expect(result).toContain("temperature: 0.5");
				expect(result).toContain("top_p: 0.7");

				// Check that the structure is maintained
				expect(result.includes("{") && result.includes("}")).toBeTruthy();
			});
		});
	});

	// Test Python snippets
	describe("Python", () => {
		pythonTestCases.forEach((testCase, index) => {
			it(`should add properties to Python snippet #${index + 1}: ${testCase.description}`, () => {
				const result = modifySnippet(testCase.snippet, testCase.objToAdd);

				// Check that all new properties are added with correct Python syntax
				Object.entries(testCase.objToAdd).forEach(([key, value]) => {
					let expectedValue;
					if (typeof value === "string") expectedValue = `"${value}"`;
					else if (typeof value === "boolean") expectedValue = value ? "True" : "False";
					else expectedValue = value;

					const pattern = new RegExp(`${key}\\s*=\\s*${expectedValue}`);
					expect(pattern.test(result)).toBeTruthy();
				});

				// Check that original properties are preserved
				expect(result).toContain("temperature=0.5");
				expect(result).toContain("top_p=0.7");

				// Check that the structure is maintained
				expect(result.includes("(") && result.includes(")")).toBeTruthy();
			});
		});
	});

	// Test Shell/curl snippets
	describe("Shell/curl", () => {
		shellTestCases.forEach((testCase, index) => {
			it(`should add properties to shell snippet #${index + 1}: ${testCase.description}`, () => {
				const result = modifySnippet(testCase.snippet, testCase.objToAdd);

				// Check that all new properties are added with correct JSON syntax
				Object.entries(testCase.objToAdd).forEach(([key, value]) => {
					const expectedValue = typeof value === "string" ? `"${value}"` : value;
					const pattern = new RegExp(`"${key}":\\s*${expectedValue}`);
					expect(pattern.test(result)).toBeTruthy();
				});

				// Check that original properties are preserved
				expect(result).toContain(`"temperature": 0.5`);
				expect(result).toContain(`"top_p": 0.7`);

				// Check that the structure is maintained
				expect(result.includes("{") && result.includes("}")).toBeTruthy();
			});
		});
	});
});

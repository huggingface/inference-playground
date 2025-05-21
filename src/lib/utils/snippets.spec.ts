/* eslint-disable no-useless-escape */
import { describe, it, expect } from "vitest";
import { modifySnippet } from "./snippets.js";

type TestCase = {
	snippet: string;
	objToAdd: Record<string, unknown>;
	description: string; // Optional description for the test
	pythonSyntax?: "kwargs" | "dict"; // Add this field
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
	{
		description: "JavaScript with OpenAI library",
		snippet: `import { OpenAI } from "openai";

const client = new OpenAI({
	baseURL: "https://api.cerebras.ai/v1",
	apiKey: "YOUR_HF_TOKEN",
});

const stream = await client.chat.completions.create({
    model: "qwen-3-32b",
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
    stream: true,
});

for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`,
		objToAdd: { maxTokens: 100, frequencyPenalty: 0.2 },
	},
];

// Python test cases
const pythonTestCases: TestCase[] = [
	{
		description: "Python HuggingFace client",
		snippet: `from huggingface_hub import InferenceClient

client = InferenceClient(
    provider="cerebras",
    api_key="YOUR_HF_TOKEN",
)

stream = client.chat.completions.create(
    model="Qwen/Qwen3-32B",
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
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content, end="")`,
		objToAdd: { max_tokens: 100, frequency_penalty: 0.2 },
		pythonSyntax: "kwargs", // Add this line
	},
	{
		description: "Python with Requests",
		snippet: `import json
import requests

API_URL = "https://api.cerebras.ai/v1/chat/completions"
headers = {
    "Authorization": "Bearer YOUR_HF_TOKEN",
}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload, stream=True)
    for line in response.iter_lines():
        if not line.startswith(b"data:"):
            continue
        if line.strip() == b"data: [DONE]":
            return
        yield json.loads(line.decode("utf-8").lstrip("data:").rstrip("/n"))

chunks = query({
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
    "stream": True,
})

for chunk in chunks:
    print(chunk["choices"][0]["delta"]["content"], end="")`,
		objToAdd: { max_tokens: 100, frequency_penalty: 0.2 },
		pythonSyntax: "dict", // Add this line
	},
	{
		description: "Python OpenAI client",
		snippet: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.cerebras.ai/v1",
    api_key="YOUR_HF_TOKEN",
)

stream = client.chat.completions.create(
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
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content, end="")`,
		objToAdd: { max_tokens: 100, frequency_penalty: 0.2 },
		pythonSyntax: "kwargs", // Add this line
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
					else expectedValue = String(value); // Ensure value is string for regex

					let pattern;
					if (testCase.pythonSyntax === "dict") {
						pattern = new RegExp(`"${key}"\\s*:\\s*${expectedValue}`);
					} else {
						// Default to kwargs for other Python cases
						pattern = new RegExp(`${key}\\s*=\\s*${expectedValue}`);
					}
					expect(pattern.test(result)).toBeTruthy();
				});

				// Check that original properties are preserved
				if (testCase.pythonSyntax === "dict") {
					expect(result).toContain('"temperature": 0.5');
					expect(result).toContain('"top_p": 0.7');
					// Check that the structure is maintained (dict uses {})
					expect(result.includes("{") && result.includes("}")).toBeTruthy();
				} else {
					expect(result).toContain("temperature=0.5");
					expect(result).toContain("top_p=0.7");
					// Check that the structure is maintained (kwargs uses ())
					expect(result.includes("(") && result.includes(")")).toBeTruthy();
				}
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

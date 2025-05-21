/* eslint-disable no-useless-escape */
import { describe, it, expect } from "vitest";
import { modifySnippet } from "./snippets.js";

// Shared object to add, including various types
const SHARED_OBJ_TO_ADD = {
	maxTokens: 200,
	frequencyPenalty: 0.3,
	presencePenalty: null,
	stopSequences: ["stop1", "stop2"],
	complexObject: {
		nestedKey: "nestedValue",
		nestedNum: 123,
		nestedBool: false,
		nestedArr: ["a", 1, true, null],
	},
	anotherString: "test string",
	isStreaming: true,
};

// Helper to create regex for matching stringified values (JS/JSON and Python)
// This version is updated to handle multi-line, indented ("pretty-printed") structures.
function createValueRegex(value: unknown, language: "js" | "python" | "json"): string {
	// Flexible whitespace: matches any number of spaces, tabs, or newlines.
	const ws = "(?:\\s|\\n)*";

	if (typeof value === "string") {
		return `"${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`; // Escape special regex chars in string
	}
	if (value === null) {
		return language === "python" ? "None" : "null";
	}
	if (typeof value === "boolean") {
		return language === "python" ? (value ? "True" : "False") : String(value);
	}
	if (typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return `\\[${ws}\\]`; // Matches "[]" or "[ \n ]" etc.
		}
		const itemRegexes = value.map(item => createValueRegex(item, language)).join(`${ws},${ws}`);
		return `\\[${ws}${itemRegexes}${ws}\\]`;
	}
	if (typeof value === "object" && value !== null) {
		const entries = Object.entries(value);
		if (entries.length === 0) {
			return `\\{${ws}\\}`; // Matches "{}" or "{ \n }" etc.
		}
		const entriesRegex = entries
			.map(([k, v]) => {
				// In Python kwargs, keys are not quoted. This regex builder is for values that look like JSON/Python dicts.
				// The main test loops handle Python kwarg key formatting separately.
				const keyRegex = `"${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`;
				const valueRegexPart = createValueRegex(v, language);
				return `${keyRegex}${ws}:${ws}${valueRegexPart}`;
			})
			.join(`${ws},${ws}`); // Join key-value pairs with a comma and flexible whitespace
		return `\\{${ws}${entriesRegex}${ws}\\}`;
	}
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Fallback for other primitive types
}

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
		objToAdd: SHARED_OBJ_TO_ADD,
	},
	{
		description: "JavaScript InferenceClient without streaming",
		snippet: `import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient("YOUR_HF_TOKEN");

const chatCompletion = await client.chatCompletion({
    provider: "cohere",
    model: "CohereLabs/c4ai-command-r-plus",
    messages: [
        {
            role: "user",
            content: "hey, how are you???",
        },
        {
            role: "assistant",
            content: "{ \"answer_the_question\": \n\n\n\n            \n           \n\n-1.175\n\n\n\n, \n \"how_many_legs_does_a_dog_have\": \nfalse, \n\n\"answer_the_question_HERE\": \n\n\"A\"\n\n\n}",
        },
    ],
    temperature: 0.5,
    top_p: 0.7,
});

console.log(chatCompletion.choices[0].message);`,
		objToAdd: SHARED_OBJ_TO_ADD,
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
		objToAdd: SHARED_OBJ_TO_ADD,
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
		objToAdd: SHARED_OBJ_TO_ADD, // Use shared object
		pythonSyntax: "kwargs",
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
		objToAdd: SHARED_OBJ_TO_ADD, // Use shared object
		pythonSyntax: "dict",
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
		objToAdd: SHARED_OBJ_TO_ADD, // Use shared object
		pythonSyntax: "kwargs",
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
		objToAdd: SHARED_OBJ_TO_ADD, // Use shared object
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
					// For JS, keys are typically camelCase or as-is from the object.
					// The value needs to be regex-matched due to potential complex structures.
					const valueRegexStr = createValueRegex(value, "js");
					// Regex to match 'key: value' or '"key": value' (for keys that might be quoted if they have special chars, though not in SHARED_OBJ_TO_ADD)
					// Allowing for flexible spacing around colon.
					const propertyPattern = new RegExp(`"${key}"\\s*:\\s*${valueRegexStr}|${key}\\s*:\\s*${valueRegexStr}`);
					expect(result).toMatch(propertyPattern);
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
					const valueRegexStr = createValueRegex(value, "python");
					let propertyPattern;

					if (testCase.pythonSyntax === "dict") {
						// Python dict: "key": value
						propertyPattern = new RegExp(`"${key}"\\s*:\\s*${valueRegexStr}`);
					} else {
						// Python kwargs: key=value
						// Convert camelCase keys from SHARED_OBJ_TO_ADD to snake_case for Python kwargs
						const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
						propertyPattern = new RegExp(`${snakeKey}\\s*=\\s*${valueRegexStr}`);
					}
					expect(result).toMatch(propertyPattern);
				});

				// Check that original properties are preserved
				if (testCase.pythonSyntax === "dict") {
					expect(result).toContain('"temperature": 0.5');
					expect(result).toContain('"top_p": 0.7');
					expect(result.includes("{") && result.includes("}")).toBeTruthy();
				} else {
					// kwargs
					expect(result).toContain("temperature=0.5");
					expect(result).toContain("top_p=0.7");
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
					// For shell/JSON, keys are typically snake_case or as-is.
					// Values need to be regex-matched.
					// Convert camelCase keys from SHARED_OBJ_TO_ADD to snake_case for JSON
					const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
					const valueRegexStr = createValueRegex(value, "json");
					const propertyPattern = new RegExp(`"${snakeKey}"\\s*:\\s*${valueRegexStr}`);
					expect(result).toMatch(propertyPattern);
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

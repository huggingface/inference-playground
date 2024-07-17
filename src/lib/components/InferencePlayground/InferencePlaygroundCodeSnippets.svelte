<script lang="ts">
	import hljs from 'highlight.js/lib/core';
	import javascript from 'highlight.js/lib/languages/javascript';
	import python from 'highlight.js/lib/languages/python';
	import bash from 'highlight.js/lib/languages/bash';
	import type { Conversation } from '$lib/types';

	hljs.registerLanguage('javascript', javascript);
	hljs.registerLanguage('python', python);
	hljs.registerLanguage('bash', bash);

	export let conversation: Conversation;

	const lanuages = ['javascript', 'python', 'bash'];
	type Language = (typeof lanuages)[number];
	const labelsByLanguage: Record<Language, string> = {
		javascript: 'JavaScript',
		python: 'Python',
		bash: 'Curl'
	};

	interface Snippet {
		label: string;
		code: string;
		language?: Language;
	}

	$: snippetsByLanguage = {
		javascript: getJavascriptSnippets(conversation),
		python: getPythonSnippets(conversation),
		bash: getBashSnippets(conversation)
	};

	let selectedLanguage: Language = 'javascript';

	function getMessages() {
		const placeholder = [{ role: 'user', content: 'Tell me a story' }];
		let messages = conversation.messages;
		if (messages.length === 1 && messages[0].role === 'user' && !messages[0].content) {
			messages = placeholder;
		}
		return JSON.stringify(messages, null, 2);
	}

	function highlight(code: string, language: Language) {
		return hljs.highlight(code, { language }).value;
	}

	function getJavascriptSnippets(conversation: Conversation) {
		const messagesStr = getMessages().replace(/"([^"]+)":/g, '$1:');
		const snippets: Snippet[] = [];
		snippets.push({
			label: 'Install @huggingface/inference',
			language: 'bash',
			code: `npm install --save @huggingface/inference
# or
yarn add @huggingface/inference`
		});
		if (conversation.config.streaming) {
			snippets.push({
				label: 'Streaming API',
				code: `import { HfInference } from "@huggingface/inference"

const inference = new HfInference("your HF token")

let out = "";

for await (const chunk of inference.chatCompletionStream({
  model: "${conversation.model.id}",
  messages: ${messagesStr},
  temperature: ${conversation.config.temperature},
  max_tokens: ${conversation.config.maxTokens},
  seed: 0,
})) {
  if (chunk.choices && chunk.choices.length > 0) {
    const newContent = chunk.choices[0].delta.content;
    out += newContent;
	console.clear();
	console.log(out);
  }  
}`
			});
		} else {
			// non-streaming
			snippets.push({
				label: 'Non-Streaming API',
				code: `import { HfInference } from '@huggingface/inference'

const inference = new HfInference("your access token")

const out = await inference.chatCompletion({
    model: "${conversation.model.id}",
    messages: ${messagesStr}, 
    temperature: ${conversation.config.temperature},
    max_tokens: ${conversation.config.maxTokens},
    seed: 0,
});

console.log(out.choices[0].message);`
			});
		}

		return snippets;
	}

	function getPythonSnippets(conversation: Conversation) {
		const messagesStr = getMessages();
		const snippets: Snippet[] = [];
		snippets.push({
			label: 'Install huggingface_hub',
			language: 'bash',
			code: `pip install huggingface_hub`
		});
		if (conversation.config.streaming) {
			snippets.push({
				label: 'Streaming API',
				code: `from huggingface_hub import InferenceClient

model_id="${conversation.model.id}"
hf_token = "your HF token"
inference_client = InferenceClient(model_id, token=hf_token)

output = ""

messages = ${messagesStr}

for token in client.chat_completion(messages, stream=True, temperature=${conversation.config.temperature}, max_tokens=${conversation.config.maxTokens}):
    new_content = token.choices[0].delta.content
    print(new_content, end="")
    output += new_content`
			});
		} else {
			// non-streaming
			snippets.push({
				label: 'Non-Streaming API',
				code: `from huggingface_hub import InferenceClient

model_id="${conversation.model.id}"
hf_token = "your HF token"
inference_client = InferenceClient(model_id, token=hf_token)

messages = ${messagesStr}

output = inference_client.chat_completion(messages, temperature=${conversation.config.temperature}, max_tokens=${conversation.config.maxTokens})

print(output.choices[0].message)`
			});
		}

		return snippets;
	}

	function getBashSnippets(conversation: Conversation) {
		const messagesStr = getMessages();
		const snippets: Snippet[] = [];

		if (conversation.config.streaming) {
			snippets.push({
				label: 'Streaming API',
				code: `curl 'https://api-inference.huggingface.co/models/${conversation.model.id}/v1/chat/completions' \
--header "Authorization: Bearer {YOUR_HF_TOKEN}" \
--header 'Content-Type: application/json' \
--data '{
    "model": "meta-llama/Meta-Llama-3-8B-Instruct",
    "messages": ${messagesStr},
    "temperature": ${conversation.config.temperature},
    "max_tokens": ${conversation.config.maxTokens},
    "stream": true
}'`
			});
		} else {
			// non-streaming
			snippets.push({
				label: 'Non-Streaming API',
				code: `curl 'https://api-inference.huggingface.co/models/${conversation.model.id}/v1/chat/completions' \
--header "Authorization: Bearer {YOUR_HF_TOKEN}" \
--header 'Content-Type: application/json' \
--data '{
    "model": "meta-llama/Meta-Llama-3-8B-Instruct",
    "messages": ${messagesStr},
    "temperature": ${conversation.config.temperature},
    "max_tokens": ${conversation.config.maxTokens}
}'`
			});
		}

		return snippets;
	}
</script>

<div class="px-2 pt-2">
	<div
		class="border-b border-gray-200 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		<ul class="-mb-px flex flex-wrap">
			{#each Object.entries(labelsByLanguage) as [language, label]}
				<li>
					<button
						on:click={() => (selectedLanguage = language)}
						class="inline-block rounded-t-lg border-b-2 p-4 {language === selectedLanguage
							? 'border-black text-black dark:border-blue-500 dark:text-blue-500'
							: 'border-transparent hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300'}"
						aria-current="page">{label}</button
					>
				</li>
			{/each}
		</ul>
	</div>

	{#each snippetsByLanguage[selectedLanguage] as { label, code, language }}
		<div class="px-4 pb-4 pt-6">
			<h2 class="font-semibold">{label}</h2>
		</div>
		<pre
			class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-800/50">{@html highlight(
				code,
				language ?? selectedLanguage
			)}</pre>
	{/each}
</div>

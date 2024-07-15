<script lang="ts">
	import hljs from 'highlight.js/lib/core';
	import javascript from 'highlight.js/lib/languages/javascript';
	import python from 'highlight.js/lib/languages/python';
	import bash from 'highlight.js/lib/languages/bash';
	import type { Conversation } from '$lib/types';

	export let conversation: Conversation;

	type Langauge = 'javascript' | 'python' | 'bash';
	interface Snippet {
		label: string;
		code: string;
	}

	hljs.registerLanguage('javascript', javascript);
	hljs.registerLanguage('python', python);
	hljs.registerLanguage('bash', bash);

	function highlight(code: string, language: Langauge) {
		return hljs.highlight(code, { language }).value;
	}

	function getJavascriptSnippets() {
		const snippets: Snippet[] = [];
		snippets.push({
			label: 'Install',
			code: `import { HfInference } from '@huggingface/inference'

const hf = new HfInference('your access token')`
		});
		if (conversation.config.streaming) {
			snippets.push({
				label: 'Streaming API',
				code: `let out = "";

for await (const chunk of hf.chatCompletionStream({
  model: "${conversation.model}",
  messages: [
    { role: "user", content: "Complete the equation 1+1= ,just the answer" }, 
  ],
  max_tokens: ${conversation.config.maxTokens}, 
  temperature: ${conversation.config.temperature},
  seed: 0,
})) {
  if (chunk.choices && chunk.choices.length > 0) {
    out += chunk.choices[0].delta.content;
  }  
}`
			});
		} else {
			// non-streaming
			snippets.push({
				label: 'Non-Streaming API',
				code: `await hf.chatCompletion({
  model: "${conversation.model}",
  messages: [
    { role: "user", content: "Complete the this sentence with words one plus one is equal " }
  ], 
  max_tokens: ${conversation.config.maxTokens},
  temperature: ${conversation.config.temperature},
  seed: 0,
});`
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
			<li>
				<a
					href="#"
					class="active inline-block rounded-t-lg border-b-2 border-black p-4 text-black dark:border-blue-500 dark:text-blue-500"
					aria-current="page">Huggingface.js</a
				>
			</li>
			<li>
				<a
					href="#"
					class="inline-block rounded-t-lg border-b-2 border-transparent p-4 hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300"
					>Curl</a
				>
			</li>
		</ul>
	</div>

	{#each getJavascriptSnippets() as { label, code }}
		<div class="px-4 pb-4 pt-6">
			<h2 class="font-semibold">{label}</h2>
		</div>
		<pre
			class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-800/50">{@html highlight(
				code,
				'javascript'
			)}</pre>
	{/each}
</div>

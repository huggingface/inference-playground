<script lang="ts">
	import { type ChatCompletionInputMessage } from '@huggingface/tasks';

	export let model: string;
	export let streaming: Boolean;
	export let temperature: number;
	export let maxTokens: number;
	export let messages: ChatCompletionInputMessage[];

	const npmSnippet = `import { HfInference } from '@huggingface/inference'

const hf = new HfInference('your access token')`;

	$: nonStreamingSnippet = `await hf.chatCompletion({
  model: "${model}",
  messages: [
    { role: "user", content: "Complete the this sentence with words one plus one is equal " }
  ], 
  max_tokens: ${maxTokens},
  temperature: ${temperature},
  seed: 0,
});`;

	$: streamingSnippet = `let out = "";

for await (const chunk of hf.chatCompletionStream({
  model: "${model}",
  messages: [
    { role: "user", content: "Complete the equation 1+1= ,just the answer" }, 
  ],
  max_tokens: ${maxTokens}, 
  temperature: ${temperature},
  seed: 0,
})) {
  if (chunk.choices && chunk.choices.length > 0) {
    out += chunk.choices[0].delta.content;
  }  
}`;
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

	<div class="px-4 pb-4 pt-6">
		<h2 class="font-semibold">Install and instantiate</h2>
	</div>
	<pre
		class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-800/50">{npmSnippet}</pre>

	<div class="px-4 pb-4 pt-6">
		<h2 class="font-semibold">{streaming ? 'Streaming API' : 'Non-Streaming API'}</h2>
	</div>

	<pre
		class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-800/50">{streaming
			? streamingSnippet
			: nonStreamingSnippet}
  </pre>
</div>

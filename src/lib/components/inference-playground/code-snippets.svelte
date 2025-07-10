<script lang="ts">
	import { type ConversationClass } from "$lib/state/conversations.svelte";
	import { structuredForbiddenProviders } from "$lib/state/models.svelte";
	import { token } from "$lib/state/token.svelte.js";
	import { isCustomModel } from "$lib/types.js";
	import {
		getInferenceSnippet,
		type GetInferenceSnippetReturn,
		type InferenceSnippetLanguage,
	} from "$lib/utils/business.svelte.js";
	import { copyToClipboard } from "$lib/utils/copy.js";
	import { entries, fromEntries, keys } from "$lib/utils/object.svelte.js";
	import hljs from "highlight.js/lib/core";
	import http from "highlight.js/lib/languages/http";
	import javascript from "highlight.js/lib/languages/javascript";
	import python from "highlight.js/lib/languages/python";
	import IconExternal from "~icons/carbon/arrow-up-right";
	import IconCopy from "~icons/carbon/copy";
	import LocalToasts from "../local-toasts.svelte";

	hljs.registerLanguage("javascript", javascript);
	hljs.registerLanguage("python", python);
	hljs.registerLanguage("http", http);

	interface Props {
		conversation: ConversationClass;
		onCloseCode: () => void;
	}

	const { conversation, onCloseCode }: Props = $props();

	const labelsByLanguage = {
		javascript: "JavaScript",
		python: "Python",
		http: "cURL",
	} as const satisfies Record<string, string>;
	type Language = keyof typeof labelsByLanguage;

	let lang: Language = $state("javascript");
	let showToken = $state(false);

	type GetSnippetArgs = {
		tokenStr: string;
		conversation: ConversationClass;
		lang: InferenceSnippetLanguage;
	};
	function getSnippet({ tokenStr, conversation, lang }: GetSnippetArgs) {
		const model = conversation.model;
		const data = conversation.data;
		const opts = {
			messages: data.messages,
			streaming: data.streaming,
			max_tokens: data.config.max_tokens,
			temperature: data.config.temperature,
			top_p: data.config.top_p,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if (data.structuredOutput && !structuredForbiddenProviders.includes(conversation.data.provider as any)) {
			opts.structured_output = data.structuredOutput;
		}

		if (isCustomModel(model)) {
			const snippets = getInferenceSnippet(conversation, lang, tokenStr, opts);
			return snippets
				.filter(s => s.client.startsWith("open") || lang === "sh")
				.map(s => {
					return {
						...s,
						content: s.content
							.replaceAll("https://router.huggingface.co/hf-inference/v1", model.endpointUrl)
							.replaceAll(`https://router.huggingface.co/hf-inference/models/${model.id}/v1`, model.endpointUrl),
					};
				});
		}

		return getInferenceSnippet(conversation, lang, tokenStr, opts);
	}

	// { javascript: 0, python: 0, http: 0 } at first
	const selectedSnippetIdxByLang: Record<Language, number> = $state(
		fromEntries(
			keys(labelsByLanguage).map(lang => {
				return [lang, 0];
			}),
		),
	);

	type InstallInstructions = {
		title: string;
		content: string;
		docs: string;
	};

	function highlight(code?: string, language?: InferenceSnippetLanguage) {
		if (!code || !language) return "";
		return hljs.highlight(code, { language: language === "sh" ? "http" : language }).value;
	}

	const tokenStr = $derived.by(() => {
		if (isCustomModel(conversation.model)) {
			const t = conversation.model.accessToken;

			return t && showToken ? t : "YOUR_ACCESS_TOKEN";
		}

		return token.value && showToken ? token.value : "YOUR_HF_TOKEN";
	});

	const snippetsByLang = $derived({
		javascript: getSnippet({ lang: "js", tokenStr, conversation }),
		python: getSnippet({ lang: "python", tokenStr, conversation }),
		http: getSnippet({ lang: "sh", tokenStr, conversation }),
	} as Record<Language, GetInferenceSnippetReturn>);

	const selectedSnippet = $derived(snippetsByLang[lang][selectedSnippetIdxByLang[lang]]);

	const installInstructions = $derived.by(function getInstallInstructions(): InstallInstructions | undefined {
		if (lang === "javascript") {
			const isHugging = selectedSnippet?.client.includes("hugging");
			const toInstall = isHugging ? "@huggingface/inference" : "openai";
			const docs = isHugging
				? "https://huggingface.co/docs/huggingface.js/inference/README"
				: "https://platform.openai.com/docs/libraries";
			return {
				title: `Install ${toInstall}`,
				content: `npm install --save ${toInstall}`,
				docs,
			};
		} else if (lang === "python") {
			const isHugging = selectedSnippet?.client.includes("hugging");
			const toInstall = isHugging ? "huggingface_hub" : "openai";
			const docs = isHugging
				? "https://huggingface.co/docs/huggingface_hub/guides/inference"
				: "https://platform.openai.com/docs/libraries";
			return {
				title: `Install the latest`,
				content: `pip install --upgrade ${toInstall}`,
				docs,
			};
		}
	});
</script>

<div class="px-2 pt-2">
	<div
		class="border-b border-gray-200 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		<ul class="-mb-px flex flex-wrap">
			{#each entries(labelsByLanguage).filter(([lang]) => {
				return snippetsByLang[lang]?.length;
			}) as [language, label]}
				<li>
					<button
						onclick={() => (lang = language)}
						class="inline-block rounded-t-lg border-b-2 p-4 {lang === language
							? 'border-black text-black dark:border-blue-500 dark:text-blue-500'
							: 'border-transparent hover:border-gray-300 hover:text-gray-600 dark:hover:text-gray-300'}"
						aria-current="page">{label}</button
					>
				</li>
			{/each}
			<li class="ml-auto self-center max-sm:hidden">
				<button
					onclick={onCloseCode}
					class="flex size-7 items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
				>
					✕
				</button>
			</li>
		</ul>
	</div>

	{#if (snippetsByLang[lang]?.length ?? 0) > 1}
		<div class="flex gap-x-2 px-2 pt-6">
			{#each snippetsByLang[lang] ?? [] as { client }, idx}
				{@const isActive = idx === selectedSnippetIdxByLang[lang]}
				<button
					class="rounded-lg border px-1.5 py-0.5 text-sm leading-tight
					{isActive
						? 'bg-black text-gray-100 dark:border-gray-500 dark:bg-gray-700 dark:text-white'
						: 'text-gray-500 hover:text-gray-600 dark:border-gray-600 dark:hover:text-gray-400'}"
					onclick={() => (selectedSnippetIdxByLang[lang] = idx)}>{client}</button
				>
			{/each}
		</div>
	{/if}

	{#if installInstructions}
		<div class="flex flex-col justify-between gap-2 px-2 pt-6 pb-4 md:flex-row md:items-center">
			<h2 class="flex items-center gap-2 font-semibold">
				{installInstructions.title}
				<a
					href={installInstructions.docs}
					target="_blank"
					class="relative -bottom-[1px] flex items-center gap-1 text-sm font-normal text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
				>
					<IconExternal class="text-xs" />
					Docs
				</a>
			</h2>
			<div class="flex items-center gap-x-4 whitespace-nowrap">
				<LocalToasts>
					{#snippet children({ addToast, trigger })}
						<button
							{...trigger}
							class="btn flex h-auto items-center gap-2 px-2 py-1.5 text-xs"
							onclick={() => {
								copyToClipboard(installInstructions.content);
								addToast({ data: { content: "Copied to clipboard", variant: "info" } });
							}}
						>
							<IconCopy />
							Copy code
						</button>
					{/snippet}
				</LocalToasts>
			</div>
		</div>
		<pre
			class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-xs dark:border-gray-800 dark:bg-gray-800/50">{@html highlight(
				installInstructions.content,
				selectedSnippet?.language,
			)}</pre>
	{/if}

	<div class="flex items-center justify-between px-2 pt-6 pb-4">
		{#if conversation.data.streaming}
			<h2 class="font-semibold">Streaming API</h2>
		{:else}
			<h2 class="font-semibold">Non-Streaming API</h2>
		{/if}
		<div class="flex items-center gap-x-4">
			<label class="flex items-center gap-x-1.5 text-sm select-none">
				<input type="checkbox" bind:checked={showToken} />
				<p class="leading-none">With token</p>
			</label>
			<LocalToasts>
				{#snippet children({ addToast, trigger })}
					<button
						{...trigger}
						class="btn flex h-auto items-center gap-2 px-2 py-1.5 text-xs"
						onclick={() => {
							copyToClipboard(selectedSnippet?.content ?? "");
							addToast({ data: { content: "Copied to clipboard", variant: "info" } });
						}}
					>
						<IconCopy />
						Copy code
					</button>
				{/snippet}
			</LocalToasts>
		</div>
	</div>
	<pre
		class="overflow-x-auto rounded-lg border border-gray-200/80 bg-white px-4 py-6 text-sm shadow-xs dark:border-gray-800 dark:bg-gray-800/50">{@html highlight(
			selectedSnippet?.content,
			selectedSnippet?.language,
		)}</pre>
</div>

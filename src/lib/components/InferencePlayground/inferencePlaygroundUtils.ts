import { type ChatCompletionInputMessage } from '@huggingface/tasks';
import { HfInference } from '@huggingface/inference';
import type { Conversation, ModelEntryWithTokenizer } from '$lib/types';

export function createHfInference(token: string): HfInference {
	return new HfInference(token);
}

export async function handleStreamingResponse(
	hf: HfInference,
	conversation: Conversation,
	onChunk: (content: string) => void,
	abortController: AbortController,
	systemMessage?: ChatCompletionInputMessage
): Promise<void> {
	const messages = [
		...(isSystemPromptSupported(conversation.model) && systemMessage?.content?.length
			? [systemMessage]
			: []),
		...conversation.messages
	];
	let out = '';
	try {
		for await (const chunk of hf.chatCompletionStream(
			{
				model: conversation.model.id,
				messages,
				temperature: conversation.config.temperature,
				max_tokens: conversation.config.maxTokens
			},
			{ signal: abortController.signal }
		)) {
			if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0]?.delta?.content) {
				out += chunk.choices[0].delta.content;
				onChunk(out);
			}
		}
	} catch (error) {
		if (error.name === 'AbortError') {
			console.log('Stream aborted');
		} else {
			throw error;
		}
	}
}

export async function handleNonStreamingResponse(
	hf: HfInference,
	conversation: Conversation,
	systemMessage?: ChatCompletionInputMessage
): Promise<ChatCompletionInputMessage> {
	const messages = [
		...(isSystemPromptSupported(conversation.model) && systemMessage?.content?.length
			? [systemMessage]
			: []),
		...conversation.messages
	];

	const response = await hf.chatCompletion({
		model: conversation.model,
		messages,
		temperature: conversation.config.temperature,
		max_tokens: conversation.config.maxTokens
	});

	if (response.choices && response.choices.length > 0) {
		return response.choices[0].message;
	}
	throw new Error('No response from the model');
}

export function isSystemPromptSupported(model: ModelEntryWithTokenizer) {
	return model.tokenizerConfig?.chat_template?.includes('system');
}

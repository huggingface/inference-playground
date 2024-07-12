import { type ChatCompletionInputMessage } from "@huggingface/tasks";
import { HfInference } from '@huggingface/inference';

export function createHfInference(token: string): HfInference {
	return new HfInference(token);
}

export function prepareRequestMessages(systemMessage: ChatCompletionInputMessage, messages: ChatCompletionInputMessage[]): ChatCompletionInputMessage[] {
	return [...(systemMessage.content.length ? [systemMessage] : []), ...messages];
}

export async function handleStreamingResponse(
	hf: HfInference,
	model: string,
	messages: ChatCompletionInputMessage[],
	temperature: number,
	maxTokens: number,
	jsonMode: boolean,
	onChunk: (content: string) => void,
	abortController: AbortController
): Promise<void> {
	let out = '';
	try {
		for await (const chunk of hf.chatCompletionStream({
			model: model,
			messages: messages,
			temperature: temperature,
			max_tokens: maxTokens,
			json_mode: jsonMode
		}, { signal: abortController.signal })) {
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
	model: string,
	messages: ChatCompletionInputMessage[],
	temperature: number,
	maxTokens: number,
	jsonMode: boolean
): Promise<ChatCompletionInputMessage> {
	const response = await hf.chatCompletion({
		model: model,
		messages: messages,
		temperature: temperature,
		max_tokens: maxTokens,
		json_mode: jsonMode
	});

	if (response.choices && response.choices.length > 0) {
		return response.choices[0].message;
	}
	throw new Error('No response from the model');
}

export interface StreamChunk {
	type: "chunk" | "done" | "error";
	content?: string;
	error?: string;
}

export class StreamReader {
	private decoder = new TextDecoder();
	private buffer = "";

	constructor(private response: Response) {
		if (!response.body) {
			throw new Error("Response has no body");
		}
	}

	async *read(): AsyncGenerator<StreamChunk, void, unknown> {
		const reader = this.response.body!.getReader();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				this.buffer += this.decoder.decode(value, { stream: true });
				const lines = this.buffer.split("\n");
				this.buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6).trim();
						if (!data) continue;

						try {
							const parsed = JSON.parse(data) as StreamChunk;
							yield parsed;
							if (parsed.type === "done") return;
						} catch {
							// Ignore malformed JSON
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	static async fromFetch(url: string, options?: RequestInit): Promise<StreamReader> {
		const response = await fetch(url, options);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Request failed");
		}
		return new StreamReader(response);
	}
}

export class StreamWriter {
	private encoder = new TextEncoder();
	private controller?: ReadableStreamDefaultController<Uint8Array>;
	public readonly stream: ReadableStream<Uint8Array>;

	constructor() {
		this.stream = new ReadableStream({
			start: controller => {
				this.controller = controller;
			},
		});
	}

	write(chunk: StreamChunk): void {
		if (!this.controller) {
			return;
		}

		try {
			const data = JSON.stringify(chunk);
			this.controller.enqueue(this.encoder.encode(`data: ${data}\n\n`));
		} catch {
			// Controller might be closed
		}
	}

	writeChunk(content: string): void {
		this.write({ type: "chunk", content });
	}

	writeError(error: string): void {
		this.write({ type: "error", error });
	}

	end(): void {
		if (!this.controller) return;
		try {
			this.write({ type: "done" });
			this.controller.close();
		} catch {
			// Controller might already be closed
		}
		this.controller = undefined;
	}

	error(error: Error): void {
		if (!this.controller) return;
		try {
			this.writeError(error.message);
			this.controller.close();
		} catch {
			// Controller might already be closed
		}
		this.controller = undefined;
	}

	createResponse(): Response {
		return new Response(this.stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
			},
		});
	}
}

export async function streamFromAsyncIterable<T>(
	iterable: AsyncIterable<T>,
	transform: (item: T) => StreamChunk,
): Promise<ReadableStream<Uint8Array>> {
	const writer = new StreamWriter();

	(async () => {
		try {
			for await (const item of iterable) {
				writer.write(transform(item));
			}
			writer.end();
		} catch (error) {
			writer.error(error instanceof Error ? error : new Error(String(error)));
		}
	})();

	return writer.stream;
}

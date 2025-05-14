type AsyncQueueFunction<T> = () => Promise<T>;

interface QueueItem<T> {
	asyncFunction: AsyncQueueFunction<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
}

export class AsyncQueue<T> {
	queue: QueueItem<T>[] = [];
	private isProcessing = false;

	public add(asyncFunction: AsyncQueueFunction<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push({ asyncFunction, resolve, reject });
			this.processQueue();
		});
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing) {
			return;
		}

		this.isProcessing = true;

		while (this.queue.length > 0) {
			const queueItem = this.queue.shift()!;

			try {
				const { asyncFunction, resolve } = queueItem;
				const result = await asyncFunction();
				resolve(result);
			} catch (error) {
				console.error("Error processing queue item:", error);
				const { reject } = queueItem;
				reject(error);
			}
		}

		this.isProcessing = false;
	}
}

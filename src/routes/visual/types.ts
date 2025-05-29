export interface ImageItem {
	id: string;
	blob?: Blob;
	isLoading: boolean;
	prompt: string;
	model?: string;
	provider?: string;
	generationTimeMs?: number;
	startTime?: number;
}

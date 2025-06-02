export interface VisualItem {
	type: "video" | "image";
	id: string;
	blob?: Blob;
	isLoading: boolean;
	prompt: string;
	model?: string;
	provider?: string;
	generationTimeMs?: number;
	startTime?: number;
}

export interface ImageItem extends VisualItem {
	type: "image";
}

export interface VideoItem extends VisualItem {
	type: "video";
}
